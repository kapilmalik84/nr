import { readBlockConfig } from '../../scripts/aem.js';
import { renderCard } from '../../scripts/article-card.js';
import { getQueryIndex } from '../../scripts/query-index.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const limit = parseInt(config.limit, 10) || 6;
  const filterPath = (config.filter || '').trim().replace(/\/?$/, '/');
  const viewAllHref = (config['view-all'] || '').trim();
  const source = config.source || '/query-index.json';

  block.textContent = '';

  try {
    let articles = await getQueryIndex(source);

    if (filterPath && filterPath !== '/') {
      articles = articles.filter((a) => (a.path || '').startsWith(filterPath));
    }

    articles = [...articles].sort((a, b) => (b.date || 0) - (a.date || 0));
    articles = articles.slice(0, limit);

    if (articles.length === 0) {
      block.textContent = 'No articles found.';
      return;
    }

    const grid = document.createElement('ul');
    grid.className = 'cards-grid';
    articles.forEach((a) => grid.append(renderCard(a)));
    block.append(grid);

    if (viewAllHref) {
      const footer = document.createElement('div');
      footer.className = 'latest-articles-footer';
      const viewAll = document.createElement('a');
      viewAll.href = viewAllHref;
      viewAll.className = 'latest-articles-view-all';
      viewAll.textContent = 'View all articles';
      footer.append(viewAll);
      block.append(footer);
    }
  } catch (e) {
    block.textContent = 'Unable to load articles.';
  }
}
