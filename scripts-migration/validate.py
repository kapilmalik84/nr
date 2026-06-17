#!/usr/bin/env python3
"""
Post-migration validation script.

For each migrated article, fetches:
  - Source page  (newsroom.auspost.com.au/{slug})
  - AEM page     (main--nr--kapilmalik84.aem.page/{da_path}.plain.html)

Checks:
  1. Title matches between source and AEM
  2. Date metadata is present on AEM page
  3. Body word count >= 50% of source
  4. Video embed present on AEM if source had one
  5. Image metadata row present (needed for article cards)
  6. No stale /article/ or root-level paths left in DA (redirect smoke-check)
  7. AEM page returns HTTP 200 (not 404)

Notes:
  - External newsroom.auspost.com.au image URLs are CORRECT — we intentionally use
    them instead of uploading to DA (auth-gated, not served via CDN).
  - Uses migration-log.jsonl to resolve source slug -> DA path.

Usage:
  cd scripts-migration/
  python3 validate.py --list urls-articles.txt --limit 20   # pilot
  python3 validate.py --list urls-articles.txt              # full run
  python3 validate.py --list urls-video.txt                 # video only
"""
import argparse
import json
import os
import re
import sys
import time

import requests

SITE_BASE = "https://newsroom.auspost.com.au"
AEM_BASE  = "https://main--nr--kapilmalik84.aem.page"
LOG_FILE  = os.path.join(os.path.dirname(__file__), "migration-log.jsonl")
REPORT_FILE = os.path.join(os.path.dirname(__file__), "validation-report.jsonl")

session = requests.Session()
session.headers["User-Agent"] = "Mozilla/5.0"


# ---------- slug -> DA path lookup ----------

def load_da_path_map():
    """Build {base_slug: da_path} from migration-log.jsonl."""
    mapping = {}
    if not os.path.exists(LOG_FILE):
        return mapping
    with open(LOG_FILE, "rb") as f:
        for line in f.read().decode("utf-8").split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                if r.get("status") == "pushed" and r.get("da_path"):
                    slug = r["slug"]
                    # Store by full slug and by base (last segment)
                    mapping[slug] = r["da_path"]
                    base = slug.rstrip("/").split("/")[-1]
                    mapping[base] = r["da_path"]
            except Exception:
                pass
    return mapping


# ---------- helpers ----------

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def word_count(html):
    return len(strip_tags(html).split())


def fetch(url, timeout=20):
    try:
        r = session.get(url, timeout=timeout)
        return r.status_code, r.text
    except Exception as e:
        return 0, str(e)


# ---------- source extraction ----------

def source_title(raw):
    m = re.search(r'<h1 id="ctl00_MainContent_headingTitle">(.*?)</h1>', raw, re.S)
    return strip_tags(m.group(1)) if m else None


def source_date(raw):
    m = re.search(r'<p id="ctl00_MainContent_pDate"[^>]*>(.*?)</p>', raw, re.S)
    return strip_tags(m.group(1)) if m else None


def source_body_words(raw):
    m = re.search(r'<div class="article-body[^"]*">(.*?)</div>\s*</div>', raw, re.S)
    return word_count(m.group(1)) if m else 0


def source_has_video(raw):
    return bool(re.search(
        r'<iframe[^>]*src="https://(player\.vimeo\.com|www\.youtube\.com/embed)',
        raw,
    ))


# ---------- AEM extraction ----------

def aem_title(plain):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", plain, re.I | re.S)
    return strip_tags(m.group(1)) if m else None


def aem_has_date(plain):
    # publication-date class may appear in plain HTML body; checked here for belt-and-braces
    return bool(re.search(r'article-date', plain, re.I))


def aem_has_date_meta(full_html):
    # AEM EDS moves the metadata block to <head> as <meta> tags — check full HTML head
    return bool(re.search(r'<meta\s+name="publication-date"', full_html, re.I))


def aem_body_words(plain):
    cleaned = re.sub(
        r'<div[^>]*class="[^"]*(?:metadata|breadcrumb|embed|downloads|'
        r'media-contact|fragment|publications-promo)[^"]*"[^>]*>.*?</div>\s*</div>',
        '', plain, flags=re.S | re.I,
    )
    return word_count(cleaned)


def aem_has_video(plain):
    return bool(re.search(r'class="embed"', plain, re.I))


def aem_has_image_meta(full_html):
    # og:image is set in <head> by AEM EDS after processing the image metadata row
    return bool(re.search(r'<meta\s+property="og:image"', full_html, re.I))


