# Newsroom Redesign — Handoff for Claude Code

This folder is a **self-contained design handoff**. Everything Claude Code needs is inside it.

```
newsroom-redesign/
├─ CLAUDE.md            ← the brief: goal, order of work, EDS/da.live rules, acceptance
├─ brand-guidelines.md  ← color, type, logo, tone, do/don't
├─ design-tokens.css    ← literal CSS custom properties → paste into styles/styles.css
├─ block-map.md         ← current block → new component, da.live tables, IA, templates
├─ blocks/
│  └─ cards/            ← WORKING reference code (cards.js + cards.css)
└─ design/
   ├─ Newsroom Redesign.dc.html   ← visual spec + all 7 page mockups (open in a browser)
   ├─ Newsroom Prototype.dc.html  ← interactive homepage (behaviour reference)
   └─ support.js                  ← runtime needed to render the two files above
```

## How to hand this to Claude Code

Claude Code reads files from a repo/folder on disk — it can't import a hosted link. So:

1. **Download** this folder (the card in chat gives you a zip).
2. **Unzip it into your EDS repo**, e.g. at the repo root as `newsroom-redesign/`.
3. **Open Claude Code** in that repo.
4. **Paste the kickoff prompt** below.

> Tip: to *see* the designs, open `design/Newsroom Redesign.dc.html` in any browser (it loads `support.js` from the same folder). Claude Code itself only needs to **read the source** — all colors, sizes and spacing are literal values in the HTML.

## Kickoff prompt (paste into Claude Code)

```
Read newsroom-redesign/CLAUDE.md and follow it.

Context: this is the AEM Edge Delivery (EDS) Newsroom project. You have this
repo (code: /blocks, /styles, /scripts) and da.live (content/documents).

Do the work in CLAUDE.md's order:
1. Merge newsroom-redesign/design-tokens.css into styles/styles.css :root.
2. Add styles/fonts.css @font-face for AP Type (fallback Hanken Grotesk).
3. Refactor/build blocks per newsroom-redesign/block-map.md, using
   newsroom-redesign/blocks/cards as the reference implementation.
4. Build all 7 templates (home, article, listing, search, stamps, video, photos)
   to match the mockups in newsroom-redesign/design/Newsroom Redesign.dc.html.
5. Follow newsroom-redesign/brand-guidelines.md and the WCAG 2.1 AA + EDS
   performance rules in CLAUDE.md.

Start by summarising your plan and the file changes you'll make, then proceed
block by block. Show me diffs before large rewrites.
```

## Notes
- **AP Type font** and the **official AP brand book** are not included (licensing). Hanken Grotesk is the metric-compatible proxy; swap it in `styles/fonts.css`.
- The live domain couldn't be scraped during design — mockups are built from the homepage + search screenshots. If a page type (e.g. a stamp-issue detail) differs, send a screenshot and it can be added.
