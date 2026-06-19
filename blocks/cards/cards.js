import { createOptimizedPicture } from '../../scripts/aem.js';
import { resolveImage } from '../../scripts/article-card.js';
import { getQueryIndex } from '../../scripts/query-index.js';
import { buildPagination } from '../../scripts/pagination.js';
import { buildInlineBreadcrumb } from '../../scripts/breadcrumb-builder.js';

/**
 * Cards block — Australia Post Newsroom
 *
 * Variants (set via block name modifier):
 *   "Cards (articles)"   → .cards.articles  : dynamic 3-col grid + category filter tabs
 *   "Cards (list)"       → .cards.list      : dynamic paginated horizontal rows
 *   "Cards (collection)" → .cards.collection: stamps / year collection grids
 *   "Cards"              → default          : static authored grid
 *
 * Dynamic mode config rows (key | value):
 *   source      | /query-index.json
 *   limit       | 6
 *   filter      | /archive/news/           ← path-prefix filter (latest-articles compat)
 *   category    | Community                ← exact category match
 *   subcategory | Service Updates          ← exact subcategory match
 *   year        | 2025                     ← year filter (list variant)
 *   view-all    | /archive/news/           ← "View all" CTA link
 *   eyebrow     | Latest news
 *   title       | Stay across the latest
 */

const CONFIG_KEYS = new Set(['eyebrow', 'title', 'source', 'limit', 'filter', 'category', 'subcategory', 'year', 'view-all']);
const COLLECTION_KEYS = new Set(['eyebrow', 'title', 'description', 'filters']);
const CELL = ['image', 'category', 'title', 'date', 'excerpt'];
const DEFAULT_SOURCE = '/archive/news/query-index.json';
const PAGE_SIZE = 12;

/* ── Utilities ── */
export function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts) * 1000);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function isConfigRow(row) {
  if (row.children.length !== 2) return false;
  const key = row.children[0].textContent.trim().toLowerCase();
  return CONFIG_KEYS.has(key);
}

function readConfig(rows) {
  const cfg = {};
  rows.filter(isConfigRow).forEach((r) => {
    cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
  });
  return cfg;
}

/* ── Static card building (authored rows) ── */
export function readCard(row) {
  const cells = [...row.children];
  const data = {};
  cells.forEach((cell, i) => {
    const key = CELL[i];
    if (!key) return;
    if (key === 'image') data.picture = cell.querySelector('picture');
    else if (key === 'title') {
      data.titleEl = cell;
      data.link = cell.querySelector('a');
    } else {
      data[key] = cell.textContent.trim();
    }
  });
  return data;
}

export function buildCard(data, isList = false) {
  const article = document.createElement('article');
  article.className = 'card';
  if (data.category) article.dataset.category = data.category;

  const titleText = data.link?.textContent.trim()
    || data.titleEl?.textContent.trim()
    || data.titleText || '';

  const href = data.link?.getAttribute('href') || data.path || '#';
  const a = document.createElement('a');
  a.className = 'card-link';
  a.href = href;
  // aria-label must always include the article title so screen readers announce it
  a.setAttribute('aria-label', titleText || 'Read article');

  if (data.picture || data.image) {
    const media = document.createElement('div');
    media.className = 'card-media';

    let pic;
    if (data.picture) {
      const img = data.picture.querySelector('img');
      pic = img
        ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '600' }])
        : data.picture;
    } else {
      pic = createOptimizedPicture(data.image, titleText, false, [{ width: '600' }]);
    }
    const cardImg = pic.querySelector('img');
    if (cardImg) cardImg.addEventListener('error', () => { media.remove(); });
    media.append(pic);

    if (data.category) {
      const pill = document.createElement('span');
      pill.className = 'card-category';
      pill.setAttribute('aria-hidden', 'true');
      pill.textContent = data.category;
      media.append(pill);
    }
    a.append(media);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  if (data.date) {
    const meta = document.createElement('p');
    meta.className = 'card-date';
    meta.textContent = data.date;
    body.append(meta);
  }

  if (titleText) {
    const h3 = document.createElement('h3');
    h3.className = 'card-title';
    h3.textContent = titleText;
    body.append(h3);
  }

  const excerptText = data.excerpt || data.description || '';
  if (excerptText && !isList) {
    const p = document.createElement('p');
    p.className = 'card-excerpt';
    p.textContent = excerptText;
    body.append(p);
  }

  const cta = document.createElement('span');
  cta.className = 'card-cta';
  cta.setAttribute('aria-hidden', 'true');
  cta.innerHTML = 'Read more <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';
  body.append(cta);

  a.append(body);
  article.append(a);
  return article;
}

