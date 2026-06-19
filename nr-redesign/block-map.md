# EDS Block Map — current Newsroom → redesign

How to read: **Block** = current block name in the da.live document. **New** = redesigned component. **Action** = Rework (keep block, restyle) · Redesign (new variant/markup) · Replace (swap block) · New (didn't exist). **da.live table** = how the author structures it.

---

### header  →  Newsroom header + search · **Rework**
- Source: `/nav` document (not a page block).
- Add: roundel+wordmark lockup, "Newsroom" section label, search icon button.
- Code: `/blocks/header/header.{js,css}`. Keep block name.

### hero  →  Red hero + overlapping featured card · **Redesign**
- Variant: `Hero (newsroom)` → `.hero.newsroom`.
- Red full-bleed section; the **featured** block (below) is pulled up `-56px` to overlap.
- da.live table:
  | Hero (newsroom) |
  |---|
  | Eyebrow: AUSTRALIA POST NEWSROOM |
  | # News, media releases and stories from Australia Post |
  | Sub: The latest announcements, community impact… |

### featured (new) → Lead story card · **New**
- `Featured` block → `.featured`. 2-col grid (image / text), radius 24px.
- da.live table:
  | Featured |
  |---|---|
  | :image: lead.jpg | Category: Community |
  | # Headline + link | Date: 07 May 2026 |
  | Excerpt paragraph | CTA: Read the story |

### cards (Latest) → Article grid + category filter · **Redesign**
- Variant: `Cards (articles)` → `.cards.articles`. 3-col → 1-col responsive.
- `cards.js` decorates each row into an `<article><a>`, lifts category to an overlay pill, and builds the `role="tablist"` filter from the distinct categories.
- **Authoring contract — ONE row per article, cells in order:** `:image:` · Category · Headline(with link) · Date · Excerpt.
  | Cards (articles) | | | | |
  |---|---|---|---|---|
  | :image: a1.jpg | Community | # Headline + link | 07 May 2026 | Excerpt text |
  | :image: a2.jpg | People | # Headline + link | 06 May 2026 | Excerpt text |

### quick links → Topic / quick-links rail · **Rework**
- Convert chevron rows to the unified text-link (red label + right arrow). Share styling with footer link columns.

### (empty "Read more") → Newsletter CTA band · **Replace**
- Delete the broken empty block. Add `cta` block → `.cta.newsletter`: red band, heading, email field + dark Subscribe button.
- da.live table:
  | CTA (newsletter) |
  |---|
  | # Get the Newsroom in your inbox |
  | Sub: Media releases, community stories… |
  | Form: email → Subscribe |

### — (none) → Article header + share · **New**
- `Article-header` block → reads page Metadata (title, date, category, author) + social share row. Used on the article template.

### — (none) → Topic listing → **New**
- Listing template: hero title + sort/filter tabs + horizontal list rows + pagination. Built from `Cards (articles)` variant `.cards.list`.

### footer → Dark footer + Acknowledgement · **Rework**
- Source: `/footer` document. 4 columns + social roundels + Acknowledgement of Country strip (`--ap-ink` → darker `#0E0E12`).

### search → Faceted search results · **Redesign**
- Reads `query-index.json` (EDS content index). No backend.
- Facets: **Content type** (All / News / Stamps), **Year** (dropdown), **Category** (checkbox list with counts). All client-side filtering of the index rows; query from `?q=`.
- Result row = thumbnail + content-type/year eyebrow + title link + excerpt. Pagination 20/page.
- Block: `/blocks/search/search.{js,css}`.

### (Stamps page) → Stamps collection grid · **Redesign**
- `Cards (collection)` → `.cards.collection`. 4-col cards: year/theme image, year pill, title, issue count.
- Theme filter pills (By year / Arts & Culture / Natural World / Sport / Indigenous / Legends) reuse the `cards` tablist filter.

### (Video page) → Video gallery + player · **New**
- `Video` block → `.video`. Featured hero + 3-col grid; each card has play overlay + duration badge.
- Click lazy-embeds the player (YouTube/Brightcove iframe) — never eager-load embeds (CWV).

### (Photos page) → Downloadable media library · **New**
- `Gallery` block → `.gallery`. Press images in a grid; hover reveals a **download** button; category filter pills. Each item links to the full-res asset with attribution.

---

## Site IA (from the live nav)
Top-level nav: **Home · News · Stamps · Video · Photos** + a "Search Newsroom" field. Utility: media phone `+61 3 9106 6666` and `media@auspost.com.au` (place in a header utility row or a footer media-contact block).

## Templates (da.live pages, set via Metadata `template`)
| Page | Template | Blocks in order |
|---|---|---|
| Home | `home` | header · hero(newsroom) · featured · cards(articles)+filter · cta(newsletter) · footer |
| News article | `article` | header · article-header · (default content) · cards(articles, "Related") · footer |
| News / topic listing | `listing` | header · hero(title) · cards(list)+tabs · pagination · footer |
| Search | `search` | header · search(facets + results) · footer |
| Stamps | `stamps` | header · hero(title) · cards(collection)+theme tabs · footer |
| Video | `video` | header · hero(title) · video(featured + grid) · footer |
| Photos | `photos` | header · hero(title) · gallery(grid + filter) · footer |
