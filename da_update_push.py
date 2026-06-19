#!/usr/bin/env python3
"""
da_update_push.py — Update listing page structure and push all content to DA.

Phase 1 — UPDATE
  Transforms section/archive listing index pages to use the listing-intro
  section structure:  h1 + description in section 1 (with section-metadata
  style=listing-intro), article-list block alone in section 2.

Phase 2 — PUSH
  Pushes every content/*.html file to DA via the Admin API (parallel, 10 workers).

Phase 3 — PREVIEW
  Triggers CDN preview for every pushed page.

Usage:
  python da_update_push.py              # all three phases
  python da_update_push.py --dry-run    # show what Phase 1 would change; no writes
  python da_update_push.py --push-only  # skip Phase 1, just push + preview
  python da_update_push.py --update-only  # Phase 1 only; no push/preview
"""

import argparse
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────
ORG          = "kapilmalik84"
SITE         = "nr"
CONTENT_DIR  = Path(__file__).parent / "content"
TOKEN_FILE   = Path(__file__).parent / ".hlx" / ".da-token.json"
DA_BASE      = f"https://admin.da.live/source/{ORG}/{SITE}"
HLX_PREVIEW  = f"https://admin.hlx.page/preview/{ORG}/{SITE}/main"
MAX_WORKERS  = 10
PREVIEW_DELAY = 0.05  # seconds between preview requests

SECTION_META_HTML = (
    '<div class="section-metadata">'
    '<div><div>style</div><div>listing-intro</div></div>'
    '</div>'
)

# Maps content-relative path → intro description (None = keep existing <p>)
LISTING_PAGES = {
    "section/news/index.html": (
        "The latest news, media releases and announcements from Australia Post."
    ),
    "section/news/general/index.html": (
        "General news and updates from Australia Post."
    ),
    "section/news/executives/index.html": (
        "Speeches, commentary and updates from Australia Post executives."
    ),
    "section/news/speeches/index.html": (
        "Official speeches and presentations from Australia Post leadership."
    ),
    "section/stamps/index.html": (
        "Browse all Australian stamp issues — commemoratives, definitives and special editions."
    ),
    "section/stamps/royal/index.html": (
        "Royal themed stamp issues celebrating monarchs and the royal family."
    ),
    "section/stamps/sport/index.html": (
        "Australian sporting stamps celebrating athletes, events and national pride."
    ),
    "section/stamps/arts-and-culture/index.html": (
        "Stamp issues celebrating Australian arts, culture and heritage."
    ),
    "section/stamps/history/index.html": (
        "Historical Australian stamp issues commemorating significant people and events."
    ),
    "section/stamps/indigenous/index.html": (
        "Stamp issues honouring First Nations peoples, culture and connection to Country."
    ),
    "section/stamps/industry/index.html": (
        "Stamp issues recognising Australian industry, innovation and enterprise."
    ),
    "section/stamps/legends/index.html": (
        "Stamp issues honouring Australian legends in sport, arts and community."
    ),
    "section/stamps/military/index.html": (
        "Stamp issues commemorating Australia’s military history and service personnel."
    ),
    "section/stamps/natural-world/index.html": (
        "Stamp issues celebrating Australia’s diverse flora, fauna and natural landscapes."
    ),
    "section/video/index.html": (
        "Watch the latest Australia Post videos — announcements, community stories and behind the scenes."
    ),
    "archive/news/index.html": (
        "Browse the complete Australia Post news archive."
    ),
    "archive/stamps/index.html": (
        "The complete collection of Australian stamp issues from Australia Post."
    ),
    "photos/index.html": None,  # already has a description <p>; keep it
}

# ── Token ──────────────────────────────────────────────────────────────────────

def load_token():
    if not TOKEN_FILE.exists():
        sys.exit(f"Token not found at {TOKEN_FILE}\nRun 'aem login' to authenticate.")
    data = json.loads(TOKEN_FILE.read_text())
    token = data.get("access_token") or data.get("token")
    if not token:
        sys.exit("No access_token in token file.")
    expires = data.get("expires_at", 0)
    if expires and expires < time.time() * 1000:
        sys.exit("DA token has expired — run 'aem login' to refresh.")
    return token

