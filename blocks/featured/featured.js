import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rows = [...block.children];

  // Authoring table (3 rows × 2 cols):
  // row 0: [image]    | [category text]
  // row 1: [heading]  | [date / meta]
  // row 2: [excerpt]  | [CTA text]
  const imgCell = rows[0]?.children[0];
  const catCell = rows[0]?.children[1];
  const headCell = rows[1]?.children[0];
  const dateCell = rows[1]?.children[1];
  const excerptCell = rows[2]?.children[0];
  const ctaCell = rows[2]?.children[1];

  const headingEl = headCell?.querySelector('h1,h2,h3,h4');
  const articleLink = headingEl?.querySelector('a') || headCell?.querySelector('a');
  const articleHref = articleLink?.href || ctaCell?.querySelector('a')?.href || '#';

  // Optimise the featured image — eager (LCP-adjacent)
  const origImg = imgCell?.querySelector('img');
  if (origImg) {
    const opt = createOptimizedPicture(origImg.src, origImg.alt || '', true, [
      { media: '(min-width: 768px)', width: '800' },
      { width: '480' },
    ]);
    imgCell.querySelector('picture')?.replaceWith(opt);
  }

  block.textContent = '';

  // Outer wrapper as <article> with a single wrapping <a> (WCAG: one tab stop)
  const article = document.createElement('article');
  article.className = 'featured-card';

  const link = document.createElement('a');
  link.href = articleHref;
  link.className = 'featured-link';
  link.setAttribute('aria-label', headingEl?.textContent.trim() || 'Read featured story');

  // ── Image panel ──────────────────────────────────────────────────────────
  const imagePanel = document.createElement('div');
  imagePanel.className = 'featured-image';

  const pic = imgCell?.querySelector('picture');
  if (pic) imagePanel.append(pic);

  const category = catCell?.textContent.trim();
  if (category) {
    const badge = document.createElement('span');
    badge.className = 'featured-category';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = `Featured · ${category}`;
    imagePanel.append(badge);
  }

  // ── Text panel ───────────────────────────────────────────────────────────
  const textPanel = document.createElement('div');
  textPanel.className = 'featured-text';

  const dateText = dateCell?.textContent.trim();
  if (dateText) {
    const datePara = document.createElement('p');
    datePara.className = 'featured-date';
    datePara.textContent = dateText;
    textPanel.append(datePara);
  }

  if (headingEl) {
    // Strip inner <a> — the whole card is the link
    headingEl.textContent = headingEl.textContent.trim();
    headingEl.className = 'featured-headline';
    textPanel.append(headingEl);
  }

  const excerptP = excerptCell?.querySelector('p') || excerptCell;
  if (excerptP) {
    excerptP.className = 'featured-excerpt';
    textPanel.append(excerptP);
  }

  const ctaText = ctaCell?.textContent.trim() || 'Read the story';
  const cta = document.createElement('span');
  cta.className = 'featured-cta button';
  cta.setAttribute('aria-hidden', 'true');
  cta.textContent = ctaText;
  textPanel.append(cta);

  link.append(imagePanel, textPanel);
  article.append(link);
  block.append(article);
}
