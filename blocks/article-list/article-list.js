import { createOptimizedPicture } from '../../scripts/aem.js';

const PAGE_SIZE = 12;

/**
 * Read block configuration from key-value rows.
 * @param {Element} block the block element
 * @returns {object} configuration key-value pairs
 */
function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cols = [...row.children];
    if (cols.length === 2) {
      const key = cols[0].textContent.trim().toLowerCase();
      const value = cols[1].textContent.trim();
      config[key] = value;
    }
  });
  return config;
}

/**
 * Fetch articles from the query index.
 * @param {string} source the JSON source path
 * @returns {Promise<Array>} array of article objects
 */
async function fetchArticles(source) {
  const resp = await fetch(source);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

/**
 * Filter and sort articles based on configuration.
 * @param {Array} articles raw article data
 * @param {object} config block configuration
 * @returns {Array} filtered and sorted articles
 */
function filterArticles(articles, config) {
  let filtered = [...articles];

  if (config.category) {
    const cat = config.category.toLowerCase();
    filtered = filtered.filter((a) => {
      const articleCat = (a.category || '').toLowerCase();
      return articleCat === cat || articleCat.includes(cat);
    });
  }

  if (config.subcategory) {
    const subcat = config.subcategory.toLowerCase();
    filtered = filtered.filter((a) => {
      const articleSubcat = (a['sub-category'] || a.subcategory || '').toLowerCase();
      return articleSubcat === subcat || articleSubcat.includes(subcat);
    });
  }

  // Sort
  const sort = config.sort || 'date-desc';
  if (sort === 'date-desc') {
    filtered.sort((a, b) => (b.date || 0) - (a.date || 0));
  } else if (sort === 'date-asc') {
    filtered.sort((a, b) => (a.date || 0) - (b.date || 0));
  }

  return filtered;
}

/**
 * Render a single article card.
 * @param {object} article article data from query-index
 * @returns {HTMLElement} card element
 */
function renderCard(article) {
  const card = document.createElement('li');
  card.className = 'card';

  // Image
  if (article.image) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'card-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.setAttribute('aria-hidden', 'true');
    link.tabIndex = -1;
    const picture = createOptimizedPicture(article.image, article.title || '', false, [{ width: '480' }]);
    link.append(picture);
    imageWrap.append(link);
    card.append(imageWrap);
  }

  // Text
  const text = document.createElement('div');
  text.className = 'card-text';

  // Date + category
  if (article.date) {
    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const d = new Date(article.date * 1000);
    meta.textContent = d.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (article.category) {
      meta.textContent += ` | ${article.category}`;
    }
    text.append(meta);
  }

  // Title
  const title = document.createElement('h4');
  title.className = 'card-title';
  const titleLink = document.createElement('a');
  titleLink.href = article.path;
  titleLink.textContent = article.title || '';
  title.append(titleLink);
  text.append(title);

  // Description
  if (article.description) {
    const desc = document.createElement('p');
    desc.className = 'card-excerpt';
    desc.textContent = article.description;
    text.append(desc);
  }

  // Read more
  const cta = document.createElement('a');
  cta.href = article.path;
  cta.className = 'card-cta';
  cta.textContent = 'Read more';
  text.append(cta);

  card.append(text);
  return card;
}

/**
 * Render pagination controls.
 * @param {number} currentPage current page number (0-based)
 * @param {number} totalPages total number of pages
 * @param {Function} onPageChange callback when page changes
 * @returns {HTMLElement} pagination element
 */
function renderPagination(currentPage, totalPages, onPageChange) {
  const nav = document.createElement('nav');
  nav.className = 'pagination';
  nav.setAttribute('aria-label', 'Article pagination');

  const info = document.createElement('p');
  info.className = 'pagination-info';

  for (let i = 0; i < totalPages; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i + 1;
    btn.className = i === currentPage ? 'active' : '';
    btn.addEventListener('click', () => onPageChange(i));
    nav.append(btn);
  }

  return nav;
}

/**
 * Article List block — configuration model that fetches from query-index.
 * Content model (Configuration):
 *   | Article List |
 *   | source | /query-index.json |
 *   | category | news |
 *   | limit | 12 |
 *   | sort | date-desc |
 *
 * @param {Element} block the article-list block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const source = config.source || '/query-index.json';
  const limit = parseInt(config.limit, 10) || PAGE_SIZE;

  block.textContent = '';
  block.classList.add('loading');

  const articles = await fetchArticles(source);
  const filtered = filterArticles(articles, config);

  block.classList.remove('loading');

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No articles found.';
    block.append(empty);
    return;
  }

  const totalPages = Math.ceil(filtered.length / limit);
  let currentPage = 0;

  const grid = document.createElement('ul');
  grid.className = 'cards-grid';

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'pagination-container';

  function renderPage(page) {
    currentPage = page;
    grid.replaceChildren();
    const start = page * limit;
    const pageArticles = filtered.slice(start, start + limit);
    pageArticles.forEach((article) => grid.append(renderCard(article)));

    paginationContainer.replaceChildren();
    if (totalPages > 1) {
      const resultInfo = document.createElement('p');
      resultInfo.className = 'result-info';
      resultInfo.textContent = `${start + 1}-${Math.min(start + limit, filtered.length)} of ${filtered.length} results`;
      paginationContainer.append(resultInfo);
      paginationContainer.append(renderPagination(currentPage, totalPages, renderPage));
    }

    // Scroll to top of block on page change
    if (page > 0) {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  renderPage(0);
  block.append(grid, paginationContainer);
}
