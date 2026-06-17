#!/usr/bin/env python3
"""
Remove stale HLX preview/live index entries for old flat-path articles.

Before the year-based migration, articles lived at:
  /{slug}          (root level)
  /article/{slug}  (with article/ prefix)

These DA sources were deleted, but HLX preview/live was never explicitly
unpublished, so the query-index.json may still contain these old entries,
causing duplicate listings on category pages.

This script calls DELETE on HLX preview AND live for every old path derived
from migrated slugs (both normalised and raw forms), safely skipping system
pages (nav, footer, index, head, 404).

Usage:
  cd /mnt/c/Users/Kapil/projects/newsroom
  python3 scripts-migration/cleanup_stale_hlx.py [--dry-run] [--sleep 0.3]
"""
import argparse
import json
import os
import re
import sys
import time

import requests

ORG      = "kapilmalik84"
SITE     = "nr"
REF      = "main"
LOG_FILE = os.path.join(os.path.dirname(__file__), "migration-log.jsonl")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")

ROOT_KEEP = {"/nav", "/footer", "/head", "/index", "/404", "/query-index"}

HLX_BASE = f"https://admin.hlx.page"

session = requests.Session()
session.headers["User-Agent"] = "AEM-EDS-Migration/1.0"


def load_token():
    with open(TOKEN_FILE) as f:
        data = json.load(f)
    return data.get("access_token") or data.get("token")


def load_old_paths():
    """Derive the set of old flat-path slugs from the migration log."""
    seen_slugs = set()
    with open(LOG_FILE, "rb") as f:
        for line in f.read().decode("utf-8").split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                if r.get("status") == "pushed" and r.get("slug"):
                    seen_slugs.add(r["slug"])
            except Exception:
                pass

    old_paths = set()
    for slug in seen_slugs:
        base = slug.rstrip("/").split("/")[-1]
        base_norm = re.sub(r"-{2,}", "-", base).lstrip("-")

        for b in {base, base_norm}:
            candidate = f"/{b}"
            if candidate not in ROOT_KEEP:
                old_paths.add(candidate)
            candidate_art = f"/article/{b}"
            old_paths.add(candidate_art)

    return old_paths


def purge_path(path, token, dry_run):
    """DELETE the path from HLX preview AND live. Returns (pv_status, lv_status)."""
    pv_url = f"{HLX_BASE}/preview/{ORG}/{SITE}/{REF}{path}"
    lv_url = f"{HLX_BASE}/live/{ORG}/{SITE}/{REF}{path}"

    if dry_run:
        print(f"  [DRY] DELETE {pv_url}")
        print(f"  [DRY] DELETE {lv_url}")
        return ("DRY", "DRY")

    try:
        pv = session.delete(pv_url, headers={"Authorization": f"token {token}"}, timeout=15)
        lv = session.delete(lv_url, headers={"Authorization": f"token {token}"}, timeout=15)
        return (pv.status_code, lv.status_code)
    except Exception as e:
        print(f"  ERROR: {e}")
        return (0, 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Print what would be deleted, do nothing")
    ap.add_argument("--sleep", type=float, default=0.25, help="Seconds between requests")
    args = ap.parse_args()

    token = load_token()
    old_paths = sorted(load_old_paths())
    print(f"Loaded {len(old_paths)} old paths to purge from HLX preview/live index")
    if args.dry_run:
        print("DRY RUN — no actual deletes\n")

    purged = ok = skipped = 0
    for i, path in enumerate(old_paths):
        pv, lv = purge_path(path, token, args.dry_run)
        status = f"preview:{pv} live:{lv}"
        if pv in (200, 204, 404) and lv in (200, 204, 404):
            ok += 1
        else:
            skipped += 1
        print(f"[{i+1}/{len(old_paths)}] {path}  {status}")
        purged += 1
        time.sleep(args.sleep)

    print(f"\nDone. purged={purged} ok_or_already_gone={ok} errors={skipped}")


if __name__ == "__main__":
    main()
