# Australia Post Newsroom — Brand Guidelines (implementation subset)

> Scope: the rules Claude Code needs to build on-brand. This is the **digital-product subset** derived from the auspost.com.au reference experience — not the full corporate brand book. Where the licensed AP brand system or AP Type is available, it supersedes the proxies noted here.

## 1. Logo & wordmark
- Header lockup: **P roundel** (red `#DC1928`) + "Australia Post" wordmark, then a hairline divider and the section label "Newsroom".
- Clear space around the roundel ≥ the roundel's radius. Minimum roundel size 28px.
- Never recolor, stretch, add effects, or place the red roundel on a low-contrast background. On red, use the white/reversed lockup.

## 2. Color
| Token | Hex | Use |
|---|---|---|
| Brand Red | `#DC1928` | Primary actions, hero fields, links, selected states. The signature. |
| Red Hover | `#B0140F` | Hover/pressed on red elements. |
| Red Tint | `#FCE9EA` | Quiet surfaces, icon chips. |
| Ink | `#15151A` | Headings, footer background. |
| Body | `#44444C` | Paragraph text. |
| Muted | `#8A8A92` | Metadata, captions. |
| Surface | `#F4F4F6` | Idle pills, alternating bands. |

**Rules**: Red is an accent and a hero field — not a full-page wash beyond the hero/CTA bands. One red focal element per viewport band. No gradients as brand color (gradients in this handoff are photo placeholders only — replace with real imagery). Do not introduce additional accent hues; categories are differentiated by photography + label, not by color-coding.

## 3. Typography
- One family: **AP Type** (licensed) with **Hanken Grotesk** as the open metric-compatible fallback. No secondary display face.
- Weights: 900 display, 800 headings, 700 titles/buttons, 600 meta/labels, 400 body.
- Headings: tight tracking (-2% to -3%), short measure. Body: 1.6 line-height, max ~68ch.
- Eyebrows/categories: 12.5px, 700, UPPERCASE, +10% tracking, red.

## 4. Shape & space
- Radius: cards 16px, hero/feature card 24px, buttons & pills fully rounded (999px), inputs 8px.
- Generous whitespace; section rhythm 80–96px vertical. Cards breathe (20–48px internal padding).
- Soft shadows only (see tokens) — no hard or colored drop shadows.

## 5. Components
- **Buttons**: primary = solid red pill, white text; secondary = red outline pill; tertiary = red text + right-arrow. Min height 44px.
- **Cards**: photo-led (16:9), category pill overlaid top-left, date → headline → excerpt → "Read more" arrow. Whole card is one link. Hover lifts -4px.
- **Hero**: full-bleed red field; the featured card overlaps it by -56px to tie sections together (the auspost.com.au signature move).
- **Footer**: dark (`#15151A`), 4 columns, social roundels, and a darker **Acknowledgement of Country** strip at the very bottom — always present, never abbreviated.

## 6. Imagery
- Real, warm, human AP photography: posties, customers, communities, parcels. 16:9 for cards, generous hero crops.
- Always author meaningful **alt text**. Decorative-only images get empty alt.
- No clip-art, no AI-obvious composites, no stock that conflicts with AP uniform/branding.

## 7. Tone of voice
- Clear, warm, plain Australian English. Active voice. Lead with the human impact, then the detail.
- Headlines are factual and specific ("…25 millionth Connection Postcard with Beyond Blue"), not punny clickbait.
- Media releases carry a small squared "Media release" tag; stories don't.

## 8. Accessibility (non-negotiable)
- WCAG 2.1 AA contrast (red on white and white on red both clear AA at the sizes used).
- Color is never the only signal — pair with text/label/icon.
- Visible focus ring (`--focus-ring`), keyboard operable, targets ≥44px, motion respects `prefers-reduced-motion`.

## 9. Do / Don't
- ✅ Let one confident red moment anchor each band. ❌ Don't scatter red across many small elements.
- ✅ Keep the single type family + scale. ❌ Don't add Inter/Roboto/Arial or a second display face.
- ✅ Replace gradient placeholders with real photography. ❌ Don't ship gradients as final brand surfaces.
- ✅ Keep the Acknowledgement of Country. ❌ Don't drop or truncate it.
