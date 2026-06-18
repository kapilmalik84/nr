#!/usr/bin/env python3
"""
Re-host newsroom.auspost.com.au/uploads/ images into DA (admin.da.live).
Images are served via the AEM page CDN at the same path regardless of whether
they are stored in GitHub or DA — DA is the correct content-management home.

Two-phase operation:
  Phase 1 (--upload-da):  Download each image from the source site and upload
                           it to DA at /assets/images/{path}.  A local cache
                           in assets/images/ avoids re-downloading on retry.

  Phase 2 (--update-da):  Rewrite all DA article HTML to use the CDN URLs,
                           then preview + live each article.
                           Run after Phase 1 completes.

Usage:
  python3 rehost_images.py --upload-da               # Phase 1
  python3 rehost_images.py --update-da               # Phase 2
  python3 rehost_images.py --upload-da --update-da   # Both phases
  python3 rehost_images.py --dry-run --upload-da     # Show what would happen
"""

import argparse
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

# ── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
CACHE_DIR = REPO_ROOT / "assets" / "images"   # local download cache (not committed)
LOG_FILE = SCRIPT_DIR / "migration-log.jsonl"
TOKEN_FILE = REPO_ROOT / ".hlx" / ".da-token.json"

SOURCE_HOST = "newsroom.auspost.com.au"
CDN_BASE = "https://main--nr--kapilmalik84.aem.page"
DA_BASE = "https://admin.da.live"
HLX_BASE = "https://admin.hlx.page"
ORG, SITE = "kapilmalik84", "nr"

UPLOADS_SECTION_MAP = {
    "news": "news",
    "philatelic": "stamps",
    "commemorative": "stamps",
    "stamps": "stamps",
    "video": "video",
    "videos": "video",
    "corporate": "news",
    "defaults": "defaults",
}


# ── Path helpers ──────────────────────────────────────────────────────────────

def compute_image_path(source_url: str) -> str | None:
    """Map a newsroom.auspost.com.au/uploads/ URL to /assets/images/{relative}."""
    parsed = urlparse(source_url)
    if parsed.hostname != SOURCE_HOST:
        return None
    path = parsed.path.lstrip("/")
    if not path.startswith("uploads/"):
        return None
    path = path[len("uploads/"):]
    parts = [p for p in path.split("/") if p]
    if not parts:
        return None

    top = parts[0].lower()
    section = UPLOADS_SECTION_MAP.get(top, "general")

    if section == "defaults":
        return f"defaults/{_normalise_filename(parts[-1])}"

    year = story = None
    for i, part in enumerate(parts[1:], 1):
        if re.match(r"20\d\d$", part):
            year = part
            if i + 1 < len(parts) and i + 1 < len(parts) - 1:
                raw = parts[i + 1]
                if not re.match(r"(low|hi(gh)?|med(ium)?)res", raw, re.I):
                    story = _normalise_slug(raw)
            break

    filename = _normalise_filename(parts[-1])
    if year and story:
        return f"{section}/{year}/{story}/{filename}"
    elif year:
        return f"{section}/{year}/{filename}"
    return f"{section}/{filename}"


def _normalise_slug(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\-]", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def _normalise_filename(s: str) -> str:
    name, _, ext = s.rpartition(".")
    name = re.sub(r"[_\s]+", "-", name.lower())
    name = re.sub(r"[^a-z0-9\-]", "-", name)
    name = re.sub(r"-+", "-", name).strip("-")
    return f"{name}.{ext.lower()}" if ext else name


def cdn_url(relative_path: str) -> str:
    return f"{CDN_BASE}/assets/images/{relative_path}"


def da_asset_url(relative_path: str) -> str:
    return f"{DA_BASE}/source/{ORG}/{SITE}/assets/images/{relative_path}"


# ── Token ─────────────────────────────────────────────────────────────────────

def get_token() -> str:
    data = json.load(open(TOKEN_FILE))
    expires_at = data.get("expires_at") or data.get("exp")
    if expires_at and time.time() > float(expires_at) - 60:
        sys.exit("ERROR: DA token expired. Re-authenticate and update .da-token.json.")
    return data["access_token"]