/* ── Collection variant (stamps / year grids) ── */
function readCollectionCard(row) {
  const cells = [...row.children];
  const pic = cells[0]?.querySelector('picture');
  const imgEl = pic?.querySelector('img');
  return {
    picture: pic,
    imgSrc: imgEl?.src || '',
    imgAlt: imgEl?.alt || '',
    yearLabel: cells[1]?.textContent.trim() || '',
    titleText: cells[2]?.textContent.trim() || '',
    link: cells[2]?.querySelector('a')?.getAttribute('href') || '#',
    meta: cells[3]?.textContent.trim() || '',
    theme: cells[4]?.textContent.trim() || '',
  };
}

function buildCollectionCard(data) {
  const article = document.createElement('article');
  article.className = 'collection-card';
  if (data.theme) article.dataset.theme = data.theme;

  const a = document.createElement('a');
  a.className = 'collection-card-link';
  a.href = data.link;

  const media = document.createElement('div');
  media.className = 'collection-card-media';

  if (data.picture) {
    const pic = data.imgSrc
      ? createOptimizedPicture(data.imgSrc, data.imgAlt, false, [{ width: '400' }])
      : data.picture;
    media.append(pic);
  }

  if (data.yearLabel) {
    const pill = document.createElement('span');
    pill.className = 'collection-year-pill';
    pill.textContent = data.yearLabel;
    media.append(pill);
  }

  const body = document.createElement('div');
  body.className = 'collection-card-body';

  if (data.titleText) {
    const title = document.createElement('p');
    title.className = 'collection-card-title';
    title.textContent = data.titleText;
    body.append(title);
  }

  if (data.meta) {
    const metaEl = document.createElement('p');
    metaEl.className = 'collection-card-meta';
    metaEl.textContent = data.meta;
    body.append(metaEl);
  }

  a.append(media, body);
  article.append(a);
  return article;
}

function buildTablist(names, gridId, onSelect) {
  const tablist = document.createElement('div');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter by theme');

  const els = names.map((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'collection-filter-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-controls', gridId);
    btn.id = `collection-tab-${i}`;
    btn.textContent = name;
    tablist.append(btn);
    return btn;
  });

  els.forEach((btn, i) => {
    btn.addEventListener('click', () => { onSelect(btn.textContent); btn.focus(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + els.length) % els.length;
      onSelect(els[next].textContent);
      els[next].focus();
    });
  });

  return { tablist, els };
}

function buildCollectionFilters(names, grid) {
  const gridId = grid.id || `collection-grid-${Math.random().toString(36).slice(2, 7)}`;
  grid.id = gridId;

  const first = names[0] || '';
  const { tablist, els } = buildTablist(names, gridId, (name) => {
    els.forEach((btn) => btn.setAttribute('aria-selected', String(btn.textContent === name)));
    [...grid.children].forEach((card) => {
      card.hidden = name !== first && card.dataset.theme !== name;
    });
  });

  tablist.className = 'collection-filters';
  return tablist;
}

function decorateCollection(block, cfg, cardRows) {
  const crumbs = [{ href: '/', text: 'Home' }, { text: cfg.title || '' }];
  const crumb = buildInlineBreadcrumb(crumbs, 'collection-breadcrumb');

  const h1 = document.createElement('h1');
  h1.className = 'collection-title';
  h1.textContent = cfg.title || '';

  const grid = document.createElement('div');
  grid.className = 'collection-grid';
  cardRows.forEach((row) => {
    grid.append(buildCollectionCard(readCollectionCard(row)));
  });

  const filterNames = cfg.filters
    ? cfg.filters.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  block.textContent = '';
  block.append(crumb, h1);

  if (cfg.description) {
    const desc = document.createElement('p');
    desc.className = 'collection-desc';
    desc.textContent = cfg.description;
    block.append(desc);
  }

  if (filterNames.length > 0) {
    block.append(buildCollectionFilters(filterNames, grid));
  }

  block.append(grid);
}

