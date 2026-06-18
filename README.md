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

### article-cards

Static card grid authored directly in DA. Each row is one card with two columns: image and text content.

**Columns per row:**

| Column | Content |
|---|---|
| 1 | Picture |
| 2 | `**Bold title**`, excerpt paragraph(s), link (becomes "Read more" CTA) |

Used on the home page for manually curated article highlights. For a dynamic feed use `latest-articles` instead.

---

### article-list

Paginated article listing pulled from `/query-index.json`. Used on section archive pages (e.g. `/archive/news/`, `/section/stamps/sport/`). Shows 12 cards per page with Previous/Next pagination.

**Config rows (key | value):**

| Key | Default | Description |
|---|---|---|
| `source` | `/query-index.json` | Query index URL |
| `category` | *(all)* | Filter by category (case-insensitive) |
| `subcategory` | *(all)* | Filter by subcategory |
| `year` | *(all)* | Filter by publication year |
| `limit` | `12` | Cards per page |

**Example DA block table:**

```
| Article List      |             |
|-------------------|-------------|
| category          | News        |
| year              | 2025        |
```

---

### breadcrumb

Renders a `Home → Section → Article title` trail. Always prepends Home. The last crumb is the page `h1` (truncated at a word boundary to 50 characters). Separator is `→`.

**How to author:** Add a Breadcrumb block with one row per intermediate crumb. Each row can be a plain text label or a hyperlink. Text-only labels are matched against the current URL to infer their href automatically. Labels matching `home` or `newsroom` are skipped (Home is always prepended).

**Example DA block table:**

```
| Breadcrumb  |
|-------------|
| Stamps      |
| Sport       |
```

Crumbs with no corresponding published page (e.g. year folders, `/section`, `/archive`) are rendered as non-linked spans.

---

### cards

General-purpose card grid from the AEM EDS boilerplate. Each row is one card. Any cell containing only a `<picture>` becomes the image column; anything else becomes the body.

Used for generic content grids where `article-cards` is not appropriate.

---

### columns

Splits content into side-by-side columns. The number of cells in the first row determines the column count. Cells containing only an image get the `columns-img-col` class for full-bleed image styling.

---

### downloads

Used on press release and media pages to list downloadable files and high-resolution photos. Each row is either:

- **File row** — a link to a PDF or other file (no image): renders as a "Downloads" list.
- **Photo row** — a picture element plus optional caption: renders in a "High Resolution Photos" grid where each photo links to the full-size file.

**Example DA block table:**

```
| Downloads                               |                   |
|-----------------------------------------|-------------------|
| [Media release PDF](/.../file.pdf)      |                   |
| (picture cell)                          | Caption text here |
```

---

### embed

Embeds third-party video players in a responsive 16:9 iframe. Supported platforms:

| Platform | URL format |
|---|---|
| Vimeo | `vimeo.com/{id}` or `vimeo.com/{id}/{hash}` (private) |
| YouTube | `youtube.com/watch?v={id}` or `youtu.be/{id}` |
| Other | Any URL — embedded as a generic iframe |

An optional second link in the block renders as a "Download video" link below the player.

**Example DA block table:**

```
| Embed                                           |
|-------------------------------------------------|
| https://vimeo.com/123456789                     |
| https://vimeo.com/123456789/abc123 (download)   |
```

---

### featured-article

Two-column editorial feature used on the home page. Left column: image. Right column: heading, description, CTA button.

**Columns:**

| Column | Content |
|---|---|
| 1 | Picture |
| 2 | Heading, body text, link (auto-styled as a button) |

---

### footer

Auto-loaded from the `/footer` DA fragment. Renders:

- **Legal row** — copyright text (left) and Facebook/LinkedIn social icons (right).
- **Acknowledgement of Country row** — artwork image and acknowledgement text.

Content is authored in the `/footer` DA page as plain paragraphs. The block identifies the paragraph containing "Copyright" for the legal row and the one containing "Traditional Custodians" for the acknowledgement row.

---

### fragment

Includes the HTML of another DA page inline. Used for shared content (nav, footer, reusable sections). The path to the fragment is the link text inside the block.

**Example DA block table:**

```
| Fragment                     |
|------------------------------|
| /fragments/about-auspost     |
```

---

### header

Auto-loaded from the `/nav` DA fragment. Features:

- Australia Post logo (SVG) linking to `/`
- Primary navigation with hover dropdowns on desktop, hamburger drawer on mobile
- Contact links (phone/email) extracted from the nav fragment
- Search icon linking to `/search`

