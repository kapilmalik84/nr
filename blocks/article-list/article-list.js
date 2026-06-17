import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

const PAGE_SIZE = 12;

function renderCard(article) {
  const card = document.createElement('li');
  card.className = 'card';

  if (article.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    link.append(createOptimizedPicture(article.image, article.title || '', false, [{ width: '480' }]));
    imgWrap.append(link);
    card.append(imgWrap);
  }

  const text = document.createElement('div');
  text.className = 'card-text';

  if (article.date) {
    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const d = new Date(article.date * 1000);
    meta.textContent = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    if (article.category) {
      meta.textContent += ` | ${article.category}`;
    }
    text.append(meta);
  }

  const title = document.createElement('h4');
  title.className = 'card-title';
  const titleLink = document.createElement('a');
  titleLink.href = article.path;
  titleLink.textContent = article.title || '';
  title.append(titleLink);
  text.append(title);

  if (article.description) {
    const desc = document.createElement('p');
    desc.className = 'card-excerpt';
    desc.textContent = article.description;
    text.append(desc);
  }

  const cta = document.createElement('a');
  cta.href = article.path;
  cta.className = 'card-cta';
  cta.textContent = 'Read more';
  text.append(cta);

  card.append(text);
  return card;
}

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

  block.textContent = 'Loading…';

  try {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error('Failed to fetch');
    const json = await resp.json();
    let articles = json.data || [];

    if (subcategory) {
      // subcategory config uses hyphens (e.g. "arts-and-culture"); index uses spaces
      const subNorm = subcategory.replace(/-/g, ' ');
      articles = articles.filter((a) => (a.subcategory || '').toLowerCase() === subNorm
        || (a.category || '').toLowerCase() === subNorm);
    } else if (category) {
      // Match top-level category; also catch sub-items whose category field equals it
      articles = articles.filter((a) => (a.category || '').toLowerCase() === category
        || (a.subcategory || '').toLowerCase() === category
        || (a.category || '').toLowerCase().startsWith(category));
    }

    if (year) {
      articles = articles.filter((a) => {
        if (!a.date) return false;
        return new Date(a.date * 1000).getFullYear() === year;
      });
    }

    articles.sort((a, b) => (b.date || 0) - (a.date || 0));

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

      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    showPage(1);
  } catch (e) {
    block.textContent = 'Unable to load articles.';
  }
}
