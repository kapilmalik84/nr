# Australia Post Newsroom — Redesign Brief for Claude Code

> **You have two write surfaces:**
> 1. **GitHub repo** — the AEM Edge Delivery Services (EDS) project (`/blocks`, `/styles`, `/scripts`).
> 2. **da.live** — Document Authoring. Pages and block content live as documents here, not in the repo.
>
> Code goes in GitHub. Content/structure goes in da.live. Never hard-code copy or images into block JS — read them from the authored DOM.

---

## 1. Goal

Rebuild the Newsroom (`https://main--nr--kapilmalik84.aem.page/`) in the modern auspost.com.au visual language **without leaving the EDS document/block model**. Author keeps editing in da.live documents; you change `/blocks/*` CSS+JS and `/styles/*` and refactor the authored documents' block tables.

## 2. Inputs (read these first)

All paths below are relative to this folder (`newsroom-redesign/`).

| File | What it gives you |
|---|---|
| `design/Newsroom Redesign.dc.html` | The full visual spec — analysis, tokens, components, **7 hi-fi page mockups** (home, article, listing, search, stamps, video, photos), block inventory, redlines. Open it; it is the source of truth for *look*. |
| `design/Newsroom Prototype.dc.html` | Interactive homepage — defines *behaviour*: category filter, hover lift, focus states, reduced-motion. |
| `design-tokens.css` | Literal CSS custom properties. Paste into `/styles/styles.css` `:root`. |
| `brand-guidelines.md` | Brand rules: color usage, type, logo lockup, tone, do/don't. |
| `block-map.md` | Every current EDS block → new component, the required action, the da.live table shape, the site IA, and the template→blocks map. |
| `blocks/cards/` | Working reference implementation (`cards.js` + `cards.css`) — pattern-match the other blocks from it. |

## 3. Order of work

1. **Tokens** — merge `design-tokens.css` into `/styles/styles.css`. Add `/styles/fonts.css` `@font-face` for AP Type (fallback Hanken Grotesk). Do not introduce any other font.
2. **Global blocks** — `header` (from the `/nav` document) and `footer` (from `/footer` document): wordmark lockup, search affordance, dark footer + Acknowledgement of Country strip.
3. **Per-block** — work `block-map.md` top to bottom. For each: update `/blocks/<name>/<name>.css` + `.js`, then update the authored block table in da.live to match the new variant/columns.
4. **Templates** — build all seven: home, news article, news/topic listing, search, stamps, video, photos. Match the mockups in §04 of `Newsroom Redesign.dc.html`.
5. **Acceptance** — run the checklist in §6.

> **Correct site IA (from the live nav):** Home · News · Stamps · Video · Photos, plus a "Search Newsroom" field. Media contacts (`+61 3 9106 6666`, `media@auspost.com.au`) go in a header utility row or footer. Do **not** reuse the placeholder "Latest / Media releases / Topics" nav.

## 4. EDS / da.live conventions (must follow)

- Blocks are authored as **tables** in da.live; first cell = block name → becomes the CSS class. Variants go in parentheses, e.g. `Cards (articles)` → `.cards.articles`.
- Section breaks = `---`. Page-level config via a **Metadata** table (title, description, template, og:image).
- Decoration happens in `/blocks/<name>/<name>.js` exporting `default function decorate(block)`. Keep DOM transforms minimal and CSS-first.
- **No SPA framework, no client router, no large dependencies.** EDS ships near-zero JS; preserve LHS/CWV. Lazy-load below-the-fold images (`loading="lazy"`), eager-load the LCP hero image.
- Use `createOptimizedPicture` (in `/scripts/aem.js`) for all authored images.
- Respect the three-phase loading (`eager` / `lazy` / `delayed`) already in `scripts.js`.

## 5. Hard requirements

- **Brand**: follow `handoff/brand-guidelines.md`. Primary red is `#DC1928`. Do not invent new accent colors.
- **Type scale / spacing / radius**: exactly as `design-tokens.css`. Cards radius 16px, hero card 24px, buttons/pills 999px.
- **Accessibility**: WCAG 2.1 AA. One `<h1>` per page; cards are `<article>` with a single wrapping `<a>`; category filter is a `role="tablist"` with arrow-key support + `aria-selected`; visible 3px focus ring; targets ≥44px; honour `prefers-reduced-motion`; alt text on every authored image.
- **No exposed edit chrome** in published output; remove the stray empty "Read more" block (replace with the `cta` newsletter block).

## 6. Acceptance checklist

- [ ] `:root` tokens present; no hard-coded hex outside the token set.
- [ ] Header, hero, article grid + filter, newsletter CTA, footer match the mockups at 1280px and reflow to 1-col ≤768px.
- [ ] All seven templates built and authored as da.live docs: home, article, listing, search, stamps, video, photos.
- [ ] Search filters the `query-index.json` client-side by content type + year + category; `?q=` seeds the field; result count announced via `aria-live`.
- [ ] Lighthouse: Performance ≥ 90, Accessibility = 100, no CLS from the overlapping featured card.
- [ ] Category filter works with mouse + keyboard; announces result count via `aria-live`.
- [ ] All images via `createOptimizedPicture`; hero LCP image eager, rest lazy.

## 7. Out of scope (ask before doing)

Executive-profile template, media-contact directory page, tag/author archives, and any IA changes beyond the seven templates above. Flag these and wait for direction.
