import { renderCard } from '../../scripts/article-card.js';

export default function decorate(block) {
  const rows = [...block.children];
  const grid = document.createElement('ul');
  grid.className = 'cards-grid';

  rows.forEach((row) => {
    const cols = [...row.children];
    const imgCol = cols[0];
    const textCol = cols[1];

    const img = imgCol?.querySelector('img');
    const strong = textCol?.querySelector('strong');
    const link = textCol?.querySelector('a');
    const description = [...(textCol?.querySelectorAll('p') || [])]
      .filter((p) => !p.querySelector('strong') && !p.querySelector('a') && p.textContent.trim())
      .map((p) => p.textContent.trim())
      .join(' ');

    const article = {
      image: img?.src || '',
      title: strong?.textContent.trim() || '',
      path: link?.href || '#',
      description,
    };

    if (article.title || article.image) grid.append(renderCard(article));
  });

  block.textContent = '';
  block.append(grid);
}