# ── Scan DA articles for uploads/ image references ────────────────────────────

def collect_all_image_urls(token: str) -> dict[str, list[str]]:
    """Return {da_path: [uploads_url, ...]} for articles with uploads/ images."""
    auth = {"Authorization": f"Bearer {token}"}
    paths = []
    seen = set()
    with open(LOG_FILE) as f:
        for line in f:
            try:
                r = json.loads(line.strip())
                p = r.get("da_path")
                if r.get("status") == "pushed" and p and p not in seen:
                    seen.add(p)
                    paths.append(p)
            except Exception:
                pass

    print(f"Scanning {len(paths)} DA articles for uploads/ images…")
    result: dict[str, list[str]] = {}
    for i, path in enumerate(paths):
        r = requests.get(
            f"{DA_BASE}/source/{ORG}/{SITE}{path}.html",
            headers=auth, timeout=15,
        )
        if r.status_code != 200 or not r.text.strip():
            continue
        urls = re.findall(
            rf'src="(https://{re.escape(SOURCE_HOST)}/uploads/[^"]+)"',
            r.text,
        )
        if urls:
            result[path] = list(dict.fromkeys(urls))
        if (i + 1) % 50 == 0:
            print(f"  … {i + 1}/{len(paths)} scanned, {len(result)} with images")
        time.sleep(0.15)

    return result


# ── Phase 1: Upload images to DA ──────────────────────────────────────────────

