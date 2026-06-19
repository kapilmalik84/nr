import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards block — Australia Post Newsroom
 *
 * Variants:
 *   "Cards (articles)" → .cards.articles  : 3-col dynamic grid + category filter
 *   "Cards (list)"     → .cards.list      : horizontal list rows (listing/topic pages)
 *   "Cards"            → default          : plain authored grid, no filter
 *
 * Dynamic mode (articles variant): author key→value config rows, no article rows.
 *   | Cards (articles) | |
 *   |---|---|
 *   | eyebrow  | Latest news            |
 *   | title    | Stay across the latest |
 *   | source   | /archive/news/query-index.json |
 *   | limit    | 6                      |
 *   | view-all | /archive/news/         |
 *
 * Static mode: one row per article, cells in order:
 *   | :image: | Category | Headline (with link) | Date | Excerpt |
 */

const CONFIG_KEYS = new Set(['eyebrow', 'title', 'source', 'limit', 'view-all']);
const COLLECTION_KEYS = new Set(['eyebrow', 'title', 'description', 'filters']);
const CELL = ['image', 'category', 'title', 'date', 'excerpt'];
const DEFAULT_SOURCE = '/archive/news/query-index.json';

/* ── Utilities ── */
function formatDate(ts) {
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

/* ── Static card building (authored rows) ── */
function readCard(row) {
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

function buildCard(data, isList = false) {
  const article = document.createElement('article');
  article.className = 'card';
  if (data.category) article.dataset.category = data.category;

  const href = data.link?.getAttribute('href') || data.path || '#';
  const a = document.createElement('a');
  a.className = 'card-link';
  a.href = href;
  a.setAttribute('aria-label', data.title?.textContent?.trim() || data.titleText || 'Read article');

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
      pic = createOptimizedPicture(data.image, data.titleText || '', false, [{ width: '600' }]);
    }
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

  const titleText = data.link?.textContent.trim()
    || data.titleEl?.textContent.trim()
    || data.titleText || '';
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

function buildCollectionFilters(names, grid) {
  const tablist = document.createElement('div');
  tablist.className = 'collection-filters';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter by theme');

  const first = names[0] || '';
  const els = names.map((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'collection-filter-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.textContent = name;
    tablist.append(btn);
    return btn;
  });

  function selectFilter(name) {
    els.forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.textContent === name));
    });
    [...grid.children].forEach((card) => {
      card.hidden = name !== first && card.dataset.theme !== name;
    });
  }

  els.forEach((btn, i) => {
    btn.addEventListener('click', () => { selectFilter(btn.textContent); btn.focus(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + els.length) % els.length;
      selectFilter(els[next].textContent);
      els[next].focus();
    });
  });

  return tablist;
}

function decorateCollection(block, cfg, cardRows) {
  const crumb = document.createElement('nav');
  crumb.className = 'collection-breadcrumb';
  crumb.setAttribute('aria-label', 'Breadcrumb');
  const homeA = document.createElement('a');
  homeA.href = '/';
  homeA.textContent = 'Home';
  const sep = document.createElement('span');
  sep.className = 'collection-crumb-sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '›';
  const curr = document.createElement('span');
  curr.textContent = cfg.title || '';
  crumb.append(homeA, sep, curr);

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

/* ── Category filter (tablist) ── */
function buildFilter(categories, grid, statusEl) {
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
    if (statusEl) statusEl.textContent = `Showing ${shown} article${shown === 1 ? '' : 's'}${idx === 0 ? '' : ` in ${cat}`}`;
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

/* ── Section header + filter + grid assembly (articles variant) ── */
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

/* ── Dynamic loading from query-index ── */
async function decorateDynamic(block, cfg) {
  const source = cfg.source || DEFAULT_SOURCE;
  const limit = parseInt(cfg.limit || '6', 10);
  const viewAllHref = cfg['view-all'];

  let data = [];
  try {
    const resp = await fetch(source);
    if (resp.ok) {
      const json = await resp.json();
      data = (json.data || [])
        .filter((r) => r.path && r.title)
        .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
        .slice(0, limit);
    }
  } catch (_) { /* network error — block stays empty */ }

  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  const categories = new Set();

  data.forEach((item) => {
    const cardData = {
      path: item.path,
      image: item.image,
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

  // Detect dynamic (config) vs static (article rows) mode
  const cfgRows = rows.filter(isConfigRow);
  const articleRows = rows.filter((r) => !isConfigRow(r));

  const isArticles = block.classList.contains('articles');
  const isList = block.classList.contains('list');

  if (isArticles && cfgRows.length > 0) {
    // Dynamic mode: read config, fetch from query-index
    const cfg = {};
    cfgRows.forEach((r) => {
      cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
    });
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