# ── Listing-intro transform ────────────────────────────────────────────────────

def _find_matching_div_end(html, start):
    """Return index just after the </div> that closes the <div> opening at `start`."""
    depth = 0
    i = start
    while i < len(html):
        if html[i:i+4] == "<div":
            depth += 1
            i += 4
        elif html[i:i+6] == "</div>":
            depth -= 1
            if depth == 0:
                return i + 6
            i += 6
        else:
            i += 1
    return len(html)


def add_listing_intro(html, description):
    """
    Idempotent: skips pages that already have listing-intro.

    Handles two existing layouts:
      A) h1 (+ optional <p>) already in a separate first section from article-list
         → just insert section-metadata before that first section's </div>
      B) h1 and article-list in the same section
         → split into two sections; inject description if not already present

    Returns (new_html, changed: bool).
    """
    if "listing-intro" in html:
        return html, False

    # ── Layout A: two sections already exist ─────────────────────────────────
    # Detect: closing of a section that has an h1 but no article-list,
    # immediately followed by a section that opens with article-list.
    layout_a = re.search(
        r'(</h1>(?:[ \t]*\n?[ \t]*<p>.*?</p>)?)([ \t]*\n?[ \t]*</div>[ \t]*\n?[ \t]*<div>[ \t]*\n?[ \t]*<div class="article-list")',
        html, re.DOTALL,
    )
    if layout_a:
        insert_after = layout_a.end(1)
        new_html = html[:insert_after] + "\n    " + SECTION_META_HTML + html[insert_after:]
        return new_html, True

    # ── Layout B: h1 + article-list in the same section ──────────────────────
    h1_match = re.search(r"<h1>(.*?)</h1>", html)
    if not h1_match:
        return html, False
    h1_text = h1_match.group(1)

    # Existing description <p> between h1 and article-list?
    desc_between = re.search(
        r"<h1>[^<]*</h1>\s*<p>(.*?)</p>\s*<div class=\"article-list\"",
        html, re.DOTALL,
    )
    if desc_between:
        desc_text = desc_between.group(1)
    else:
        desc_text = description  # may be None

    al_start = html.find('<div class="article-list">')
    if al_start == -1:
        return html, False
    al_end = _find_matching_div_end(html, al_start)
    article_list_block = html[al_start:al_end]

    desc_html = f"\n    <p>{desc_text}</p>" if desc_text else ""
    intro = (
        f"  <div>\n"
        f"    <h1>{h1_text}</h1>{desc_html}\n"
        f"    {SECTION_META_HTML}\n"
        f"  </div>"
    )
    listing = (
        f"  <div>\n"
        f"    {article_list_block}\n"
        f"  </div>"
    )
    new_main = f"<main>\n{intro}\n{listing}\n</main>"

    # Preserve <body> wrapper if present
    if "<body>" in html or "<header>" in html:
        new_html = re.sub(r"<main>.*?</main>", new_main, html, flags=re.DOTALL)
    else:
        new_html = new_main

    return new_html, True

# ── DA API helpers ─────────────────────────────────────────────────────────────

def push_file(token, local_path, da_path):
    url = DA_BASE + da_path
    r = subprocess.run(
        [
            "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", f"Authorization: Bearer {token}",
            "-F", f"data=@{local_path};type=text/html",
        ],
        capture_output=True, text=True, timeout=30,
    )
    code = r.stdout.strip()
    return code in ("200", "201"), code


def preview_page(token, da_path):
    path = da_path
    if path.endswith(".html"):
        path = path[:-5]
    if path.endswith("/index"):
        path = path[:-6] or "/"
    if not path:
        path = "/"
    url = HLX_PREVIEW + path
    r = subprocess.run(
        [
            "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", f"Authorization: Bearer {token}",
        ],
        capture_output=True, text=True, timeout=30,
    )
    return r.stdout.strip()

# ── File collection ────────────────────────────────────────────────────────────

