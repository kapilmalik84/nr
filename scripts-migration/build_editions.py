#!/usr/bin/env python3
"""Generate the 28 real /edition/* listing pages, backed by article-list + query-index.json."""
import json
import os
import re
import sys

import requests

ORG, SITE = "kapilmalik84", "nr"
TOKEN = json.load(open(os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")))["access_token"]

EDITIONS = []
for slug in open(os.path.join(os.path.dirname(__file__), "urls-editions.txt")):
    slug = slug.strip()
    if not slug:
        continue
    name = slug.split("/", 1)[1]
    m = re.match(r"(\d{4})-(media|stamp)-releases", name)
    if m:
        year, kind = m.groups()
        category = "stamps" if kind == "stamp" else ""
        title = f"{year} {'Stamp' if kind == 'stamp' else 'Media'} Releases"
        EDITIONS.append((slug, title, category, int(year)))
    elif name == "video-library":
        EDITIONS.append((slug, "Video Library", "video", None))
    elif name == "audio-library":
        EDITIONS.append((slug, "Audio Library", "audio", None))
    else:
        EDITIONS.append((slug, name.replace("-", " ").title(), "", None))


def build_html(title, category, year):
    rows = "<div><div>source</div><div>/query-index.json</div></div><div><div>limit</div><div>24</div></div>"
    if category:
        rows += f"<div><div>category</div><div>{category}</div></div>"
    if year:
        rows += f"<div><div>year</div><div>{year}</div></div>"
    return f"""<body><header></header><main>
<div>
<div class="breadcrumb">
<div><div><a href="/">Newsroom</a></div></div>
<div><div>{title}</div></div>
</div>
</div>
<div>
<h1>{title}</h1>
</div>
<div>
<div class="article-list">
{rows}
</div>
</div>
</main><footer></footer></body>"""


def main():
    session = requests.Session()
    for slug, title, category, year in EDITIONS:
        content = build_html(title, category, year)
        path = "/" + slug
        push = session.post(
            f"https://admin.da.live/source/{ORG}/{SITE}{path}.html",
            headers={"Authorization": f"Bearer {TOKEN}"},
            files={"data": ("page.html", content, "text/html")},
        )
        pv = session.post(
            f"https://admin.hlx.page/preview/{ORG}/{SITE}/main{path}",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        lv = session.post(
            f"https://admin.hlx.page/live/{ORG}/{SITE}/main{path}",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        print(f"{slug} -> push:{push.status_code} preview:{pv.status_code} live:{lv.status_code}")


if __name__ == "__main__":
    main()
