#!/usr/bin/env python3
"""
Migrate newsroom.auspost.com.au content into the kapilmalik84/nr da.live site.

Usage:
  python3 migrate.py --list urls.txt --limit 10          # pilot run
  python3 migrate.py --list urls.txt --start 10 --limit 50
  python3 migrate.py --sitemap                            # pull all 842 from sitemap

Writes a JSONL log to migration-log.jsonl (one record per page) so runs are resumable
and reviewable.
"""
import argparse
import hashlib
import html
import json
import os
import posixpath
import re
import sys
import time
from urllib.parse import quote, urlparse

import requests

SITE_BASE = "https://newsroom.auspost.com.au"
ORG = "kapilmalik84"
SITE = "nr"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", ".hlx", ".da-token.json")
LOG_FILE = os.path.join(os.path.dirname(__file__), "migration-log.jsonl")
SCAN_FILE = os.path.join(os.path.dirname(__file__), "category-scan.json")

# In-process cache: external image URL -> DA relative path (avoids re-uploading same image)
_image_cache: dict[str, str] = {}
# Category scan lookup: slug/base -> {section, subsection, year, is_video}
_scan_lookup: dict[str, dict] = {}

ABOUT_FRAGMENT = "/fragments/about-australia-post"
DEFAULT_ARTICLE_IMAGE = "https://newsroom.auspost.com.au/uploads/defaults/Female-with-Express-Post-Parcel-optimised.jpg"
PUBLICATIONS_PROMO_BLOCK = """<div class="publications-promo">
<div>
<div></div>
<div>
<h3>Discover More Publications</h3>
<p>Stay informed with Australia Post's latest reports, community stories, and industry insights.</p>
<ul>
<li><a href="/section/news">News &amp; media</a></li>
<li><a href="/section/news/service-updates">Service updates</a></li>
<li><a href="https://auspost.com.au/about-us/news-media/publications">Publications</a></li>
</ul>
<p><a href="https://auspost.com.au/about-us/news-media/publications">Browse All Publications</a></p>
</div>
</div>
</div>"""


def get_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)["access_token"]


def _load_scan():
    global _scan_lookup
    if _scan_lookup or not os.path.exists(SCAN_FILE):
        return
    with open(SCAN_FILE) as f:
        data = json.load(f)
    for r in data:
        _scan_lookup[r["slug"]] = r
        _scan_lookup[r["base"]] = r  # fallback by last path segment


def _subsection_slug(name):
    return name.lower().replace(" ", "-").replace("&", "and").replace("/", "-").strip("-")


def compute_da_path(slug):
    """Compute the target DA path using year-based folder structure from category scan."""
    _load_scan()
    base = slug.rstrip("/").split("/")[-1]
    # AEM EDS cannot handle double-dash, leading-dash, or period in path segments
    # (double-dash → preview:404; period → preview:415 as AEM treats it as file extension)
    base = re.sub(r'-{2,}', '-', base).lstrip('-')
    base = base.replace('.', '-')
    info = _scan_lookup.get(slug) or _scan_lookup.get(base) or {}
    if not info:
        # Try original (un-normalised) base in case scan used the raw slug
        raw_base = slug.rstrip("/").split("/")[-1]
        info = _scan_lookup.get(raw_base) or {}
    section = info.get("section", "Unknown")
    subsection = info.get("subsection", "")
    year = info.get("year") or "unknown"
    if info.get("is_video") or section == "Video":
        return f"/archive/video/{base}"
    if section == "Stamps":
        sub_slug = _subsection_slug(subsection) if subsection else "general"
        return f"/section/stamps/{sub_slug}/{year}/{base}"
    return f"/archive/news/{year}/{base}"


def log(record):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")


# ---------- extraction ----------

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).strip()


def unescape(s):
    return html.unescape(s).strip()


def extract_breadcrumb(raw):
    m = re.search(r'<div id="breadcrumbs">.*?<ul>(.*?)</ul>', raw, re.S)
    if not m:
        return []
    items = re.findall(r'data-description="[^"]*"[^>]*>([^<]*)</a>', m.group(1))
    return [unescape(i) for i in items]


def extract_title(raw):
    m = re.search(r'<h1 id="ctl00_MainContent_headingTitle">(.*?)</h1>', raw, re.S)
    return unescape(strip_tags(m.group(1))) if m else None


