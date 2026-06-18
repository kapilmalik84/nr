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

| # | Block | What it does | Used on |
|---|---|---|---|
| 1 | [article-cards](#1-article-cards) | Static curated card grid — image, title, excerpt, CTA | Home page |
| 2 | [article-list](#2-article-list) | Paginated query-index listing with category/year filters | Archive & section pages |
| 3 | [breadcrumb](#3-breadcrumb) | Home → Section → Article trail, last crumb from `h1` | Article pages |
| 4 | [cards](#4-cards) | General-purpose image + body card grid | Any page |
| 5 | [columns](#5-columns) | Side-by-side column layout | Article pages |
| 6 | [downloads](#6-downloads) | PDF file list + high-resolution photo grid | Press releases |
| 7 | [embed](#7-embed) | Responsive Vimeo / YouTube / generic iframe | Video article pages |
| 8 | [featured-article](#8-featured-article) | Two-column editorial feature: image left, text + CTA right | Home page |
| 9 | [footer](#9-footer) | Copyright, social links, Acknowledgement of Country | All pages (auto) |
| 10 | [fragment](#10-fragment) | Includes another DA page inline | Shared content |
| 11 | [header](#11-header) | Logo, primary nav with dropdowns, search | All pages (auto) |
| 12 | [hero](#12-hero) | Full-width background-image banner with headline and CTA | Home page |
| 13 | [image-gallery](#13-image-gallery) | Slideshow carousel with optional captions | Stamps article pages |
| 14 | [latest-articles](#14-latest-articles) | Dynamic card feed from query-index, sorted by date | Home, section landing pages |
| 15 | [media-contact](#15-media-contact) | Formatted press contact: name, mobile, email | Press release pages |
| 16 | [photo-grid](#16-photo-grid) | Paginated photo card grid with captions | Stamps photo pages |
| 17 | [publications-promo](#17-publications-promo) | Sidebar widget linking to publications catalogue | Stamps section pages |
| 18 | [quick-links](#18-quick-links) | Compact link panel; external links open in new tab | Article & section pages |
| 19 | [search](#19-search) | Full-text search over the query index | `/search` page |
| 20 | [subscribe-form](#20-subscribe-form) | Media sign-up form: name, email, privacy consent | `/signup` page |

---

### 1. article-cards

Static card grid authored directly in DA. Each row is one card. Use this for a manually curated highlight list. For an automated feed driven by publish date use [latest-articles](#14-latest-articles) instead.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Article Cards | | |
|---|---|---|
| (picture) | **Card title** | |
| | Excerpt text | |
| | [Read more](https://...) | |

Each row = one card. Column 1 = image. Column 2 = bold title, excerpt paragraph(s), and a link that becomes the "Read more" CTA.

---

### 2. article-list

Paginated article listing pulled from `/query-index.json` at runtime. Renders 12 cards per page with Previous / Next navigation. Filter rows narrow the results before display.

**Example page:** https://main--nr--kapilmalik84.aem.page/archive/news/

**DA authoring table:**

| Article List | |
|---|---|
| category | News |
| year | 2025 |

| Article List | |
|---|---|
| category | Stamps |
| subcategory | Sport |

**Config options:**

| Key | Default | Description |
|---|---|---|
| `category` | *(all)* | Match articles by category (case-insensitive) |
| `subcategory` | *(all)* | Match articles by subcategory |
| `year` | *(all)* | Match articles by publication year |
| `limit` | `12` | Cards per page |
| `source` | `/query-index.json` | Alternative query index URL |

---

### 3. breadcrumb

Renders a `Home → Section → Article title` trail. Home is always prepended automatically. The final crumb is taken from the page `h1` (truncated at a word boundary to 50 characters). Separator is `→`. Labels matching `home` or `newsroom` are ignored.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/general/2024/christmas-stamp-collection

**DA authoring table:**

| Breadcrumb |
|---|
| Stamps |
| General |

Each row = one intermediate crumb. Use a plain text label (the block matches it to the URL to infer the link) or author a hyperlink directly. Year folders and intermediate paths with no published DA page render as non-linked spans.

---

### 4. cards

General-purpose card grid from the AEM EDS boilerplate. Unlike `article-cards`, the column layout is inferred: any cell containing only a `<picture>` becomes the image; the remaining cell is the body.

**DA authoring table:**

| Cards | |
|---|---|
| (picture) | Body text or links |
| (picture) | Body text or links |

---

### 5. columns

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

### 8. featured-article

Two-column editorial feature: image fills the left, heading + body + CTA button fill the right. The link is automatically styled as a red button.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Featured Article | |
|---|---|
| (picture) | ## Heading text |
| | Body copy paragraph |
| | [Read the story](/archive/news/2026/article-slug) |

Single row, two columns. Column 1 = picture. Column 2 = heading, body text, and a link.

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

### 11. header

Auto-loaded from the `/nav` DA page. No block table authoring needed on individual pages — edit `/nav` in DA to update the navigation sitewide.

**DA page to edit:** https://da.live/#/kapilmalik84/nr/nav

The nav DA page structure:
- First link → logo href (homepage URL)
- Bulleted list → primary nav items; nested lists become dropdown menus
- `tel:` or `mailto:` links → rendered in the contact area

---

### 12. hero

Full-width banner. The image is applied as a CSS `background-image` for cover sizing. Heading, body copy, and a CTA button are overlaid on top.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table:**

| Hero |
|---|
| (picture) |
| # Australia Post Newsroom |
| Your source for the latest news, stories and media releases. |
| [Explore news](/archive/news/) |

All content in a single column. The block identifies the `h1`/`h2` as the headline, paragraphs without links as body copy, and the link as the CTA button.

---

### 13. image-gallery

Slideshow carousel. Each row is one slide. Controls (‹ ›) and a `1 / N` counter are added automatically when there are two or more images. Single-image blocks render without controls.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/general/2024/christmas-stamp-collection

**DA authoring table:**

| Image Gallery | |
|---|---|
| (picture) | First image caption |
| (picture) | Second image caption |
| (picture) | |

Column 1 = picture. Column 2 = caption text (optional).

---

### 14. latest-articles

Dynamic card grid fetched from `/query-index.json` at page load, sorted by publication date descending. Falls back to a newsroom default image for any article missing its own image.

**Example page:** https://main--nr--kapilmalik84.aem.page/

**DA authoring table — home page (latest news, all categories):**

| Latest Articles | |
|---|---|
| limit | 6 |
| view-all | /archive/news/ |

**DA authoring table — stamps section feed:**

| Latest Articles | |
|---|---|
| limit | 4 |
| filter | /section/stamps/ |
| view-all | /section/stamps/ |

**Config options:**

| Key | Default | Description |
|---|---|---|
| `limit` | `6` | Number of cards to show |
| `filter` | *(none)* | Path prefix — only articles whose path starts with this value are shown (e.g. `/section/stamps/`) |
| `view-all` | *(none)* | URL for the "View all articles" pill button below the grid |
| `source` | `/query-index.json` | Alternative query index URL |

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

### 16. photo-grid

Paginated photo card grid (12 per page). Used on stamps and media library pages where a large set of images needs to be browsed.

**Example page:** https://main--nr--kapilmalik84.aem.page/section/stamps/sport/

**DA authoring table:**

| Photo Grid | |
|---|---|
| (picture) | Caption text for this photo |
| | 15 Jan 2025 \| Stamps |
| | [Article link](/section/stamps/sport/2025/article-slug) |
| (picture) | Another caption |
| | 10 Mar 2024 \| Sport |

Column 1 = picture. Column 2 = caption paragraph; optional date/category paragraph (`DD Mon YYYY | Category`); optional link shown as "Details".

---

### 17. publications-promo

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

---

### 18. quick-links

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

### 19. search

Full-text search over `/query-index.json`. Searches across `title`, `description`, and `category` fields. Results update as the user types (minimum 2 characters). Lives on the `/search` page.

**Example page:** https://main--nr--kapilmalik84.aem.page/search

**DA authoring table:**

| Search |
|---|
| Search the newsroom |

The text content of the block is used as the input placeholder. Leave the cell empty to use the default `Search the newsroom` placeholder.

---

### 20. subscribe-form

Media sign-up form with client-side validation. Collects first name, last name, email address, and privacy policy consent. Submission handling requires a backend endpoint to be wired up.

**Example page:** https://main--nr--kapilmalik84.aem.page/signup

**DA authoring table:**

| Subscribe Form |
|---|
| **Media sign up** |
| Sign up to receive the latest news and media releases from Australia Post. |

First row = form heading (`**bold**` or heading level). Second row = description paragraph shown above the form fields.

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

The `article-list`, `latest-articles`, and `search` blocks all read from this index at runtime.
