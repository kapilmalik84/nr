#!/usr/bin/env python3
"""
Re-host newsroom.auspost.com.au/uploads/ images into the GitHub /assets/images/ tree.

Two-phase operation:
  Phase 1 (--download):  Download all images from source site, save to local repo.
                          After this, commit and push the repo to GitHub so the CDN
                          serves them at main--nr--kapilmalik84.aem.page/assets/images/...

  Phase 2 (--update-da): Rewrite all DA article HTML to use the new CDN URLs,
                          then preview + live each article.
                          Run this AFTER the GitHub push has propagated (wait ~2 min).

Usage:
  python3 rehost_images.py --download               # Phase 1
  python3 rehost_images.py --update-da              # Phase 2
  python3 rehost_images.py --download --update-da   # Both phases (risky — CDN may not have propagated)
  python3 rehost_images.py --dry-run                # Show what would happen, no writes
"""

import argparse
import json
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
ASSETS_DIR = REPO_ROOT / "assets" / "images"
LOG_FILE = SCRIPT_DIR / "migration-log.jsonl"
TOKEN_FILE = REPO_ROOT / ".hlx" / ".da-token.json"

SOURCE_HOST = "newsroom.auspost.com.au"
CDN_BASE = "https://main--nr--kapilmalik84.aem.page"
ORG, SITE = "kapilmalik84", "nr"

# Maps uploads/ top-level folder to local /assets/images/ subfolder
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


# ── Path computation ──────────────────────────────────────────────────────────

def compute_image_path(source_url: str) -> str | None:
    """
    Map a newsroom.auspost.com.au/uploads/ URL to a logical /assets/images/ relative path.

    Pattern:
      /uploads/News/{year}/{yyyymmdd-story}/[lowres|highres/]{filename}
      → news/{year}/{yyyymmdd-story}/{filename-normalised}

      /uploads/Philatelic/{year}/{yyyymmdd-story}/.../{filename}
      → stamps/{year}/{yyyymmdd-story}/{filename-normalised}

      /uploads/defaults/{filename}
      → defaults/{filename-normalised}
    """
    parsed = urlparse(source_url)
    if parsed.hostname != SOURCE_HOST:
        return None

    # Strip leading /uploads/
    path = parsed.path.lstrip("/")
    if not path.startswith("uploads/"):
        return None
    path = path[len("uploads/"):]

    parts = [p for p in path.split("/") if p]
    if not parts:
        return None

    top = parts[0].lower()
    section = UPLOADS_SECTION_MAP.get(top)
    if section is None:
        # Unknown category — put in general/
        section = "general"

    if section == "defaults":
        filename = _normalise_filename(parts[-1])
        return f"defaults/{filename}"

    # Expected: section_folder / year / story-folder / [lowres|highres /] filename
    # Strip the intermediate lowres / highres / resolution sub-directories
    year = None
    story = None
    filename = parts[-1]

    for i, part in enumerate(parts[1:], 1):
        if re.match(r"20\d\d$", part):
            year = part
            # Story folder is the next component after year (if present and not the filename)
            if i + 1 < len(parts) and i + 1 < len(parts) - 1:
                raw_story = parts[i + 1]
                # Skip resolution sub-dirs like "lowres", "highres", "hires"
                if not re.match(r"(low|hi(gh)?|med(ium)?)res", raw_story, re.I):
                    story = _normalise_slug(raw_story)
            break

    filename = _normalise_filename(filename)

    if year and story:
        return f"{section}/{year}/{story}/{filename}"
    elif year:
        return f"{section}/{year}/{filename}"
    else:
        return f"{section}/{filename}"