/* ── Category filter tablist (articles variant) ── */
function buildFilter(categories, grid, statusEl) {
  const gridId = grid.id || `cards-grid-${Math.random().toString(36).slice(2, 7)}`;
  grid.id = gridId;

  const tablist = document.createElement('div');
  tablist.className = 'cards-filter';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter articles by category');

  const tabs = ['All news', ...categories];
  const els = tabs.map((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'cards-tab';
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-controls', gridId);
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.textContent = name;
    tablist.append(btn);
    return btn;
  });

  function select(idx) {
    els.forEach((t, i) => {
      const on = i === idx;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const cat = tabs[idx];
    let shown = 0;
    [...grid.children].forEach((card) => {
      const match = idx === 0 || card.dataset.category === cat;
      card.hidden = !match;
      if (match) shown += 1;
    });
    if (statusEl) {
      statusEl.textContent = `Showing ${shown} article${shown === 1 ? '' : 's'}${idx === 0 ? '' : ` in ${cat}`}`;
    }
  }

  els.forEach((btn, i) => {
    btn.addEventListener('click', () => { select(i); els[i].focus(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + els.length) % els.length;
      select(next);
      els[next].focus();
    });
  });

  return tablist;
}

/* ── Section header + filter + grid (articles variant) ── */
function buildArticlesSection(block, cfg, categories, grid, viewAllHref) {
  const statusEl = document.createElement('p');
  statusEl.className = 'cards-status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');

  const header = document.createElement('div');
  header.className = 'cards-header';

  const headerText = document.createElement('div');
  headerText.className = 'cards-header-text';

  if (cfg.eyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'cards-eyebrow';
    eyebrow.textContent = cfg.eyebrow;
    headerText.append(eyebrow);
  }

  if (cfg.title) {
    const h2 = document.createElement('h2');
    h2.className = 'cards-section-title';
    h2.textContent = cfg.title;
    headerText.append(h2);
  }

  header.append(headerText);

  if (categories.length > 1) {
    header.append(buildFilter(categories, grid, statusEl));
  }

  block.append(header, statusEl, grid);

  if (viewAllHref) {
    const viewAllRow = document.createElement('div');
    viewAllRow.className = 'cards-view-all';
    const btn = document.createElement('a');
    btn.className = 'cards-view-all-btn';
    btn.href = viewAllHref;
    btn.textContent = 'View all articles';
    viewAllRow.append(btn);
    block.append(viewAllRow);
  }
}

/* ── Dynamic loading: articles variant ──
 * Supports: source, limit, filter (path prefix), view-all, eyebrow, title */
async function decorateDynamic(block, cfg) {
  const source = cfg.source || DEFAULT_SOURCE;
  const limit = parseInt(cfg.limit || '6', 10);
  const viewAllHref = cfg['view-all'];
  const filterPath = (cfg.filter || '').trim().replace(/\/?$/, '/');

  let data = [];
  try {
    let all = await getQueryIndex(source);

    if (filterPath && filterPath !== '/') {
      all = all.filter((a) => (a.path || '').startsWith(filterPath));
    }

    data = [...all]
      .filter((r) => r.path && r.title)
      .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
      .slice(0, limit);
  } catch (_) { /* network error — block stays empty */ }

  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  const categories = new Set();

  data.forEach((item) => {
    const cardData = {
      path: item.path,
      image: resolveImage(item.image, false),
      category: item.category || '',
      titleText: item.title,
      date: formatDate(item.date),
      description: item.description,
    };
    if (cardData.category) categories.add(cardData.category);
    grid.append(buildCard(cardData));
  });

  buildArticlesSection(block, cfg, [...categories], grid, viewAllHref);
}

/* ── Dynamic loading: list variant ──
 * Supports: source, limit (page size), category, subcategory, year, filter (path prefix) */
async function decorateDynamicList(block, cfg) {
  const source = cfg.source || DEFAULT_SOURCE;
  const category = (cfg.category || '').toLowerCase().trim();
  const subcategory = (cfg.subcategory || '').toLowerCase().trim();
  const year = cfg.year ? parseInt(cfg.year, 10) : null;
  const pageSize = parseInt(cfg.limit, 10) || PAGE_SIZE;
  const filterPath = (cfg.filter || '').trim().replace(/\/?$/, '/');
  const isStampPage = block.closest('main')?.dataset.template === 'stamps'
    || window.location.pathname.includes('/section/stamps');

  block.textContent = '';
  const loadingMsg = document.createElement('p');
  loadingMsg.setAttribute('aria-live', 'polite');
  loadingMsg.textContent = 'Loading articles…';
  block.append(loadingMsg);

  const NAV_HEIGHT = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '72',
    10,
  );

  try {
    let articles = await getQueryIndex(source);

    if (filterPath && filterPath !== '/') {
      articles = articles.filter((a) => (a.path || '').startsWith(filterPath));
    }

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
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    const resultCount = document.createElement('p');
    resultCount.className = 'article-list-count';

    block.append(resultCount);
    block.append(grid);

    const showPage = (page) => {
      const pageStart = (page - 1) * pageSize;
      const pageArticles = articles.slice(pageStart, pageStart + pageSize);

      resultCount.textContent = `${pageStart + 1}–${Math.min(pageStart + pageSize, articles.length)} of ${articles.length} results`;

      grid.innerHTML = '';
      pageArticles.forEach((article) => {
        const data = {
          path: article.path,
          image: resolveImage(article.image, isStampPage),
          category: article.category || '',
          titleText: article.title,
          date: formatDate(article.date),
          description: article.description,
        };
        grid.append(buildCard(data, true));
      });

      const existingNav = block.querySelector('.cards-pagination');
      if (existingNav) existingNav.remove();
      const paginationNav = buildPagination(articles.length, page, pageSize, showPage);
      if (paginationNav && totalPages > 1) block.append(paginationNav);

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

/* ── Main decorate ── */
export default async function decorate(block) {
  const rows = [...block.children];

  // Collection variant (stamps / year grids)
  if (block.classList.contains('collection')) {
    const isCollCfg = (r) => {
      if (r.children.length !== 2) return false;
      return COLLECTION_KEYS.has(r.children[0].textContent.trim().toLowerCase());
    };
    const cfg = {};
    rows.filter(isCollCfg).forEach((r) => {
      cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
    });
    decorateCollection(block, cfg, rows.filter((r) => !isCollCfg(r)));
    return;
  }

  const cfgRows = rows.filter(isConfigRow);
  const articleRows = rows.filter((r) => !isConfigRow(r));

  const isArticles = block.classList.contains('articles');
  const isList = block.classList.contains('list');

  // Dynamic list mode (article-list compat): config rows + list variant
  if (isList && cfgRows.length > 0) {
    const cfg = readConfig(rows);
    await decorateDynamicList(block, cfg);
    return;
  }

  // Dynamic articles mode: config rows + articles variant
  if (isArticles && cfgRows.length > 0) {
    const cfg = readConfig(rows);
    await decorateDynamic(block, cfg);
    return;
  }

  // Static mode: render authored rows
  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  const categories = new Set();

  articleRows.forEach((row) => {
    const pic = row.querySelector('picture > img');
    if (pic) {
      row.querySelector('picture').replaceWith(
        createOptimizedPicture(pic.src, pic.alt || '', false, [{ width: '600' }]),
      );
    }
    const data = readCard(row);
    if (data.category) categories.add(data.category);
    grid.append(buildCard(data, isList));
  });

  block.textContent = '';

  if (isArticles && categories.size > 1) {
    buildArticlesSection(block, {}, [...categories], grid, null);
  } else {
    block.append(grid);
  }
}