The nav is authored as a bulleted list in the `/nav` DA page. Top-level items with sub-items become dropdown menus.

---

### hero

Full-width banner with background image, heading, body text, and an optional CTA button. The image is applied as a CSS `background-image`.

**Authored content:**

| Element | Role |
|---|---|
| Picture | Background image |
| `h1` or `h2` | Headline |
| Paragraphs | Body copy (any `<p>` without a picture or link) |
| Link | CTA button (auto-styled) |

---

### image-gallery

Slideshow carousel for multiple images with optional captions. Each row is one slide.

**Columns per row:**

| Column | Content |
|---|---|
| 1 | Picture |
| 2 | Caption text (optional) |

Rendered with Previous (`‹`) / Next (`›`) buttons and a `1 / N` counter. Controls are hidden when only one image is present.

---

### latest-articles

Dynamic article card grid fetched from `/query-index.json` at runtime. Sorted by publication date descending. Used on the home page and section landing pages for "Latest news" feeds.

**Config rows (key | value):**

| Key | Default | Description |
|---|---|---|
| `limit` | `6` | Number of cards to display |
| `filter` | *(none)* | Path prefix to restrict results (e.g. `/section/stamps/`) |
| `view-all` | *(none)* | URL for "View all articles" CTA button |
| `source` | `/query-index.json` | Custom query index URL |

**Example — home page latest news:**

```
| Latest Articles |                  |
|-----------------|------------------|
| limit           | 6                |
| view-all        | /archive/news/   |
```

**Example — stamps section feed:**

```
| Latest Articles |                      |
|-----------------|----------------------|
| limit           | 4                    |
| filter          | /section/stamps/     |
| view-all        | /section/stamps/     |
```

---

### media-contact

Renders a "Media contact:" section at the bottom of press releases. Parses contact details from plain text rows and formats them with name/role, mobile number, and email as a `mailto:` link.

**Authored as plain text rows — one row per line:**

```
| Media Contact                                 |
|-----------------------------------------------|
| Tracy Hicks, General Manager, Australia Post  |
| M: 0477 027 860                               |
| E: tracy.hicks@auspost.com.au                 |
```

Multiple contacts are supported by repeating the name/M/E pattern.

---

### photo-grid

Paginated photo card grid (12 per page). Used on stamps and media photo library pages. Each row is one photo item.

**Columns per row:**

| Column | Content |
|---|---|
| 1 | Picture |
| 2 | Caption paragraph; optional date/category paragraph in the format `DD Mon YYYY \| Category`; optional link |

---

### publications-promo

Sidebar promotional widget for the Stamps & Collecting publications catalogue. Renders a book icon badge, heading, description, navigation link list, and a CTA button.

**Columns:**

| Column | Content |
|---|---|
| 1 | *(unused — leave empty)* |
| 2 | `h2`/`h3` heading, description `<p>`, `<ul>` of nav links, CTA link paragraph |

Used on stamps section pages in the right sidebar.

---

### quick-links

Compact link panel with an optional title. External links open in a new tab with an `↗` indicator. Used on article pages and section landing pages for related resources.

**Authored content:**

| Element | Role |
|---|---|
| `**Bold text**` or heading | Panel title |
| Links (one per line) | List items |

---

### search

Full-text search over the query index. Searches title, description, and category fields. Results update as the user types (minimum 2 characters). Rendered on the `/search` page.

The placeholder text is taken from the block's text content (default: `Search the newsroom`).

---

### subscribe-form

Media sign-up form collecting first name, last name, email, and privacy policy acceptance. Includes client-side validation. Submission handling requires a backend endpoint to be configured.

**Authored content:**

| Element | Role |
|---|---|
| `**Bold text**` or heading | Form heading (default: "Media sign up") |
| Plain paragraph | Description text below the heading |

---

## Query index

The site uses a single query index at `/query-index.json` (configured in `helix-query.yaml`). All published pages under `/**` are indexed except `/nav`, `/footer`, `/head`, `/404`, and `/fragments/*`.

**Fields indexed:**

| Field | Source |
|---|---|
| `title` | `og:title` meta tag |
| `description` | `description` meta tag |
| `image` | `og:image` meta tag |
| `date` | `publication-date` meta tag (Unix timestamp, `DD/MM/YYYY` input) |
| `category` | `category` meta tag |
| `subcategory` | `sub-category` meta tag |
| `lastModified` | Last modified time from the CDN |

The `article-list`, `latest-articles`, and `search` blocks all read from this index at runtime.
