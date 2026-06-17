#!/usr/bin/env python3
"""
Scans all URLs in urls-articles.txt against the source site.
Extracts: slug, category (breadcrumb), date/year.
Produces category-scan.json and prints a summary table.
No DA token needed. Read-only against newsroom.auspost.com.au.
"""
import json
import re
import sys
import time
from pathlib import Path
import requests

SCRIPT_DIR = Path(__file__).parent
SITE_BASE = "https://newsroom.auspost.com.au"
URL_FILE = SCRIPT_DIR / "urls-articles.txt"
OUT_FILE = SCRIPT_DIR / "category-scan.json"
SLEEP = 0.4   # seconds between requests

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


def fetch_raw(slug, session):
    url = f"{SITE_BASE}/{slug}"
    r = session.get(url, timeout=20)
    r.raise_for_status()
    return r.text


def extract_breadcrumb(raw):
    m = re.search(r'<div id="breadcrumbs">.*?<ul>(.*?)</ul>', raw, re.S)
    if not m:
        return []
    items = re.findall(r'data-description="[^"]*"[^>]*>([^<]*)</a>', m.group(1))
    return [re.sub(r'\s+', ' ', i).strip() for i in items]


def extract_year(raw):
    # Try structured date: "12 December 2022"
    m = re.search(r'\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b', raw)
    if m and m.group(2).lower() in MONTH_MAP:
        return m.group(3)
    # Fallback: first 4-digit year in page
    m2 = re.search(r'\b(20\d{2})\b', raw)
    return m2.group(1) if m2 else None


def base_slug(slug):
    """Strip article/ or section/... prefix — keep only last path segment."""
    return slug.rstrip("/").split("/")[-1]


def main():
    slugs = [l.strip().lstrip("/") for l in URL_FILE.read_text().splitlines() if l.strip()]
    total = len(slugs)
    print(f"Scanning {total} URLs from {URL_FILE.name} ...\n")

    results = []
    session = requests.Session()
    session.headers["User-Agent"] = "AusPost-EDS-Migration-Scanner/1.0"

    for i, slug in enumerate(slugs):
        try:
            raw = fetch_raw(slug, session)
            bc = extract_breadcrumb(raw)
            year = extract_year(raw)

            # Determine section from breadcrumb
            # bc[0] = "Newsroom", bc[1] = top-level section, bc[2] = sub-section
            section = bc[1].strip() if len(bc) >= 2 else "Unknown"
            subsection = bc[2].strip() if len(bc) >= 3 else ""

            # Detect video by slug prefix
            is_video = base_slug(slug).startswith("video-")

            results.append({
                "slug": slug,
                "base": base_slug(slug),
                "breadcrumb": bc,
                "section": section,
                "subsection": subsection,
                "year": year,
                "is_video": is_video,
            })

            if (i + 1) % 50 == 0 or i == total - 1:
                print(f"  {i+1}/{total} done ...", flush=True)

        except Exception as e:
            print(f"  [WARN] {slug}: {e}", file=sys.stderr)
            results.append({
                "slug": slug,
                "base": base_slug(slug),
                "breadcrumb": [],
                "section": "ERROR",
                "subsection": "",
                "year": None,
                "is_video": False,
            })

        time.sleep(SLEEP)

    OUT_FILE.write_text(json.dumps(results, indent=2))
    print(f"\nRaw data → {OUT_FILE}\n")

    # ── Summary ─────────────────────────────────────────────────────────────────
    from collections import defaultdict, Counter

    # Count per section (top-level)
    section_counts = Counter(r["section"] for r in results)
    # Count per (section, subsection)
    sub_counts = Counter((r["section"], r["subsection"]) for r in results)
    # Year spread per section
    section_years = defaultdict(list)
    for r in results:
        if r["year"]:
            section_years[r["section"]].append(r["year"])

    print("=" * 70)
    print(f"{'SECTION':<30} {'COUNT':>6}  {'YEARS':<30}  {'ACTION'}")
    print("=" * 70)

    for section, count in section_counts.most_common():
        years = sorted(set(section_years.get(section, [])), reverse=True)
        year_str = ", ".join(years[:6]) + ("…" if len(years) > 6 else "")
        action = f"year-based (>{50})" if count > 50 else "flat folder"
        print(f"  {section:<28} {count:>6}  {year_str:<30}  {action}")

    print()
    print("SUBSECTION BREAKDOWN (where subsection exists):")
    print("-" * 70)
    for (sec, sub), count in sorted(sub_counts.items(), key=lambda x: -x[1]):
        if sub:
            years = sorted(set(
                r["year"] for r in results
                if r["section"] == sec and r["subsection"] == sub and r["year"]
            ), reverse=True)
            year_str = ", ".join(years[:5]) + ("…" if len(years) > 5 else "")
            action = f"year-based" if count > 50 else "flat"
            print(f"  {sec}/{sub:<28} {count:>5}  {year_str:<25}  {action}")

    print()
    print(f"Total scanned: {len(results)}  |  Errors: {sum(1 for r in results if r['section']=='ERROR')}")
    print(f"Full data written to: {OUT_FILE}")


if __name__ == "__main__":
    main()
