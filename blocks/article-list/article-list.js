import { readBlockConfig } from '../../scripts/aem.js';
import { renderCard } from '../../scripts/article-card.js';
import { getQueryIndex } from '../../scripts/query-index.js';

const PAGE_SIZE = 12;

function renderPagination(totalPages, currentPage, onPageChange) {
  const nav = document.createElement('nav');
  nav.className = 'article-list-pagination';
  nav.setAttribute('aria-label', 'Page navigation');

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  if (currentPage > 1) {
    const prev = document.createElement('button');
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Previous page');
    prev.addEventListener('click', () => onPageChange(currentPage - 1));
    nav.append(prev);
  }

  for (let i = start; i <= end; i += 1) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === currentPage ? 'active' : '';
    btn.setAttribute('aria-label', `Page ${i}`);
    if (i === currentPage) btn.setAttribute('aria-current', 'page');
    btn.addEventListener('click', () => onPageChange(i));
    nav.append(btn);
  }

  if (currentPage < totalPages) {
    const next = document.createElement('button');
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next page');
    next.addEventListener('click', () => onPageChange(currentPage + 1));
    nav.append(next);
  }

  return nav;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const source = config.source || '/query-index.json';
  const category = (config.category || '').toLowerCase().trim();
  const subcategory = (config.subcategory || '').toLowerCase().trim();
  const year = config.year ? parseInt(config.year, 10) : null;
  const pageSize = parseInt(config.limit, 10) || PAGE_SIZE;

  block.textContent = '';
  const loadingMsg = document.createElement('p');
  loadingMsg.setAttribute('aria-live', 'polite');
  loadingMsg.textContent = 'Loading articles…';
  block.append(loadingMsg);

  const NAV_HEIGHT = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '72', 10);

  try {
    let articles = await getQueryIndex(source);

    if (subcategory) {
      const subNorm = subcategory.replace(/-/g, ' ');
      articles = articles.filter((a) => (a.subcategory || '').toLowerCase() === subNorm
        || (a.category || '').toLowerCase() === subNorm);
    } else if (category) {
      articles = articles.filter((a) => (a.category || '').toLowerCase() === category
        || (a.subcategory || '').toLowerCase() === category);
    }

    if (year) {
      articles = articles.filter((a) => {
        if (!a.date) return false;
        return new Date(a.date * 1000).getFullYear() === year;
      });
    }

    articles = [...articles].sort((a, b) => (b.date || 0) - (a.date || 0));

    loadingMsg.remove();
    block.textContent = '';

    if (articles.length === 0) {
      block.textContent = 'No articles found.';
      return;
    }

    const totalPages = Math.ceil(articles.length / pageSize);
    const grid = document.createElement('ul');
    grid.className = 'cards-grid';
    const resultCount = document.createElement('p');
    resultCount.className = 'article-list-count';

    block.append(resultCount);
    block.append(grid);

    const showPage = (page) => {
      const start = (page - 1) * pageSize;
      const pageArticles = articles.slice(start, start + pageSize);

      resultCount.textContent = `${start + 1}-${Math.min(start + pageSize, articles.length)} of ${articles.length} results.`;

      grid.innerHTML = '';
      pageArticles.forEach((article) => grid.append(renderCard(article)));

      const existingNav = block.querySelector('.article-list-pagination');
      if (existingNav) existingNav.remove();
      if (totalPages > 1) {
        block.append(renderPagination(totalPages, page, showPage));
      }

      // Move focus to result count so screen readers announce page change
      resultCount.tabIndex = -1;
      resultCount.focus();

      const blockTop = block.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 16;
      window.scrollTo({ top: Math.max(0, blockTop), behavior: 'smooth' });
    };

    showPage(1);
  } catch (e) {
    block.textContent = 'Unable to load articles.';
  }
}