def _normalise_slug(s: str) -> str:
    """Lowercase, replace non-alphanumeric (except hyphens) with hyphens, collapse runs."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9\-]", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def _normalise_filename(s: str) -> str:
    """Lowercase filename, underscores to hyphens, collapse runs."""
    name, _, ext = s.rpartition(".")
    name = name.lower()
    name = re.sub(r"[_\s]+", "-", name)
    name = re.sub(r"[^a-z0-9\-]", "-", name)
    name = re.sub(r"-+", "-", name).strip("-")
    return f"{name}.{ext.lower()}" if ext else name


def cdn_url(local_path: str) -> str:
    """Return the CDN URL for a /assets/images/ relative path."""
    return f"{CDN_BASE}/assets/images/{local_path}"


# ── Token ─────────────────────────────────────────────────────────────────────

def get_token():
    data = json.load(open(TOKEN_FILE))
    expires_at = data.get("expires_at") or data.get("exp")
    if expires_at and time.time() > float(expires_at) - 60:
        sys.exit("ERROR: DA token expired. Re-authenticate and update .da-token.json.")
    return data["access_token"]


# ── Phase 1: Download images ──────────────────────────────────────────────────

def collect_all_image_urls(token: str) -> dict[str, list[str]]:
    """
    Return {da_path: [uploads_url, ...]} for all pushed articles that contain
    newsroom.auspost.com.au/uploads/ image references.
    """
    auth = {"Authorization": f"Bearer {token}"}
    # Get unique da_paths from log
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
            f"https://admin.da.live/source/{ORG}/{SITE}{path}.html",
            headers=auth, timeout=15,
        )
        if r.status_code != 200 or not r.text.strip():
            continue
        urls = re.findall(
            rf'src="(https://{re.escape(SOURCE_HOST)}/uploads/[^"]+)"',
            r.text,
        )
        if urls:
            result[path] = list(dict.fromkeys(urls))  # deduplicate, preserve order
        if (i + 1) % 50 == 0:
            print(f"  … {i + 1}/{len(paths)} scanned, {len(result)} with images")
        time.sleep(0.15)

    return result


def download_images(url_map: dict[str, list[str]], dry_run: bool) -> dict[str, str]:
    """
    Download all unique source URLs. Returns {source_url: local_relative_path}.
    Skips images that are already present in the repo.
    """
    # Flatten to unique URLs
    all_urls: set[str] = set()
    for urls in url_map.values():
        all_urls.update(urls)

    print(f"\nUnique images to download: {len(all_urls)}")

    downloaded: dict[str, str] = {}
    skipped = failed = 0
    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (AusPost Newsroom migration)"

    for url in sorted(all_urls):
        local_path = compute_image_path(url)
        if not local_path:
            print(f"  SKIP (no mapping): {url}")
            skipped += 1
            continue

        dest = ASSETS_DIR / local_path
        if dest.exists():
            downloaded[url] = local_path
            skipped += 1
            continue

        if dry_run:
            print(f"  DRY-RUN  {url}")
            print(f"       →  assets/images/{local_path}")
            downloaded[url] = local_path
            continue

        try:
            r = session.get(url, timeout=30, stream=True)
            if r.status_code == 200:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                size_kb = dest.stat().st_size // 1024
                print(f"  OK  ({size_kb}KB)  assets/images/{local_path}")
                downloaded[url] = local_path
            else:
                print(f"  FAIL {r.status_code}  {url}", file=sys.stderr)
                failed += 1
        except Exception as e:
            print(f"  ERROR  {url}: {e}", file=sys.stderr)
            failed += 1
        time.sleep(0.2)

    print(f"\nDownload complete: {len(downloaded)} ready, {skipped} already existed, {failed} failed")
    return downloaded


# ── Phase 2: Update DA content ────────────────────────────────────────────────

def update_da_articles(
    url_map: dict[str, list[str]],
    url_to_path: dict[str, str],
    token: str,
    dry_run: bool,
):
    """
    For each article with uploads/ images, rewrite URLs in DA source HTML
    to use the CDN path, then preview + live.
    """
    auth = {"Authorization": f"Bearer {token}"}
    put_headers = {**auth, "Content-Type": "text/html"}

    ok = skip = fail = 0
    for da_path, urls in url_map.items():
        # Check all source URLs for this article have been downloaded
        mappable = {u: url_to_path[u] for u in urls if u in url_to_path}
        if not mappable:
            skip += 1
            continue

        # Fetch current DA HTML
        r = requests.get(
            f"https://admin.da.live/source/{ORG}/{SITE}{da_path}.html",
            headers=auth, timeout=20,
        )
        if r.status_code != 200 or not r.text.strip():
            print(f"  FETCH FAIL {r.status_code}  {da_path}", file=sys.stderr)
            fail += 1
            continue

        html = r.text
        changed = False
        for source_url, local_path in mappable.items():
            new_url = cdn_url(local_path)
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
            f"https://admin.da.live/source/{ORG}/{SITE}{da_path}.html",
            data=html.encode(), headers=put_headers, timeout=30,
        ).status_code
        pv = requests.post(
            f"https://admin.hlx.page/preview/{ORG}/{SITE}/main{da_path}",
            headers=auth, timeout=30,
        ).status_code
        lv = requests.post(
            f"https://admin.hlx.page/live/{ORG}/{SITE}/main{da_path}",
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
    ap.add_argument("--download", action="store_true", help="Phase 1: download images to repo")
    ap.add_argument("--update-da", action="store_true", help="Phase 2: rewrite DA HTML + preview")
    ap.add_argument("--dry-run", action="store_true", help="Show what would happen without writing")
    args = ap.parse_args()

    if not args.download and not args.update_da:
        ap.print_help()
        sys.exit(1)

    token = get_token()

    # Scan DA content for all uploads/ references
    url_map = collect_all_image_urls(token)
    total_images = sum(len(v) for v in url_map.values())
    unique_images = len({u for urls in url_map.values() for u in urls})
    print(f"\nFound {total_images} image references ({unique_images} unique) across {len(url_map)} articles")

    # Show path mapping examples
    print("\nExample path mappings:")
    shown = set()
    for urls in url_map.values():
        for url in urls:
            if url not in shown:
                local = compute_image_path(url)
                if local:
                    print(f"  {url}")
                    print(f"  → /assets/images/{local}")
                    shown.add(url)
            if len(shown) >= 6:
                break
        if len(shown) >= 6:
            break

    url_to_path: dict[str, str] = {}

    if args.download:
        print("\n── Phase 1: Downloading images ──────────────────────────")
        url_to_path = download_images(url_map, args.dry_run)

        if not args.dry_run:
            print("\n── Next step ────────────────────────────────────────────")
            print("Commit and push the downloaded images to GitHub:")
            print("  cd /mnt/c/Users/Kapil/projects/newsroom")
            print("  git add assets/images/")
            print('  git commit -m "chore: re-host article images from newsroom.auspost.com.au"')
            print("  git push")
            print("\nWait ~2 minutes for CDN to propagate, then run Phase 2:")
            print("  python3 rehost_images.py --update-da")
    else:
        # Phase 2 without Phase 1 — build url_to_path from what's already on disk
        all_urls: set[str] = set()
        for urls in url_map.values():
            all_urls.update(urls)
        for url in all_urls:
            local = compute_image_path(url)
            if local and (ASSETS_DIR / local).exists():
                url_to_path[url] = local
        print(f"\n{len(url_to_path)} images found in local repo (already downloaded)")

    if args.update_da:
        print("\n── Phase 2: Updating DA articles ────────────────────────")
        if not url_to_path:
            print("No downloaded images found. Run --download first.")
            sys.exit(1)
        update_da_articles(url_map, url_to_path, token or "", args.dry_run)


if __name__ == "__main__":
    main()
