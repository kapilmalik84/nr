# Australia Post Newsroom

AEM Edge Delivery Services (EDS) implementation of the Australia Post Newsroom.

## Live site

- Preview: https://main--nr--kapilmalik84.aem.page/
- Production: *(to be configured)*

## Local development

```bash
npm install
npx @adobe/aem-cli up
```

Open http://localhost:3000 — the local server proxies from DA live content.

## Content

Content is authored in Document Authoring (DA) at https://da.live/#/kapilmalik84/nr

## Structure

| Path | Description |
|---|---|
| `/archive/news/{year}/` | News articles |
| `/section/stamps/{subsection}/{year}/` | Stamps articles |
| `/archive/video/` | Video articles |
| `/nav` | Site navigation (DA) |
| `/footer` | Site footer (DA) |

## Migration scripts

See `scripts-migration/` for tools used to migrate content from the legacy newsroom CMS.

---

## Blocks

### Block inventory

| # | Block | What it does | Used on |
|---|---|---|---|
| 1 | [article-header](#1-article-header) | Breadcrumb, category badges, H1, byline, reading time, share buttons, `NewsArticle` JSON-LD | Article pages |
| 2 | [breadcrumb](#2-breadcrumb) | Home → Section → Article trail; `BreadcrumbList` JSON-LD | Article & listing pages (auto-injected) |
| 3 | [cards](#3-cards) | Unified card display — static grid, dynamic article feed, paginated list, collection grid | All pages |
| 4 | [columns](#4-columns) | Side-by-side column layout | Article pages |
| 5 | [cta](#5-cta) | Newsletter call-to-action band with inline email form | Home page, section landing pages |
| 6 | [downloads](#6-downloads) | PDF file list + high-resolution photo grid | Press releases |
| 7 | [embed](#7-embed) | Responsive Vimeo / YouTube / generic iframe | Video article pages |
| 8 | [featured](#8-featured) | Hero-sized featured story: image panel, category badge, date, headline, excerpt, CTA | Home page |
| 9 | [footer](#9-footer) | Copyright, social links, Acknowledgement of Country | All pages (auto) |
| 10 | [fragment](#10-fragment) | Includes another DA page inline | Shared content |
| 11 | [gallery](#11-gallery) | Filterable image grid with hover download overlay; `photo-grid` variant for captioned photo cards | Media images, stamps photo pages |
| 12 | [header](#12-header) | Logo, primary nav with dropdowns, search | All pages (auto) |
| 13 | [hero](#13-hero) | Full-width banner with headline and CTA; `newsroom` variant = red brand section | Home page |
| 14 | [image-gallery](#14-image-gallery) | Slideshow carousel with optional captions | Stamps article pages |
| 15 | [media-contact](#15-media-contact) | Formatted press contact: name, mobile, email | Press release pages |
| 16 | [publications-promo](#16-publications-promo) | Sidebar widget linking to publications catalogue | Article pages |
| 17 | [quick-links](#17-quick-links) | Compact link panel; external links open in new tab | Article & section pages |
| 18 | [search](#18-search) | Full-text + faceted search over the query index | `/search` page |
| 19 | [subscribe-form](#19-subscribe-form) | Media sign-up form: name, email, privacy consent | `/signup` page |
| 20 | [video](#20-video) | Video listing page: featured panel + card grid with YouTube embed on click | `/video` page |

#### Backward-compatible wrappers

These block names still work in existing DA content — no re-authoring needed. Internally they delegate to the primary block listed.

| Block name | Delegates to | Notes |
|---|---|---|
| `article-cards` | [cards](#3-cards) (static) | Accepts 2-column rows: image \| bold title / link / desc |
| `article-list` | [cards](#3-cards) (list, dynamic) | Accepts `category`, `subcategory`, `year`, `limit`, `source` config |
| `featured-article` | *(own implementation)* | **Deprecated** — use `featured` for new content; migration needed in DA |
| `latest-articles` | [cards](#3-cards) (articles, dynamic) | Accepts `limit`, `filter`, `view-all`, `source` config |
| `photo-grid` | [gallery](#11-gallery) (photo-grid variant) | Accepts image \| caption / date / link rows |

---

### 1. article-header

Replaces the raw `h1` + date paragraph with a full article header. Reads `category`, `sub-category`, `publication-date`, and `author` from page metadata. Auto-removes the auto-injected breadcrumb block and builds its own. Injects a `NewsArticle` schema.org JSON-LD into `<head>`.

**Output includes:** breadcrumb trail · category + sub-category badges · H1 · author avatar (initials) · date + reading time · LinkedIn / X / copy-link share buttons.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue

**DA authoring table:**

| Article Header |
|---|
| *(leave empty — block reads all data from page metadata)* |

> **Tip for authors:** The block needs no content rows. All data comes from the `Metadata` block at the bottom of the page (`category`, `sub-category`, `publication-date`, `author`).

---

### 2. breadcrumb

Renders a `Home → Section → Article title` trail. Home is always prepended automatically. The final crumb is taken from the page `h1` (truncated at a word boundary to 50 characters). Injects a `BreadcrumbList` schema.org JSON-LD into `<head>` for Google rich breadcrumbs.

> **Note:** `scripts.js` auto-injects a `Breadcrumb` block on every page that doesn't already have one. On most pages you do **not** need to author a breadcrumb manually — it is generated from the URL path. Only add a manual breadcrumb block when you need to override a label or link in the trail.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/general/2024/christmas-stamp-collection

**DA authoring table (override mode):**

| Breadcrumb |
|---|
| Stamps |
| General |

Each row = one intermediate crumb between Home and the page title. Use plain text (the block infers the URL from the path) or author a hyperlink directly. Year folders and paths with no published DA page render as plain text spans.

---

### 3. cards

The unified card block. Covers four modes selected by the block name modifier and config rows:

| Variant | Block name in DA | Mode |
|---|---|---|
| Default (static) | `Cards` | Authored rows rendered as a card grid |
| Articles (dynamic) | `Cards (articles)` | Fetches from query index; category filter tabs; "View all" link |
| List (dynamic) | `Cards (list)` | Fetches from query index; paginated horizontal rows; facet filters |
| Collection | `Cards (collection)` | Stamp / year collection grid with optional theme filters |

#### Cards — static

Authored rows. Each row = one card. Column order: image · category · title (linked) · date · excerpt.

**DA authoring table:**

| Cards | | | | |
|---|---|---|---|---|
| (picture) | Community | [Article headline](/archive/news/2026/slug) | 15 January 2026 | Brief excerpt text |
| (picture) | News | [Another headline](/archive/news/2026/slug-2) | 10 January 2026 | Another excerpt |

---

#### Cards (articles) — dynamic

Fetches from a query index, sorted by date descending. Displays category filter tabs when articles span more than one category. "View all" renders a pill button below the grid.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Cards (articles) | |
|---|---|
| eyebrow | Latest news |
| title | Stay across the latest |
| source | /archive/news/query-index.json |
| limit | 6 |
| view-all | /archive/news/ |

**Config options:**

| Key | Default | Description |
|---|---|---|
| `source` | `/archive/news/query-index.json` | Query index URL to fetch articles from |
| `limit` | `6` | Number of cards to display |
| `filter` | *(none)* | Path prefix — only articles whose path starts with this value are shown (e.g. `/section/stamps/`) |
| `view-all` | *(none)* | URL for the "View all articles" pill button below the grid |
| `eyebrow` | *(none)* | Small uppercase label above the section title |
| `title` | *(none)* | Section heading (rendered as `h2`) |

---

#### Cards (list) — dynamic, paginated

Fetches from a query index and renders as paginated horizontal rows (12 per page). Use for archive and section listing pages.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/news/

**DA authoring table:**

| Cards (list) | |
|---|---|
| category | Community |
| year | 2025 |

| Cards (list) | |
|---|---|
| subcategory | Sport |
| source | /query-index.json |

**Config options:**

| Key | Default | Description |
|---|---|---|
| `source` | `/query-index.json` | Query index URL |
| `limit` | `12` | Cards per page |
| `category` | *(all)* | Match articles by category (case-insensitive) |
| `subcategory` | *(all)* | Match articles by subcategory |
| `year` | *(all)* | Match articles by publication year |
| `filter` | *(none)* | Path prefix filter (e.g. `/section/stamps/`) |

---

#### Cards (collection)

Stamp / year collection grid. Supports optional theme filter tabs.

**DA authoring table:**

| Cards (collection) | |
|---|---|
| title | 2025 Stamps |
| description | Browse the full collection |
| filters | Definitive, Commemorative, Special |
| (picture) | 2025 | [Australia Day stamp](/section/stamps/...) | 26 Jan 2025 | Commemorative |
| (picture) | 2025 | [Queen's Birthday](/section/stamps/...) | 9 Jun 2025 | Definitive |

Config rows (`title`, `description`, `filters`) must appear before card rows. The `filters` value is a comma-separated list of theme names. Card column order: image · year label · title (linked) · meta text · theme.

---

### 4. columns

Splits content into a side-by-side column layout. The number of cells in the first row sets the column count. Cells containing only an image get full-bleed image styling.

**DA authoring table (2 columns):**

| Columns | |
|---|---|
| Left column content | Right column content |

**DA authoring table (3 columns):**

| Columns | | |
|---|---|---|
| Column 1 | Column 2 | Column 3 |

---

### 5. cta

Newsletter call-to-action band. The `newsletter` variant (most common) renders heading + subtitle on the left and an inline email input on the right. On submit, the email address is appended to the configured signup URL as a query parameter.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| CTA (newsletter) |
|---|
| ## Get the Newsroom in your inbox |
| Media releases, community stories and corporate updates — delivered weekly. |
| [Subscribe](/signup) |

The heading becomes the CTA title. Paragraphs (excluding the link row) become subtitle text. The link sets the form action — the email will be appended as `?email=…`.

---

### 6. downloads

Renders a "Downloads" file list and/or a "High Resolution Photos" grid. Row type is detected automatically — a row with a picture is treated as a photo; a row with only a link is treated as a file download.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/news/2024/last-sending-dates-reminder

**DA authoring table:**

| Downloads | |
|---|---|
| [Media release — Last sending dates (PDF)](https://...file.pdf) | |
| (picture) | Caption: Australia Post delivery driver |
| (picture) | Caption: Parcel locker location |

Rows with a picture become the photo grid. Rows with only a link become the file list. The order of rows in the table determines order of display.

---

### 7. embed

Embeds a video in a responsive 16:9 iframe. Supports Vimeo (including private hash links), YouTube, and any generic URL.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/video/video-australia-post-expands-community-grants-program

**DA authoring table — Vimeo:**

| Embed |
|---|
| https://vimeo.com/123456789 |

**DA authoring table — Vimeo private + download link:**

| Embed |
|---|
| https://vimeo.com/123456789/abcdef012345 |
| [Download video](https://vimeo.com/123456789/abcdef012345) |

The second link row is optional — if present it renders as a "Download video" link below the player.

---

### 8. featured

Hero-sized featured story card. Image fills the left panel; a category badge, date, headline, excerpt, and CTA button fill the right panel. The entire card is a single focusable link.

The `newsroom` variant (`Featured (newsroom)`) renders a red full-bleed section with eyebrow, heading, and subtitle — used as the hero banner on the home page.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Featured | | |
|---|---|---|
| (picture) | Community | |
| ## [Article headline](/archive/news/2026/slug) | 07 May 2026 · 3 min read | |
| Four million prepaid Connection Postcards are being delivered… | Read the story | |

Three rows, two columns each. Row 1: image · category. Row 2: linked heading · date/meta. Row 3: excerpt · CTA button label.

> **Note:** `featured-article` is a deprecated two-column variant that still works in existing DA content. For new pages use `Featured`.

---

### 9. footer

Auto-loaded from the `/footer` DA page. No block table authoring needed on individual pages — edit `/footer` in DA to update the footer sitewide.

**DA page to edit:** https://da.live/#/kapilmalik84/nr/footer

The footer DA page should contain two paragraphs:
- One containing "Copyright" — becomes the legal row with social icons.
- One containing "Traditional Custodians" — becomes the Acknowledgement of Country row.

---

### 10. fragment

Includes the full rendered HTML of another DA page inline. Used internally by `header` and `footer`, and available for any shared content section (e.g. about blurbs, promo panels).

**DA authoring table:**

| Fragment |
|---|
| [/fragments/about-australia-post](/fragments/about-australia-post) |

The link href is the DA path to the page to include.

---

### 11. gallery

Filterable image grid with hover overlay showing caption and a download link. Supports category filter tabs. The `photo-grid` variant shows the same images as cards with visible captions and pagination instead of a download overlay.

**Example page (gallery):** https://main--nr--kapilmalik84.aem.page/photos

**DA authoring table — Gallery:**

| Gallery | | |
|---|---|---|
| title | Media Images | |
| description | Photos available for editorial use | |
| (picture) | Photo caption text | Community |
| (picture) | Another caption | Events |

Config rows (`title`, `description`) must appear before image rows. Image row columns: picture · caption · category (optional, used for filter tabs).

---

#### Gallery (photo-grid variant)

Paginated photo cards with visible metadata below each image (12 per page). Use for stamps and media library browsing.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/sport/

**DA authoring table:**

| Gallery (photo-grid) | |
|---|---|
| (picture) | Caption text for this photo |
| | 15 Jan 2025 \| Stamps |
| | [Article link](/section/stamps/sport/2025/article-slug) |
| (picture) | Another caption |
| | 10 Mar 2024 \| Sport |

Column 1 = picture. Column 2 = caption paragraph; optional date/category paragraph (`DD Mon YYYY | Category`); optional link shown as "Details".

> **Note:** The `Photo Grid` block name also works — it delegates to this variant for backward compatibility.

---

### 12. header

Auto-loaded from the `/nav` DA page. No block table authoring needed on individual pages — edit `/nav` in DA to update the navigation sitewide.

**DA page to edit:** https://da.live/#/kapilmalik84/nr/nav

The nav DA page structure:
- First link → logo href (homepage URL)
- Bulleted list → primary nav items; nested lists become dropdown menus
- `tel:` or `mailto:` links → rendered in the contact area

---

### 13. hero

Full-width banner. Two variants:

**Standard** — image applied as `background-image`; heading, body copy, and CTA button overlaid on top.

**Newsroom** (`Hero (newsroom)`) — red full-bleed section with eyebrow text, H1, and subtitle. No image. Used on the site home page.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table — standard:**

| Hero |
|---|
| (picture) |
| # Page heading |
| Subtitle paragraph. |
| [Explore news](/archive/news/) |

**DA authoring table — newsroom variant:**

| Hero (newsroom) |
|---|
| AUSTRALIA POST NEWSROOM |
| # News, media releases and stories |
| The latest announcements from Australia's largest delivery network. |

All content in a single column. First paragraph = eyebrow. H1 = headline. Remaining paragraphs = subtitle lines.

---

### 14. image-gallery

Slideshow carousel. Each row is one slide. Controls (‹ ›) and a `1 / N` counter are added automatically when there are two or more images. Single-image blocks render without controls. Keyboard navigable (ArrowLeft / ArrowRight).

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/general/2024/christmas-stamp-collection

**DA authoring table:**

| Image Gallery | |
|---|---|
| (picture) | First image caption |
| (picture) | Second image caption |
| (picture) | |

Column 1 = picture. Column 2 = caption text (optional).

---

### 15. media-contact

Renders a "Media contact:" heading followed by structured contact entries (name/role, mobile, email). Parses plain text rows from the block — no special markup needed.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/news/2024/last-sending-dates-reminder

**DA authoring table:**

| Media Contact |
|---|
| Tracy Hicks, General Manager Corporate Affairs, Australia Post |
| M: 0477 027 860 |
| E: tracy.hicks@auspost.com.au |

Each line is a separate row. For multiple contacts repeat the Name / M: / E: pattern. The "Media contact:" heading rows (`Media contact:`, `National Media Line`) are detected and skipped automatically.

---

### 16. publications-promo

Sidebar promotional widget for the Stamps & Collecting publications catalogue. Renders a book icon, heading, description, a navigation link list, and a CTA button.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/sport/2024/paralympian-commemorative-stamp

**DA authoring table:**

| Publications Promo | |
|---|---|
| | ### Stamps & Collecting |
| | Browse our publications catalogue. |
| | - [Sport stamps](/section/stamps/sport/) |
| | - [Royal stamps](/section/stamps/royal/) |
| | [View all publications](/editions/) |

Two columns. Column 1 is unused (leave empty). Column 2 contains the heading, description paragraph, bulleted nav link list, and a CTA link.

> **Tip:** This block is included on every article page. Consider converting it to a shared fragment auto-injected via `delayed.js` to avoid authors needing to add it manually.

---

### 17. quick-links

Compact link panel with an optional title. External links open in a new tab and display an `↗` indicator. Used in article page sidebars for related resources or quick navigation.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Quick Links |
|---|
| **Related links** |
| [About Australia Post](https://auspost.com.au/about-us) |
| [Media contacts](/signup) |
| [Photo library](/section/stamps/) |

First row = optional bold title. Remaining rows = one link per row. External URLs (different hostname) automatically open in a new tab.

---

### 18. search

Full-text + faceted search over the query index. Searches `title`, `description`, and `category` fields. Filter panel (content type, year, category) builds lazily on first interaction. Lives on the `/search` page.

**Example page:** https://main--nr--kapilmalik84.aem.page/search

**DA authoring table:**

| Search | |
|---|---|
| placeholder | Search the newsroom |
| source | /query-index.json |

Config rows are optional. The `placeholder` row sets the input placeholder text; `source` overrides the default query index.

---

### 19. subscribe-form

Media sign-up form with client-side validation. Collects first name, last name, email address, and privacy policy consent. Submission posts JSON to the configured backend endpoint.

**Example page:** https://main--nr--kapilmalik84.aem.page/signup

**DA authoring table:**

| Subscribe Form | |
|---|---|
| endpoint | https://api.example.com/subscribe |
| **Media sign up** | |
| Sign up to receive the latest news and media releases from Australia Post. | |

First config row = backend endpoint URL (required — without it the form shows an "unavailable" message). Second row = form heading. Third row = description paragraph.

---

### 20. video

Video listing page. First row is the featured panel (large thumbnail + play button). Remaining rows render as a 3-column card grid. Clicking a thumbnail replaces it with the YouTube embed (no third-party JS until interaction). Page header includes breadcrumb and H1 from the `title` config.

**Example page:** https://main--nr--kapilmalik84.aem.page/video

**DA authoring table:**

| Video | |
|---|---|
| title | Video |
| (picture or YouTube URL) | Australia Post Bluey launch — featured video title |
| (YouTube URL) | Behind the scenes at the sorting facility | 12 May 2026 | 3:45 |
| (YouTube URL) | Interview: CEO on the year ahead | 10 Apr 2026 | 5:12 |

Config row (`title`) appears first. For each video row: column 1 = thumbnail picture or YouTube link; column 2 = title; column 3 = date; column 4 = duration. The first non-config row becomes the featured panel.

---

## Shared utilities

| Script | Purpose |
|---|---|
| `scripts/query-index.js` | Module-level cached `getQueryIndex(source)` — deduplicates concurrent fetches so multiple blocks on one page share a single network request |
| `scripts/pagination.js` | `buildPagination(total, current, perPage, onChange, navClass)` — used by `cards (list)` and `gallery (photo-grid)` |
| `scripts/breadcrumb-builder.js` | `buildInlineBreadcrumb(crumbs, navClass)` — used by `gallery`, `video`, and `cards (collection)` |
| `scripts/article-card.js` | `resolveImage(url, isStamp)` + `renderCard(article)` — shared image fallback logic |

---

## Query index

The site uses a single query index at `/query-index.json` (configured in `helix-query.yaml`). All published pages under `/**` are indexed except `/nav`, `/footer`, `/head`, `/404`, and `/fragments/*`.

**Fields indexed:**

| Field | Source metadata |
|---|---|
| `title` | `og:title` |
| `description` | `description` |
| `image` | `og:image` |
| `date` | `publication-date` (input format `DD/MM/YYYY`, stored as Unix timestamp) |
| `category` | `category` |
| `subcategory` | `sub-category` |
| `lastModified` | Last modified time from the CDN |

The `cards`, `latest-articles`, `article-list`, and `search` blocks all read from this index at runtime.

---

## Article page metadata

Every article page must have a `Metadata` block at the bottom with these fields:

| Key | Format | Example |
|---|---|---|
| `category` | Free text | `Community` |
| `sub-category` | Free text | `Service Updates` |
| `publication-date` | `DD/MM/YYYY` | `07/05/2026` |
| `image` | Picture (og:image) | *(picture cell)* |
| `description` | Plain text (≤ 160 chars) | `Four million prepaid…` |

The `article-header` block reads `category`, `sub-category`, `publication-date`, and `author` from metadata. The query index reads all five fields.

> **Author tip:** Do not add `article-category` or `article-date` class paragraphs manually — they are migration artifacts and will be removed automatically by `scripts.js`.
