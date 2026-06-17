#!/usr/bin/env python3
"""
Delete stale DA.live content before re-migrating to year-based folder structure.

Removes:
  - Root-level article HTML files (old flat slugs)
  - All files under /article/   (532 files, old path pattern)
  - All files under /articles/  (6 test files)
  - All files under /edition/   (28 edition pages)

Preserves: footer, nav, index, search, signup, 404, head, and all
           directories (section/, archive/, fragments/, media/, assets/).
"""
import json
import os
import sys
import time

import requests

ORG = "kapilmalik84"
SITE = "nr"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")

ROOT_KEEP = {"footer", "nav", "index", "search", "signup", "404", "head"}


def get_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def list_dir(session, token, path=""):
    url = f"https://admin.da.live/list/{ORG}/{SITE}"
    if path:
        url += path
    r = session.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code == 200:
        return r.json()
    print(f"  [list-warn] {path or '/'} returned {r.status_code}", file=sys.stderr)
    return []


def delete_file(session, token, path):
    url = f"https://admin.da.live/source/{ORG}/{SITE}{path}"
    r = session.delete(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code


def delete_dir_contents(session, token, dir_path, label):
    items = list_dir(session, token, dir_path)
    files = [i for i in items if i.get("ext") == "html"]
    print(f"  {label}: {len(files)} files")
    deleted = errors = 0
    for item in files:
        path = f"{dir_path}/{item['name']}.html"
        status = delete_file(session, token, path)
        if status in (200, 204, 404):
            deleted += 1
            sys.stdout.write(f"\r    deleted {deleted}/{len(files)}  ")
            sys.stdout.flush()
        else:
            errors += 1
            print(f"\n  [err] {path} -> {status}", file=sys.stderr)
        time.sleep(0.08)
    print(f"\n    done — {deleted} deleted, {errors} errors")
    return deleted, errors


def main():
    token = get_token()
    session = requests.Session()
    total_deleted = total_errors = 0

    # 1 — Root-level articles
    print("Step 1/4: Root-level article files...")
    items = list_dir(session, token)
    root_articles = [
        i for i in items
        if i.get("ext") == "html" and i["name"] not in ROOT_KEEP
    ]
    print(f"  Root: {len(root_articles)} articles to delete ({len(items)} total items)")
    d = e = 0
    for item in root_articles:
        path = f"/{item['name']}.html"
        status = delete_file(session, token, path)
        if status in (200, 204, 404):
            d += 1
            sys.stdout.write(f"\r    deleted {d}/{len(root_articles)}  ")
            sys.stdout.flush()
        else:
            e += 1
            print(f"\n  [err] {path} -> {status}", file=sys.stderr)
        time.sleep(0.08)
    print(f"\n    done — {d} deleted, {e} errors")
    total_deleted += d
    total_errors += e

    # 2–4 — /article/, /articles/, /edition/
    for dir_path, label in [
        ("/article", "Step 2/4: /article/"),
        ("/articles", "Step 3/4: /articles/"),
        ("/edition", "Step 4/4: /edition/"),
    ]:
        print(f"\n{label}...")
        d, e = delete_dir_contents(session, token, dir_path, label)
        total_deleted += d
        total_errors += e

    print(f"\n{'='*50}")
    print(f"Total deleted: {total_deleted}  Errors: {total_errors}")


if __name__ == "__main__":
    main()