def _is_in_da(relative_path: str, session: requests.Session) -> bool:
    """Quick CDN HEAD check to skip already-uploaded images."""
    try:
        r = session.head(cdn_url(relative_path), timeout=10, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def upload_images_to_da(
    url_map: dict[str, list[str]],
    token: str,
    dry_run: bool,
) -> dict[str, str]:
    """
    For each unique uploads/ URL, fetch the image and PUT it to DA.
    Uses assets/images/ as a local cache to avoid re-downloading on retry.
    Returns {source_url: relative_path} for every successfully uploaded image.
    """
    all_urls: set[str] = set()
    for urls in url_map.values():
        all_urls.update(urls)

    print(f"\nUnique images to upload: {len(all_urls)}")

    auth_headers = {"Authorization": f"Bearer {token}"}
    source_session = requests.Session()
    source_session.headers["User-Agent"] = "Mozilla/5.0 (AusPost Newsroom migration)"
    da_session = requests.Session()

    uploaded: dict[str, str] = {}
    skipped = failed = 0

    for url in sorted(all_urls):
        relative = compute_image_path(url)
        if not relative:
            print(f"  SKIP (no mapping): {url}")
            skipped += 1
            continue

        if dry_run:
            print(f"  DRY-RUN  {url}")
            print(f"       →  DA: /assets/images/{relative}")
            uploaded[url] = relative
            continue

        # Check DA CDN — skip if already there
        if _is_in_da(relative, da_session):
            uploaded[url] = relative
            skipped += 1
            continue

        # Use local cache if available, otherwise download
        cache_path = CACHE_DIR / relative
        if cache_path.exists():
            image_bytes = cache_path.read_bytes()
            mime = mimetypes.guess_type(str(cache_path))[0] or "image/jpeg"
        else:
            try:
                r = source_session.get(url, timeout=30, stream=True)
                if r.status_code != 200:
                    print(f"  FETCH FAIL {r.status_code}  {url}", file=sys.stderr)
                    failed += 1
                    continue
                image_bytes = r.content
                mime = r.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
                # Cache locally
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_bytes(image_bytes)
            except Exception as e:
                print(f"  FETCH ERROR  {url}: {e}", file=sys.stderr)
                failed += 1
                continue
            time.sleep(0.15)

        # Upload to DA
        try:
            resp = da_session.put(
                da_asset_url(relative),
                data=image_bytes,
                headers={**auth_headers, "Content-Type": mime},
                timeout=60,
            )
            if resp.status_code in (200, 201):
                size_kb = len(image_bytes) // 1024
                print(f"  OK  ({size_kb}KB)  /assets/images/{relative}")
                uploaded[url] = relative
            else:
                print(f"  DA FAIL {resp.status_code}  {relative}", file=sys.stderr)
                failed += 1
        except Exception as e:
            print(f"  DA ERROR  {relative}: {e}", file=sys.stderr)
            failed += 1
        time.sleep(0.2)

    print(f"\nUpload complete: {len(uploaded)} uploaded/skipped, {skipped} already in DA, {failed} failed")
    return uploaded


# ── Phase 2: Rewrite DA HTML ──────────────────────────────────────────────────

def update_da_articles(
    url_map: dict[str, list[str]],
    url_to_path: dict[str, str],
    token: str,
    dry_run: bool,
):
    """Rewrite uploads/ URLs in DA HTML to CDN URLs, then preview + live."""
    auth = {"Authorization": f"Bearer {token}"}
    put_headers = {**auth, "Content-Type": "text/html"}

    ok = skip = fail = 0
    for da_path, urls in url_map.items():
        mappable = {u: url_to_path[u] for u in urls if u in url_to_path}
        if not mappable:
            skip += 1
            continue

        r = requests.get(
            f"{DA_BASE}/source/{ORG}/{SITE}{da_path}.html",
            headers=auth, timeout=20,
        )
        if r.status_code != 200 or not r.text.strip():
            print(f"  FETCH FAIL {r.status_code}  {da_path}", file=sys.stderr)
            fail += 1
            continue

        html = r.text
        changed = False
        for source_url, relative in mappable.items():
            new_url = cdn_url(relative)
            if source_url in html:
                html = html.replace(source_url, new_url)
                changed = True

        if not changed:
            skip += 1
            continue

        if dry_run:
            print(f"  DRY-RUN  {da_path} ({len(mappable)} URLs rewritten)")
            ok += 1
            continue

        push = requests.put(
            f"{DA_BASE}/source/{ORG}/{SITE}{da_path}.html",
            data=html.encode(), headers=put_headers, timeout=30,
        ).status_code
        pv = requests.post(
            f"{HLX_BASE}/preview/{ORG}/{SITE}/main{da_path}",
            headers=auth, timeout=30,
        ).status_code
        lv = requests.post(
            f"{HLX_BASE}/live/{ORG}/{SITE}/main{da_path}",
            headers=auth, timeout=30,
        ).status_code

        status = "OK" if push in (200, 201) and pv == 200 else "WARN"
        print(f"  {status}  push:{push} pv:{pv} lv:{lv}  {da_path}")
        if push in (200, 201) and pv == 200:
            ok += 1
        else:
            fail += 1
        time.sleep(0.4)

    print(f"\nDA update complete: {ok} updated, {skip} skipped, {fail} failed")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--upload-da", action="store_true", help="Phase 1: upload images to DA")
    ap.add_argument("--update-da", action="store_true", help="Phase 2: rewrite DA HTML + preview/live")
    ap.add_argument("--dry-run", action="store_true", help="Show what would happen without writing")
    args = ap.parse_args()

    if not args.upload_da and not args.update_da:
        ap.print_help()
        sys.exit(1)

    token = get_token()
    url_map = collect_all_image_urls(token)
    total = sum(len(v) for v in url_map.values())
    unique = len({u for urls in url_map.values() for u in urls})
    print(f"\nFound {total} image references ({unique} unique) across {len(url_map)} articles")

    url_to_path: dict[str, str] = {}

    if args.upload_da:
        print("\n── Phase 1: Uploading images to DA ─────────────────────")
        url_to_path = upload_images_to_da(url_map, token, args.dry_run)
    else:
        # Phase 2 only — reconstruct url_to_path from local cache
        for urls in url_map.values():
            for url in urls:
                relative = compute_image_path(url)
                if relative and (CACHE_DIR / relative).exists():
                    url_to_path[url] = relative
        print(f"\n{len(url_to_path)} images found in local cache")

    if args.update_da:
        if not url_to_path:
            print("No uploaded images found. Run --upload-da first.")
            sys.exit(1)
        print("\n── Phase 2: Updating DA articles ────────────────────────")
        update_da_articles(url_map, url_to_path, token, args.dry_run)


if __name__ == "__main__":
    main()
