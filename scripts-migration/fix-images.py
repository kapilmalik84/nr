#!/usr/bin/env python3
"""
Download all external newsroom.auspost.com.au image URLs found in a DA HTML file,
upload them to DA as media files, then re-push the HTML with DA-hosted paths.

Usage:
  python3 fix-images.py sharepoint-content/index.html /index
  python3 fix-images.py sharepoint-content/nav.plain.html /nav
"""
import hashlib
import json
import os
import posixpath
import re
import sys
from urllib.parse import urlparse

import requests

ORG = "kapilmalik84"
SITE = "nr"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")
EXTERNAL_DOMAIN = "newsroom.auspost.com.au"

_cache: dict[str, str] = {}


def get_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def upload_image(src_url, token, session):
    if src_url in _cache:
        return _cache[src_url]

    try:
        r = session.get(src_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        img_bytes = r.content
    except Exception as e:
        print(f"  [skip] could not download {src_url}: {e}", file=sys.stderr)
        _cache[src_url] = src_url
        return src_url

    ext = posixpath.splitext(urlparse(src_url).path)[1].lower() or ".jpg"
    content_hash = hashlib.sha1(img_bytes).hexdigest()[:16]
    filename = f"media_{content_hash}{ext}"
    da_url = f"https://admin.da.live/source/{ORG}/{SITE}/{filename}"
    content_type = r.headers.get("Content-Type", "image/jpeg").split(";")[0]

    try:
        up = session.post(
            da_url,
            headers={"Authorization": f"Bearer {token}"},
            files={"data": (filename, img_bytes, content_type)},
            timeout=30,
        )
        if up.status_code in (200, 201):
            # Trigger HLX preview so the AEM CDN serves the file at /filename
            try:
                pv = session.post(
                    f"https://admin.hlx.page/preview/{ORG}/{SITE}/main/{filename}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30,
                )
                print(f"  [uploaded] {src_url} -> /{filename} (preview:{pv.status_code})")
            except Exception:
                print(f"  [uploaded] {src_url} -> /{filename} (preview:error)")
            _cache[src_url] = f"/{filename}"
            return f"/{filename}"
        print(f"  [warn] upload {up.status_code} for {src_url}", file=sys.stderr)
    except Exception as e:
        print(f"  [warn] upload failed {src_url}: {e}", file=sys.stderr)

    _cache[src_url] = src_url
    return src_url


def fix_html(html_content, token, session):
    def replace_src(m):
        src = m.group(1)
        if EXTERNAL_DOMAIN in src:
            new_src = upload_image(src, token, session)
            return m.group(0).replace(src, new_src)
        return m.group(0)

    return re.sub(r'src="([^"]+)"', replace_src, html_content)


def push_to_da(da_path, html_content, token, session):
    da_url = f"https://admin.da.live/source/{ORG}/{SITE}{da_path}.html"
    r = session.post(
        da_url,
        headers={"Authorization": f"Bearer {token}"},
        files={"data": ("page.html", html_content.encode(), "text/html")},
        timeout=30,
    )
    print(f"  [push] {da_path} -> {r.status_code}")
    from urllib.parse import quote
    encoded = "/".join(quote(seg, safe="") for seg in da_path.split("/"))
    pv = session.post(
        f"https://admin.hlx.page/preview/{ORG}/{SITE}/main{encoded}",
        headers={"Authorization": f"Bearer {token}"}, timeout=30,
    )
    lv = session.post(
        f"https://admin.hlx.page/live/{ORG}/{SITE}/main{encoded}",
        headers={"Authorization": f"Bearer {token}"}, timeout=30,
    )
    print(f"  [publish] preview:{pv.status_code} live:{lv.status_code}")
    return r.status_code


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <html-file> <da-path>")
        print(f"  Example: {sys.argv[0]} sharepoint-content/index.html /index")
        sys.exit(1)

    html_file = sys.argv[1]
    da_path = sys.argv[2].rstrip("/")

    token = get_token()
    session = requests.Session()

    with open(html_file, encoding="utf-8") as f:
        content = f.read()

    print(f"Fixing images in {html_file} ...")
    fixed = fix_html(content, token, session)
    push_to_da(da_path, fixed, token, session)
    print("Done.")


if __name__ == "__main__":
    main()