def extract_date(raw):
    m = re.search(r'<p id="ctl00_MainContent_pDate"[^>]*>(.*?)</p>', raw, re.S)
    return unescape(strip_tags(m.group(1))) if m else None


def to_ddmmyyyy(date_text):
    """'06 August 2025' -> '06/08/2025'"""
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
    }
    m = re.match(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", date_text or "")
    if not m:
        return None
    day, month_name, year = m.groups()
    month = months.get(month_name.lower())
    if not month:
        return None
    return f"{int(day):02d}/{month}/{year}"


def extract_video_embed(raw):
    # Capture Vimeo video ID and optional privacy hash (?h=xxx or &h=xxx)
    m = re.search(r'<iframe[^>]*src="https://player\.vimeo\.com/video/(\d+)(?:[?&]h=([a-f0-9]+))?', raw)
    if m:
        video_id, hash_part = m.group(1), m.group(2)
        return f"https://vimeo.com/{video_id}/{hash_part}" if hash_part else f"https://vimeo.com/{video_id}"
    m = re.search(r'<iframe[^>]*src="https://www\.youtube\.com/embed/([a-zA-Z0-9_-]+)', raw)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"
    return None


def extract_balanced_div(raw, start_idx):
    """Given the index right after an opening <div ...> tag, scan forward and
    return the inner HTML up to (not including) the matching closing </div>,
    accounting for nested divs."""
    depth = 1
    pos = start_idx
    tag_re = re.compile(r"<div\b[^>]*>|</div>", re.I)
    while depth > 0:
        m = tag_re.search(raw, pos)
        if not m:
            return raw[start_idx:]
        if m.group(0).lower() == "</div>":
            depth -= 1
            if depth == 0:
                return raw[start_idx:m.start()]
        else:
            depth += 1
        pos = m.end()
    return raw[start_idx:]


def strip_wrapper_tags(html_fragment, tag):
    """Remove <tag ...> and </tag> but keep inner content."""
    html_fragment = re.sub(rf"<{tag}\b[^>]*>", "", html_fragment, flags=re.I)
    html_fragment = re.sub(rf"</{tag}>", "", html_fragment, flags=re.I)
    return html_fragment


def extract_inline_images(raw):
    """Return list of (src, alt) for <img> tags found in the article body."""
    m = re.search(r'<div class="article-body[^"]*">', raw)
    if not m:
        return []
    block = extract_balanced_div(raw, m.end())
    imgs = []
    for img_tag in re.finditer(r'<img\b([^>]*)>', block, re.I | re.S):
        attrs = img_tag.group(1)
        src_m = re.search(r'\bsrc="([^"]+)"', attrs)
        alt_m = re.search(r'\balt="([^"]*)"', attrs)
        if not src_m:
            continue
        src = src_m.group(1)
        if not src.startswith("http"):
            src = SITE_BASE + src
        alt = unescape(alt_m.group(1)) if alt_m else ""
        imgs.append((src, alt))
    return imgs


def extract_body_paragraphs(raw):
    m = re.search(r'<div class="article-body[^"]*">', raw)
    if not m:
        return [], []
    block = extract_balanced_div(raw, m.end())

    # Unwrap inline span wrappers (keep text content)
    block = strip_wrapper_tags(block, "span")

    # Strip table blocks (too complex to render in AEM EDS and not part of narrative)
    block = re.sub(r"<table\b.*?</table>", "", block, flags=re.S | re.I)

    # Extract <ul>/<ol> list blocks as whole items (preserves list structure in AEM)
    # Replace each list block with a sentinel so paragraph scanning stays in order
    list_blocks = {}
    sentinel_idx = [0]
    def _stash_list(m):
        key = f"\x00LIST{sentinel_idx[0]}\x00"
        list_blocks[key] = m.group(0)
        sentinel_idx[0] += 1
        return f"<p>{key}</p>"
    block = re.sub(r"<(ul|ol)\b[^>]*>.*?</\1>", _stash_list, block, flags=re.S | re.I)

    # Convert <div> paragraph wrappers to <p> so div-wrapped content is captured
    # (some CMS articles use <div> instead of <p> for body paragraphs)
    block = re.sub(r"<div\b[^>]*>", "<p>", block, flags=re.I)
    block = re.sub(r"</div>", "</p>", block, flags=re.I)

    paras = re.findall(r"<p[^>]*>(.*?)</p>", block, re.S)
    paras = [unescape(p) for p in paras]

    body, contact_lines, in_contact = [], [], False
    for p in paras:
        text = strip_tags(p)
        if not text or text in ("\xa0", "________________________________"):
            continue
        if text.strip().upper() == "ENDS":
            continue
        if text.lower().startswith("about australia post"):
            # boilerplate handled separately via the shared fragment
            in_contact = False
            continue
        # "Download video" / "Download" / "Watch video" links belong in the embed block
        if re.match(r'^(download|watch video|watch now)\b', text.strip(), re.I):
            continue
        if "media contact" in text.lower() or "national media line" in text.lower():
            in_contact = True
        if in_contact:
            # Split on <br> to preserve M:/E: as separate lines instead of concatenating
            sub_lines = re.split(r'<br\s*/?>', p, flags=re.I)
            if len(sub_lines) > 1:
                for sub in sub_lines:
                    sub_text = strip_tags(sub).strip()
                    if sub_text:
                        contact_lines.append(sub_text)
            else:
                contact_lines.append(text)
        else:
            # Restore list blocks to their original HTML
            restored = list_blocks.get(p.strip(), p)
            body.append(restored)
    return body, contact_lines


def extract_article_image(raw):
    """Return the article's primary thumbnail/hero image URL.
    Tries common CMS patterns, then restricts last-resort to the article body only
    to avoid picking up sidebar/promo images. Falls back to DEFAULT_ARTICLE_IMAGE."""
    patterns = [
        r'<div[^>]+id="[^"]*pnlArticleImage[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"',
        r'<div[^>]+id="[^"]*pnlImage[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"',
        r'<div[^>]+class="[^"]*article-image[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"',
        r'<div[^>]+class="[^"]*clsImageStandard[^"]*"[^>]*>.*?<img[^>]+src="([^"]+)"',
    ]
    for pat in patterns:
        m = re.search(pat, raw, re.S | re.I)
        if m:
            src = m.group(1)
            return src if src.startswith("http") else SITE_BASE + src
    # Last resort: first /uploads/ image within the article body only (not sidebar/promo)
    m_body = re.search(r'<div class="article-body[^"]*">(.*?)</div>\s*</div>', raw, re.S)
    if m_body:
        m = re.search(r'<img[^>]+src="(/uploads/[^"]+)"', m_body.group(1), re.I)
        if m:
            return SITE_BASE + m.group(1)
    return DEFAULT_ARTICLE_IMAGE


def extract_article_description(raw):
    """Return a short excerpt: first non-empty body paragraph, truncated to 160 chars."""
    m = re.search(r'<div class="article-body[^"]*">', raw)
    if not m:
        return None
    block = extract_balanced_div(raw, m.end())
    for p_match in re.finditer(r"<p[^>]*>(.*?)</p>", block, re.S):
        text = strip_tags(unescape(p_match.group(1))).strip()
        if text and len(text) > 20 and text.upper() != "ENDS":
            return text[:160] + ("…" if len(text) > 160 else "")
    return None


def extract_downloads(raw):
    m = re.search(r'<div class="link-list card downloads">(.*?)</div>\s*</div>', raw, re.S)
    if not m:
        return [], []
    block = m.group(1)
    pdfs = re.findall(r'<a href="([^"]+\.pdf)"[^>]*>([^<]*)</a>', block)
    photos = re.findall(r'<a href="([^"]+\.(?:jpg|jpeg|png))"[^>]*data-category="download\|img"[^>]*>([^<]*)</a>', block)

    def absolutize(u):
        return u if u.startswith("http") else SITE_BASE + u

    return (
        [(absolutize(url), unescape(label)) for url, label in pdfs],
        [(absolutize(url), unescape(label)) for url, label in photos],
    )


def extract_video_download_urls(raw):
    """Find download links for video articles (Vimeo CDN, direct mp4, etc).
    Returns list of (url, label) tuples, de-duplicated by URL."""
    results = []
    seen_urls = set()

    _download_re = re.compile(
        r'<a\b[^>]+href="([^"]+)"[^>]*>\s*((?:Download|Watch)[^<]*)\s*</a>',
        re.I | re.S,
    )

    body_m = re.search(r'<div class="article-body[^"]*">', raw)
    if body_m:
        block = extract_balanced_div(raw, body_m.end())
        for a_m in _download_re.finditer(block):
            url = a_m.group(1).strip()
            label = unescape(strip_tags(a_m.group(2))).strip() or "Download video"
            if not url.startswith("http"):
                url = SITE_BASE + url
            if url not in seen_urls:
                seen_urls.add(url)
                results.append((url, label))

    dl_section = re.search(r'<div class="link-list card downloads">(.*?)</div>\s*</div>', raw, re.S)
    if dl_section:
        for a_m in _download_re.finditer(dl_section.group(1)):
            url = a_m.group(1).strip()
            if not url.startswith("http"):
                url = SITE_BASE + url
            label = unescape(strip_tags(a_m.group(2))).strip() or "Download video"
            if url not in seen_urls:
                seen_urls.add(url)
                results.append((url, label))

    return results


def upload_pdf_to_da(src_url, token, session):
    """Download a PDF from newsroom.auspost.com.au and upload to DA under /media/downloads/.
    Returns the DA-relative path (e.g. /media/downloads/2024/filename.pdf)."""
    try:
        resp = session.get(src_url, timeout=60, headers={"User-Agent": "Mozilla/5.0"}, stream=True)
        resp.raise_for_status()
        pdf_bytes = resp.content
    except Exception as e:
        print(f"  [pdf-skip] could not download {src_url}: {e}", file=sys.stderr)
        return src_url  # fall back to external URL

    parsed = urlparse(src_url)
    # Extract year from URL path (e.g. /uploads/News/2024/...)
    year_m = re.search(r"/(\d{4})/", parsed.path)
    year = year_m.group(1) if year_m else "misc"
    filename = posixpath.basename(parsed.path)
    da_path = f"/media/downloads/{year}/{filename}"
    da_url = f"https://admin.da.live/source/{ORG}/{SITE}{da_path}"

    try:
        r = session.post(
            da_url,
            headers={"Authorization": f"Bearer {token}"},
            files={"data": (filename, pdf_bytes, "application/pdf")},
            timeout=60,
        )
        if r.status_code in (200, 201):
            print(f"  [pdf-ok] uploaded to DA: {da_path}")
            return da_path
        print(f"  [pdf-warn] DA upload {r.status_code} for {src_url}", file=sys.stderr)
    except Exception as e:
        print(f"  [pdf-warn] DA upload failed for {src_url}: {e}", file=sys.stderr)

    return src_url  # fall back to external URL


def upload_image_to_da(src_url, token, session):
    """Download image from src_url and upload to DA. Returns relative path for use in HTML.
    Results are cached so the same image is only uploaded once per run."""
    if src_url in _image_cache:
        return _image_cache[src_url]

    try:
        resp = session.get(src_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"}, stream=True)
        resp.raise_for_status()
        img_bytes = resp.content
    except Exception as e:
        print(f"  [img-skip] could not download {src_url}: {e}", file=sys.stderr)
        _image_cache[src_url] = src_url  # fall back to external URL
        return src_url

    # Derive a stable filename: short content hash + original extension
    ext = posixpath.splitext(urlparse(src_url).path)[1].lower() or ".jpg"
    content_hash = hashlib.sha1(img_bytes).hexdigest()[:16]
    filename = f"media_{content_hash}{ext}"
    da_media_url = f"https://admin.da.live/source/{ORG}/{SITE}/{filename}"

    try:
        content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0]
        r = session.post(
            da_media_url,
            headers={"Authorization": f"Bearer {token}"},
            files={"data": (filename, img_bytes, content_type)},
            timeout=30,
        )
        if r.status_code in (200, 201):
            # Trigger HLX preview so the AEM CDN caches and serves this media file
            try:
                session.post(
                    f"https://admin.hlx.page/preview/{ORG}/{SITE}/main/{filename}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30,
                )
            except Exception:
                pass
            relative = f"/{filename}"
            _image_cache[src_url] = relative
            return relative
        print(f"  [img-warn] DA upload {r.status_code} for {src_url}", file=sys.stderr)
    except Exception as e:
        print(f"  [img-warn] DA upload failed for {src_url}: {e}", file=sys.stderr)

    _image_cache[src_url] = src_url  # fall back to external URL
    return src_url


def extract_page(slug):
    url = f"{SITE_BASE}/{slug}"
    resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    raw = resp.text

    breadcrumb = extract_breadcrumb(raw)
    title = extract_title(raw)
    date_text = extract_date(raw)
    body, contact_lines = extract_body_paragraphs(raw)
    inline_images = extract_inline_images(raw)
    pdfs, photos = extract_downloads(raw)
    video_url = extract_video_embed(raw)
    video_download_urls = extract_video_download_urls(raw) if video_url else []
    article_image = extract_article_image(raw)
    description = extract_article_description(raw)

    category = breadcrumb[-1] if len(breadcrumb) >= 1 else "News"
    # breadcrumb's last item is usually the current page title itself (a span);
    # extract_breadcrumb only captures <a> links, so the last <a> is the real category.

    return {
        "slug": slug,
        "title": title,
        "date_text": date_text,
        "date_ddmmyyyy": to_ddmmyyyy(date_text),
        "category": category,
        "breadcrumb": breadcrumb,
        "body": body,
        "contact_lines": contact_lines,
        "inline_images": inline_images,
        "pdfs": pdfs,
        "photos": photos,
        "video_url": video_url,
        "video_download_urls": video_download_urls,
        "article_image": article_image,
        "description": description,
    }


# ---------- transform ----------

def build_html(page):
    parts = ["<body><header></header><main>"]

    bc_levels = page["breadcrumb"] or ["Newsroom"]
    bc_links = "".join(
        f"<div><div><a href=\"/\">{lvl}</a></div></div>" if i == 0 else f"<div><div>{lvl}</div></div>"
        for i, lvl in enumerate(bc_levels)
    )
    parts.append(f'<div><div class="breadcrumb">{bc_links}</div></div>')

    # Article body section (left column on desktop)
    body_html = ["<div>"]
    if page["category"]:
        body_html.append(f'<p class="article-category">{html.escape(page["category"])}</p>')
    body_html.append(f'<h1>{html.escape(page["title"] or page["slug"])}</h1>')
    if page["date_text"]:
        body_html.append(f'<p class="article-date">{html.escape(page["date_text"])}</p>')
    # Show featured image inline when there are no inline images in the article body
    if not page.get("inline_images") and page.get("article_image"):
        body_html.append(
            f'<picture><img src="{page["article_image"]}" '
            f'alt="{html.escape(page["title"] or "")}"></picture>'
        )
    for p in page["body"]:
        stripped = p.strip()
        if re.match(r"<(?:ul|ol)\b", stripped, re.I):
            body_html.append(stripped)  # list blocks don't need <p> wrapper
        else:
            body_html.append(f"<p>{p}</p>")
    # Inline images and video stay in the article body section (left column)
    for src, alt in page.get("inline_images", []):
        body_html.append(f'<picture><img src="{src}" alt="{html.escape(alt)}"></picture>')
    if page["video_url"]:
        dl_urls = page.get("video_download_urls", [])
        first_dl = dl_urls[0] if dl_urls else None
        dl_row = (
            f'<div><div><a href="{first_dl[0]}">{html.escape(first_dl[1])}</a></div></div>'
            if first_dl else ""
        )
        body_html.append(
            f'<div class="embed">'
            f'<div><div><a href="{page["video_url"]}">{page["video_url"]}</a></div></div>'
            f'{dl_row}'
            f'</div>'
        )
    body_html.append("</div>")
    parts.append("".join(body_html))

    # Sidebar section (right column on desktop) — media-contact + downloads + publications-promo
    sidebar_html = ["<div>"]
    if page["contact_lines"]:
        rows = "".join(f"<div><div>{html.escape(line)}</div></div>" for line in page["contact_lines"])
        sidebar_html.append(f'<div class="media-contact">{rows}</div>')
    if page["pdfs"] or page["photos"]:
        rows = ""
        for url, label in page["pdfs"]:
            rows += f'<div><div><a href="{url}">{html.escape(label or "PDF Version")}</a></div></div>'
        for url, label in page["photos"]:
            rows += f'<div><div><picture><img src="{url}"></picture></div><div>{html.escape(label)}</div></div>'
        sidebar_html.append(f'<div class="downloads">{rows}</div>')
    sidebar_html.append(PUBLICATIONS_PROMO_BLOCK)
    sidebar_html.append("</div>")
    parts.append("".join(sidebar_html))

    # subcategory: derive from breadcrumb depth
    # breadcrumb[0]=Newsroom, breadcrumb[1]=top-category, breadcrumb[2]=sub-category
    bc = page.get("breadcrumb", [])
    subcategory = bc[2] if len(bc) >= 3 else ""

    parts.append(
        f'<div><div class="fragment"><div><div><a href="{ABOUT_FRAGMENT}">{ABOUT_FRAGMENT}</a></div></div></div></div>'
    )

    meta_rows = f'<div><div>category</div><div>{html.escape(page["category"] or "News")}</div></div>'
    if subcategory:
        meta_rows += f'<div><div>sub-category</div><div>{html.escape(subcategory)}</div></div>'
    if page["date_ddmmyyyy"]:
        meta_rows += f'<div><div>publication-date</div><div>{page["date_ddmmyyyy"]}</div></div>'
    img_url = page.get("article_image") or DEFAULT_ARTICLE_IMAGE
    meta_rows += f'<div><div>image</div><div><picture><img src="{img_url}"></picture></div></div>'
    if page.get("description"):
        meta_rows += f'<div><div>description</div><div>{html.escape(page["description"])}</div></div>'
    parts.append(f'<div><div class="metadata">{meta_rows}</div></div>')

    parts.append("</main><footer></footer></body>")
    return "\n".join(parts)


# ---------- push ----------

def post_with_retry(session, url, **kwargs):
    r = None
    for attempt in range(5):
        r = session.post(url, timeout=30, **kwargs)
        if r.status_code != 429:
            return r
        wait = float(r.headers.get("Retry-After", 5 * (attempt + 1)))
        print(f"  429 rate-limited on {url}, waiting {wait}s (attempt {attempt + 1})", file=sys.stderr)
        time.sleep(wait)
    return r


def push_and_publish(slug, html_content, token, session):
    da_path = compute_da_path(slug)
    encoded_path = "/".join(quote(seg, safe="") for seg in da_path.split("/"))

    da_url = f"https://admin.da.live/source/{ORG}/{SITE}{da_path}.html"
    files = {"data": ("page.html", html_content, "text/html")}
    r = post_with_retry(session, da_url, headers={"Authorization": f"Bearer {token}"}, files=files)
    push_status = r.status_code

    pv = post_with_retry(
        session, f"https://admin.hlx.page/preview/{ORG}/{SITE}/main{encoded_path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    lv = post_with_retry(
        session, f"https://admin.hlx.page/live/{ORG}/{SITE}/main{encoded_path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    return push_status, pv.status_code, lv.status_code, da_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", help="file with one slug/URL per line")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--dry-run", action="store_true", help="extract + transform only, no push")
    ap.add_argument("--sleep", type=float, default=1.5, help="seconds between pages (rate-limit safety)")
    args = ap.parse_args()

    with open(args.list) as f:
        slugs = [line.strip().lstrip("/") for line in f if line.strip()]
    slugs = slugs[args.start:args.start + args.limit]

    token = None if args.dry_run else get_token()
    session = requests.Session()

    ok, failed = 0, 0
    for i, slug in enumerate(slugs):
        try:
            page = extract_page(slug)
            # Upload PDFs to DA (skipped in dry-run — external URLs used as fallback)
            if not args.dry_run and page["pdfs"]:
                page["pdfs"] = [
                    (upload_pdf_to_da(url, token, session), label)
                    for url, label in page["pdfs"]
                ]
            content = build_html(page)
            if args.dry_run:
                print(f"[{i}] OK (dry-run) {slug} -> title={page['title']!r} category={page['category']!r} date={page['date_ddmmyyyy']!r} body_paras={len(page['body'])} pdfs={len(page['pdfs'])} photos={len(page['photos'])} video={bool(page['video_url'])}")
                log({"slug": slug, "status": "dry-run-ok", "page": page})
            else:
                push, pv, lv, da_path = push_and_publish(slug, content, token, session)
                print(f"[{i}] {slug} -> {da_path}  push:{push} preview:{pv} live:{lv}")
                log({"slug": slug, "da_path": da_path, "status": "pushed", "push": push, "preview": pv, "live": lv})
            ok += 1
        except Exception as e:
            print(f"[{i}] FAILED {slug}: {e}", file=sys.stderr)
            log({"slug": slug, "status": "error", "error": str(e)})
            failed += 1
        time.sleep(args.sleep)

    print(f"\nDone. ok={ok} failed={failed}")


if __name__ == "__main__":
    main()
