#!/usr/bin/env python3
"""
Delete stale root-level duplicate articles from DA.live.

Background: The first migration run placed articles at flat root paths like
/slug.html. The delete_da_content.py step only deleted the FIRST PAGE of root
listings (DA API paginates), so some root-level articles survived. The re-migration
then created the correct year-based paths (/archive/news/YEAR/slug, etc.), leaving
both old and new versions in DA — which caused category listing pages to show the
same article twice.

This script:
  1. Reads migration-log.jsonl to get the base slug for every correctly-migrated article
  2. Calls admin.da.live/list/ to list ALL root-level HTML files (handles pagination)
  3. Deletes any root-level file whose base name matches a migrated slug

Safe: only deletes root-level /slug.html files, never touches /archive/, /section/,
/fragments/, /media/, /assets/, or preserved system files.
"""
import json
import os
import sys
import time

import requests

ORG = "kapilmalik84"
SITE = "nr"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")
LOG_FILE = os.path.join(os.path.dirname(__file__), "migration-log.jsonl")

ROOT_KEEP = {"footer", "nav", "index", "search", "signup", "404", "head"}


def get_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def list_root_html(session, token):
    """List ALL root-level HTML files in DA, handling pagination via cursor."""
    files = []
    url = f"https://admin.da.live/list/{ORG}/{SITE}"
    while url:
        r = session.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if r.status_code != 200:
            print(f"  [warn] list returned {r.status_code}", file=sys.stderr)
            break
        data = r.json()
        # DA returns a list directly OR a dict with 'data' and optional 'cursor'
        if isinstance(data, list):
            items = data
            cursor = None
        else:
            items = data.get("data", data.get("items", []))
            cursor = data.get("cursor")
        for item in items:
            if item.get("ext") == "html":
                files.append(item["name"])
        if cursor:
            url = f"https://admin.da.live/list/{ORG}/{SITE}?cursor={cursor}"
        else:
            break
    return files


def load_migrated_bases():
    """Return set of base slugs that have been correctly migrated."""
    bases = set()
    with open(LOG_FILE, "rb") as f:
        for line in f.read().decode("utf-8").split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                if r.get("status") == "pushed" and r.get("da_path"):
                    base = r["da_path"].rstrip("/").split("/")[-1]
                    bases.add(base)
            except Exception:
                pass
    return bases


def delete_file(session, token, name):
    url = f"https://admin.da.live/source/{ORG}/{SITE}/{name}.html"
    r = session.delete(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code


def main():
    token = get_token()
    session = requests.Session()

    print("Loading migrated base slugs from migration-log.jsonl...")
    migrated_bases = load_migrated_bases()
    print(f"  {len(migrated_bases)} unique migrated slugs")

    print("\nListing root-level HTML files in DA (with pagination)...")
    root_files = list_root_html(session, token)
    print(f"  {len(root_files)} total root HTML files found")

    to_delete = [
        name for name in root_files
        if name not in ROOT_KEEP and name in migrated_bases
    ]
    skipped = [
        name for name in root_files
        if name not in ROOT_KEEP and name not in migrated_bases
    ]

    print(f"\n  Stale root duplicates to delete: {len(to_delete)}")
    print(f"  Root files NOT in migrated set (kept): {len(skipped)}")
    if skipped:
        print("  Examples kept:", skipped[:5])

    if not to_delete:
        print("\nNothing to delete.")
        return

    print(f"\nDeleting {len(to_delete)} stale root duplicates...")
    deleted = errors = 0
    for name in to_delete:
        status = delete_file(session, token, name)
        if status in (200, 204, 404):
            deleted += 1
            sys.stdout.write(f"\r  deleted {deleted}/{len(to_delete)}  ")
            sys.stdout.flush()
        else:
            errors += 1
            print(f"\n  [err] /{name}.html -> {status}", file=sys.stderr)
        time.sleep(0.1)

    print(f"\n\nDone — {deleted} deleted, {errors} errors")


if __name__ == "__main__":
    main()
