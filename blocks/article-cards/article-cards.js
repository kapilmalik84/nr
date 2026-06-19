/**
 * article-cards — static authored card grid.
 * Delegates to Cards block's buildCard() for consistent markup.
 *
 * Authoring format (one row per article):
 *   | image | title (bold) / link / description paragraphs |
 */
import { buildCard } from '../cards/cards.js';
import { resolveImage } from '../../scripts/article-card.js';

export default function decorate(block) {
  const rows = [...block.children];
  block.classList.add('cards');

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  rows.forEach((row) => {
    const cols = [...row.children];
    const img = cols[0]?.querySelector('img');
    const strong = cols[1]?.querySelector('strong');
    const link = cols[1]?.querySelector('a');
    const description = [...(cols[1]?.querySelectorAll('p') || [])]
      .filter((p) => !p.querySelector('strong') && !p.querySelector('a') && p.textContent.trim())
      .map((p) => p.textContent.trim())
      .join(' ');

    if (img || strong) {
      grid.append(buildCard({
        image: img ? resolveImage(img.src, false) : '',
        titleText: strong?.textContent.trim() || '',
        path: link?.href || '#',
        description,
      }));
    }
  });

  block.textContent = '';
  block.append(grid);
}