def collect_files():
    files = []
    for p in sorted(CONTENT_DIR.rglob("*.html")):
        rel = p.relative_to(CONTENT_DIR)
        da_path = "/" + str(rel).replace("\\", "/")
        files.append((p, da_path))
    return files

# ── Phases ─────────────────────────────────────────────────────────────────────

def phase_update(dry_run=False):
    print("\n=== Phase 1: Update listing-intro structure ===")
    changed = []
    skipped = []
    missing = []

    for rel_path, description in LISTING_PAGES.items():
        local = CONTENT_DIR / rel_path
        if not local.exists():
            missing.append(rel_path)
            print(f"  MISSING   {rel_path}")
            continue

        html = local.read_text(encoding="utf-8")
        new_html, did_change = add_listing_intro(html, description)

        if not did_change:
            skipped.append(rel_path)
            print(f"  SKIP      {rel_path}  (already has listing-intro or couldn't parse)")
        elif dry_run:
            changed.append(rel_path)
            print(f"  WOULD UPDATE  {rel_path}")
        else:
            local.write_text(new_html, encoding="utf-8")
            changed.append(rel_path)
            print(f"  UPDATED   {rel_path}")

    print(f"\n  {len(changed)} changed, {len(skipped)} skipped, {len(missing)} missing")

    # ── Reminder about placeholder pages ──────────────────────────────────────
    print("\n  NOTE — these pages have placeholder content and need manual updates:")
    print("    /video   — replace xxxxxxxxxxx YouTube IDs with real video IDs")
    print("    /photos  — replace placeholder gallery images with real photos")
    print("    /stamps  — replace placeholder stamp collection data with real stamps")

    return changed


def phase_push(token, files):
    print(f"\n=== Phase 2: Push {len(files)} files to DA ===")
    ok_count = fail_count = 0
    failures = []

    def task(args):
        local_path, da_path = args
        ok, code = push_file(token, str(local_path), da_path)
        return ok, code, da_path

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(task, f): f for f in files}
        done = 0
        for future in as_completed(futures):
            ok, code, da_path = future.result()
            done += 1
            if ok:
                ok_count += 1
            else:
                fail_count += 1
                failures.append((code, da_path))
                print(f"  FAIL {code}  {da_path}")
            if done % 100 == 0:
                print(f"  ... {done}/{len(files)} pushed")

    print(f"\n  Push complete: {ok_count} ok / {fail_count} failed")
    if failures:
        print("  Failed paths:")
        for code, path in failures:
            print(f"    {code}  {path}")
    return fail_count == 0


def phase_preview(token, files):
    print(f"\n=== Phase 3: Preview {len(files)} pages ===")
    ok_count = fail_count = 0
    failures = []

    for i, (_, da_path) in enumerate(files, 1):
        code = preview_page(token, da_path)
        if code in ("200", "201"):
            ok_count += 1
        else:
            fail_count += 1
            failures.append((code, da_path))
            print(f"  FAIL {code}  {da_path}")
        if i % 100 == 0:
            print(f"  ... {i}/{len(files)} previewed")
        time.sleep(PREVIEW_DELAY)

    print(f"\n  Preview complete: {ok_count} ok / {fail_count} failed")
    if failures:
        print("  Failed paths (may be expected for directory-only URLs):")
        for code, path in failures:
            print(f"    {code}  {path}")

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Update DA content and push to DA live.")
    parser.add_argument("--dry-run",      action="store_true", help="Phase 1 only, no file writes")
    parser.add_argument("--push-only",    action="store_true", help="Skip Phase 1; just push + preview")
    parser.add_argument("--update-only",  action="store_true", help="Phase 1 only; no push/preview")
    args = parser.parse_args()

    if not args.push_only:
        phase_update(dry_run=args.dry_run)
        if args.dry_run or args.update_only:
            return

    print("\nLoading DA token...")
    token = load_token()

    files = collect_files()
    phase_push(token, files)
    phase_preview(token, files)

    print("\n✓ All done.")
    print(f"  Preview site: https://main--nr--kapilmalik84.aem.page/")


if __name__ == "__main__":
    main()
