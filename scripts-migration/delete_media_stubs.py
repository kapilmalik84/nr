#!/usr/bin/env python3
"""
Delete broken media_*.jpg/png stubs auto-created by AEM EDS at the DA root.

AEM EDS auto-converts external image URLs to ./media_HASH.ext during preview,
creating stub files in DA when the source images are auth-gated (newsroom.auspost.com.au).
These stubs are empty/broken and should be removed.
"""
import json
import os
import sys
import time

import requests

ORG = "kapilmalik84"
SITE = "nr"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")


def get_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def main():
    token = get_token()
    session = requests.Session()

    # List DA root
    r = session.get(
        f"https://admin.da.live/list/{ORG}/{SITE}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"ERROR: list returned {r.status_code}", file=sys.stderr)
        sys.exit(1)

    items = r.json()
    if not isinstance(items, list):
        items = items.get("data", [])

    stubs = [i for i in items if i.get("name", "").startswith("media_")]
    print(f"Found {len(stubs)} media_* stubs at DA root")

    deleted = errors = 0
    for i, item in enumerate(stubs):
        name = item["name"]
        ext = item.get("ext", "")
        path = f"/{name}.{ext}" if ext else f"/{name}"
        url = f"https://admin.da.live/source/{ORG}/{SITE}{path}"
        resp = session.delete(url, headers={"Authorization": f"Bearer {token}"}, timeout=15)
        if resp.status_code in (200, 204, 404):
            deleted += 1
            print(f"[{i+1}/{len(stubs)}] deleted {path}  ({resp.status_code})")
        else:
            errors += 1
            print(f"[{i+1}/{len(stubs)}] ERROR {resp.status_code} {path}", file=sys.stderr)
        time.sleep(0.2)

    print(f"\nDone. deleted={deleted} errors={errors}")


if __name__ == "__main__":
    main()