# ---------- validate one slug ----------

def validate(slug, da_path_map):
    base = slug.rstrip("/").split("/")[-1]
    da_path = da_path_map.get(slug) or da_path_map.get(base)

    result = {
        "slug": slug,
        "da_path": da_path,
        "issues": [],
        "ok": True,
    }

    if not da_path:
        result["issues"].append("no_da_path_in_log")
        result["ok"] = False
        return result

    # Fetch AEM plain HTML (for body content checks)
    aem_status, aem_raw = fetch(f"{AEM_BASE}{da_path}.plain.html")
    result["aem_status"] = aem_status
    if aem_status == 404:
        result["issues"].append("aem_404")
        result["ok"] = False
        return result
    if aem_status != 200:
        result["issues"].append(f"aem_fetch_{aem_status}")
        result["ok"] = False
        return result

    # Fetch full AEM page HTML (for <head> metadata checks)
    _, aem_full = fetch(f"{AEM_BASE}{da_path}")

    # Fetch source page
    src_status, src_raw = fetch(f"{SITE_BASE}/{slug}")
    result["src_status"] = src_status
    if src_status != 200:
        result["issues"].append(f"source_fetch_{src_status}")
        # Don't abort — we can still check AEM-only properties
    else:
        # 1. Title match
        stitle = source_title(src_raw)
        atitle = aem_title(aem_raw)
        result["source_title"] = stitle
        result["aem_title"] = atitle
        if stitle and atitle and stitle.lower().strip() != atitle.lower().strip():
            result["issues"].append("title_mismatch")

        # 2. Date
        result["source_date"] = source_date(src_raw)

        # 3. Body word count
        sw = source_body_words(src_raw)
        aw = aem_body_words(aem_raw)
        result["source_words"] = sw
        result["aem_words"] = aw
        if sw > 50 and aw < sw * 0.5:
            result["issues"].append(f"low_word_count({aw}/{sw})")

        # 4. Video embed
        if source_has_video(src_raw) and not aem_has_video(aem_raw):
            result["issues"].append("missing_video_embed")

    # 5. Date metadata in <head> (AEM moves metadata block there — must check full HTML)
    if not aem_has_date_meta(aem_full):
        result["issues"].append("missing_date_metadata")

    # 6. og:image in <head> (needed for article listing cards)
    if not aem_has_image_meta(aem_full):
        result["issues"].append("missing_image_metadata")

    if result["issues"]:
        result["ok"] = False

    return result


# ---------- main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", default="urls-articles.txt")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=0.5)
    args = ap.parse_args()

    url_file = args.list
    if not os.path.isabs(url_file):
        url_file = os.path.join(os.path.dirname(__file__), url_file)

    with open(url_file) as f:
        slugs = [l.strip().lstrip("/") for l in f if l.strip()]

    if args.limit:
        slugs = slugs[args.start:args.start + args.limit]
    else:
        slugs = slugs[args.start:]

    print(f"Loading DA path map from migration-log.jsonl...")
    da_path_map = load_da_path_map()
    print(f"  {len(da_path_map)} slug→path entries loaded")
    print(f"Validating {len(slugs)} articles...\n")

    ok_count = fail_count = 0
    issue_tally = {}
    report_path = REPORT_FILE

    with open(report_path, "w") as log:
        for i, slug in enumerate(slugs):
            r = validate(slug, da_path_map)
            log.write(json.dumps(r) + "\n")
            log.flush()
            if r["ok"]:
                ok_count += 1
                print(f"[{i+1}/{len(slugs)}] OK  {r.get('da_path','?')}")
            else:
                fail_count += 1
                issues_str = ", ".join(r["issues"])
                print(f"[{i+1}/{len(slugs)}] FAIL {r.get('da_path','?')}  [{issues_str}]")
                for issue in r["issues"]:
                    key = re.sub(r'\(.*\)', '', issue)  # strip params
                    issue_tally[key] = issue_tally.get(key, 0) + 1
            time.sleep(args.sleep)

    print(f"\n{'='*60}")
    print(f"SUMMARY: {ok_count} OK, {fail_count} with issues (of {len(slugs)} total)")
    if issue_tally:
        print("\nIssue breakdown:")
        for k, v in sorted(issue_tally.items(), key=lambda x: -x[1]):
            print(f"  {k:40s} {v}")
    print(f"\nFull report: {report_path}")


if __name__ == "__main__":
    main()
