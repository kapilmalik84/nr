#!/usr/bin/env python3
"""
Bulk trigger preview + live for all articles in a DA site.

Run this:
  - After initial migration (to cache newsroom images into AEM CAS)
  - After da_copy.py promotes content to AusPost production org
  - Any time you need to force-refresh the CDN for all articles

AEM auto-caches external image URLs (e.g. newsroom.auspost.com.au/uploads/)
into AEM CAS as ./media_{SHA40hex}.jpg when an article is previewed.
Images become permanently served from the AEM CDN, independent of the source host.

Usage:
  python3 da_bulk_preview.py                          # use migration-config.json defaults
  python3 da_bulk_preview.py --org myorg --site mysite
  python3 da_bulk_preview.py --path archive/news/2025  # one year only
  python3 da_bulk_preview.py --workers 8               # increase parallelism
  python3 da_bulk_preview.py --preview-only            # skip live publish
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

import functools
print = functools.partial(print, flush=True)

SCRIPT_DIR = Path(__file__).parent

_CONFIG_FILE = SCRIPT_DIR / "migration-config.json"
_cfg: dict = {}
if _CONFIG_FILE.exists():
    with open(_CONFIG_FILE) as _f:
        _cfg = json.load(_f)

DEFAULT_ORG  = _cfg.get("da_org", "kapilmalik84")
DEFAULT_SITE = _cfg.get("da_site", "nr")
TOKEN_FILE   = Path(os.path.join(str(SCRIPT_DIR), _cfg.get("token_file", "../.hlx/.da-token.json")))

DA_BASE  = "https://admin.da.live"
HLX_BASE = "https://admin.hlx.page"

DEFAULT_SECTIONS = ["archive/news", "archive/video", "section/stamps"]


def list_all(org: str, site: str, path: str, auth: dict) -> list[str]:
    """Recursively list all .html document paths under org/site/path."""
    url = f"{DA_BASE}/list/{org}/{site}/{path.lstrip('/')}"
    r = requests.get(url, headers=auth, timeout=15)
    if r.status_code != 200:
        return []
    paths = []
    for item in r.json():
        if item.get("ext") == "html":
            paths.append(item["path"].replace(f"/{org}/{site}", "").replace(".html", ""))
        elif not item.get("ext"):
            subpath = item["path"].replace(f"/{org}/{site}", "")
            paths.extend(list_all(org, site, subpath, auth))
    return paths


def preview_live(doc_path: str, org: str, site: str,
                 auth: dict, preview_only: bool) -> tuple[str, str, int, int]:
    try:
        pv = requests.post(
            f"{HLX_BASE}/preview/{org}/{site}/main{doc_path}",
            headers=auth, timeout=25)
        pv_code = pv.status_code
        lv_code = 0
        if pv_code == 200 and not preview_only:
            lv = requests.post(
                f"{HLX_BASE}/live/{org}/{site}/main{doc_path}",
                headers=auth, timeout=25)
            lv_code = lv.status_code
        status = "ok" if pv_code == 200 else "err"
        return status, doc_path, pv_code, lv_code
    except Exception as e:
        return "skip", doc_path, 0, 0


def main():
    ap = argparse.ArgumentParser(description="Bulk preview+live all DA articles")
    ap.add_argument("--org",     default=DEFAULT_ORG)
    ap.add_argument("--site",    default=DEFAULT_SITE)
    ap.add_argument("--path",    default="",
                    help="Sub-path to process (default: all sections)")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--preview-only", action="store_true",
                    help="Only trigger preview, not live publish")
    ap.add_argument("--token-file", default=str(TOKEN_FILE))
    args = ap.parse_args()

    with open(args.token_file) as f:
        token = json.load(f)["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    # Collect paths
    all_paths = []
    if args.path:
        all_paths = list_all(args.org, args.site, args.path, auth)
    else:
        for section in DEFAULT_SECTIONS:
            found = list_all(args.org, args.site, section, auth)
            print(f"  {section}: {len(found)}")
            all_paths.extend(found)

    print(f"\nTotal: {len(all_paths)} articles to {'preview' if args.preview_only else 'preview+live'}")
    print(f"Org: {args.org}/{args.site}  Workers: {args.workers}\n")

    ok = err = skip = 0

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {
            ex.submit(preview_live, p, args.org, args.site, auth, args.preview_only): p
            for p in all_paths
        }
        for i, f in enumerate(as_completed(futures), 1):
            status, path, pv, lv = f.result()
            if status == "ok":
                ok += 1
            elif status == "err":
                err += 1
            else:
                skip += 1
            if i % 50 == 0 or status != "ok":
                tag = "" if status == "ok" else f"  {status.upper()} pv={pv} {path}"
                print(f"[{i}/{len(all_paths)}] ok:{ok} err:{err} skip:{skip}{tag}")

    print(f"\nDone: {ok} ok, {err} errors, {skip} skipped")


if __name__ == "__main__":
    main()
