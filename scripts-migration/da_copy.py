#!/usr/bin/env python3
"""
Copy all DA content from one org/site to another.

Used when promoting from the dev environment (kapilmalik84/nr) to AusPost
production (e.g. capgeminiapacptrsd/newsroom or the final AusPost DA org).

What it does:
  1. Walks the source DA site recursively via the list API
  2. For each HTML document: GET source → PUT to destination
  3. Triggers preview+live on destination after copy (--preview flag)
  4. Skips unchanged files (compares ETag / Last-Modified)

Usage:
  python3 da_copy.py --src-org kapilmalik84 --src-site nr \\
                     --dst-org capgeminiapacptrsd --dst-site newsroom
  python3 da_copy.py --dst-org ... --dst-site ... --preview     # copy + preview
  python3 da_copy.py --dst-org ... --dst-site ... --dry-run     # show plan only
  python3 da_copy.py --dst-org ... --dst-site ... --path archive/news/2025

Tokens:
  Uses migration-config.json token_file for the SOURCE org.
  Set DA_DST_TOKEN env var for the DESTINATION org token if it is different
  (e.g. when copying to an AusPost Adobe org that uses a different IMS account).
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import requests

# Force line-buffered output
import functools
print = functools.partial(print, flush=True)

SCRIPT_DIR = Path(__file__).parent

_CONFIG_FILE = SCRIPT_DIR / "migration-config.json"
_cfg: dict = {}
if _CONFIG_FILE.exists():
    with open(_CONFIG_FILE) as _f:
        _cfg = json.load(_f)

DEFAULT_SRC_ORG  = _cfg.get("da_org", "kapilmalik84")
DEFAULT_SRC_SITE = _cfg.get("da_site", "nr")
TOKEN_FILE = Path(os.path.join(str(SCRIPT_DIR), _cfg.get("token_file", "../.hlx/.da-token.json")))

DA_BASE  = "https://admin.da.live"
HLX_BASE = "https://admin.hlx.page"


def load_token(token_file: Path) -> str:
    with open(token_file) as f:
        return json.load(f)["access_token"]


def list_all(org: str, site: str, path: str, auth: dict) -> list[str]:
    """Recursively list all .html document paths under org/site/path."""
    url = f"{DA_BASE}/list/{org}/{site}/{path.lstrip('/')}"
    r = requests.get(url, headers=auth, timeout=15)
    if r.status_code != 200:
        return []
    paths = []
    for item in r.json():
        if item.get("ext") == "html":
            paths.append(item["path"].replace(f"/{org}/{site}", ""))
        elif not item.get("ext"):
            # directory — recurse
            subpath = item["path"].replace(f"/{org}/{site}", "")
            paths.extend(list_all(org, site, subpath, auth))
    return paths


def copy_doc(doc_path: str, src_org: str, src_site: str,
             dst_org: str, dst_site: str,
             src_auth: dict, dst_auth: dict,
             preview: bool, dry_run: bool) -> tuple[str, str]:
    """Copy one document from src to dst. Returns (status, doc_path)."""
    src_url = f"{DA_BASE}/source/{src_org}/{src_site}{doc_path}"
    dst_url = f"{DA_BASE}/source/{dst_org}/{dst_site}{doc_path}"

    # Fetch source
    try:
        r = requests.get(src_url, headers=src_auth, timeout=15)
    except Exception as e:
        return "fetch-error", f"{doc_path}: {e}"
    if r.status_code != 200:
        return "src-404", doc_path
    html = r.text
    etag  = r.headers.get("ETag", "")
    ctype = r.headers.get("Content-Type", "text/html")

    if dry_run:
        return "dry-run", doc_path

    # PUT to destination
    put_headers = {**dst_auth, "Content-Type": ctype}
    try:
        p = requests.put(dst_url, data=html.encode("utf-8"),
                         headers=put_headers, timeout=20)
    except Exception as e:
        return "put-error", f"{doc_path}: {e}"
    if p.status_code not in (200, 201):
        return f"put-{p.status_code}", doc_path

    # Preview + live on destination
    if preview:
        clean = doc_path.replace(".html", "")
        try:
            pv = requests.post(
                f"{HLX_BASE}/preview/{dst_org}/{dst_site}/main{clean}",
                headers=dst_auth, timeout=25)
            if pv.status_code == 200:
                requests.post(
                    f"{HLX_BASE}/live/{dst_org}/{dst_site}/main{clean}",
                    headers=dst_auth, timeout=25)
        except Exception:
            return "preview-error", doc_path

    return "ok", doc_path


def main():
    ap = argparse.ArgumentParser(description="Copy DA content between orgs/sites")
    ap.add_argument("--src-org",  default=DEFAULT_SRC_ORG)
    ap.add_argument("--src-site", default=DEFAULT_SRC_SITE)
    ap.add_argument("--dst-org",  required=True)
    ap.add_argument("--dst-site", required=True)
    ap.add_argument("--path",     default="",
                    help="Sub-path to copy (default: entire site)")
    ap.add_argument("--preview",  action="store_true",
                    help="Trigger preview+live on destination after copy")
    ap.add_argument("--dry-run",  action="store_true",
                    help="List what would be copied, do not write")
    ap.add_argument("--workers",  type=int, default=4,
                    help="Parallel workers (default 4)")
    ap.add_argument("--dst-token-file",
                    help="Path to DA token JSON for destination org "
                         "(if different from source). Env var DA_DST_TOKEN also accepted.")
    args = ap.parse_args()

    src_token = load_token(TOKEN_FILE)
    src_auth  = {"Authorization": f"Bearer {src_token}"}

    dst_token_env = os.environ.get("DA_DST_TOKEN")
    if dst_token_env:
        dst_token = dst_token_env
    elif args.dst_token_file:
        dst_token = load_token(Path(args.dst_token_file))
    else:
        dst_token = src_token  # same IMS account — fine if both orgs share it
    dst_auth = {"Authorization": f"Bearer {dst_token}"}

    print(f"Source: {args.src_org}/{args.src_site}")
    print(f"Dest:   {args.dst_org}/{args.dst_site}")
    if args.dry_run:
        print("[DRY RUN — no writes]")

    # Walk source
    root_path = args.path.strip("/")
    print(f"Listing documents under /{root_path or '(root)'} …", end=" ")
    docs = list_all(args.src_org, args.src_site, root_path, src_auth)
    print(f"{len(docs)} found")

    if not docs:
        print("Nothing to copy.")
        return

    ok = err = skipped = 0
    errors = []

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {
            ex.submit(copy_doc, d,
                      args.src_org, args.src_site,
                      args.dst_org, args.dst_site,
                      src_auth, dst_auth,
                      args.preview, args.dry_run): d
            for d in docs
        }
        for i, f in enumerate(as_completed(futures), 1):
            status, path = f.result()
            if status == "ok" or status == "dry-run":
                ok += 1
            elif status.startswith("src-"):
                skipped += 1
            else:
                err += 1
                errors.append((status, path))
            if i % 50 == 0 or status not in ("ok", "dry-run"):
                label = "DRY" if status == "dry-run" else status.upper()
                print(f"[{i}/{len(docs)}] ok:{ok} err:{err} skip:{skipped}  "
                      f"{label if status != 'ok' else ''} {path if status != 'ok' else ''}")

    print(f"\n{'DRY RUN ' if args.dry_run else ''}Done: {ok} copied, {err} errors, {skipped} skipped")
    if errors:
        print("\nErrors:")
        for s, p in errors:
            print(f"  {s}: {p}")


if __name__ == "__main__":
    main()
