import { createOptimizedPicture } from '../../scripts/aem.js';
import { buildPagination } from '../../scripts/pagination.js';
import { buildInlineBreadcrumb } from '../../scripts/breadcrumb-builder.js';

/**
 * Gallery block — Australia Post Newsroom
 *
 * Variants:
 *   "Gallery"              → default      : filterable image grid with hover download overlay
 *   "Gallery (photo-grid)" → .gallery.photo-grid : paginated photo cards with visible metadata
 *
 * Config rows (key | value):
 *   title       | Media images
 *   description | Optional description text
 *   filters     | Category A, Category B   ← only for default variant
 */

const GALLERY_KEYS = new Set(['title', 'description', 'filters']);
const ITEMS_PER_PAGE = 12;

const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
  stroke="#DC1928" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`;

/* ── Gallery (default) helpers ── */
function readGalleryItem(row) {
  const cells = [...row.children];
  const pic = cells[0]?.querySelector('picture');
  const imgEl = pic?.querySelector('img');
  return {
    picture: pic,
    imgSrc: imgEl?.src || '',
    imgAlt: imgEl?.alt || '',
    caption: cells[1]?.textContent.trim() || '',
    category: cells[2]?.textContent.trim() || '',
  };
}

function buildGalleryItem(data) {
  const figure = document.createElement('figure');
  figure.className = 'gallery-item';
  if (data.category) figure.dataset.category = data.category;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'gallery-img-wrap';

  if (data.picture) {
    const pic = data.imgSrc
      ? createOptimizedPicture(data.imgSrc, data.imgAlt, false, [{ width: '500' }])
      : data.picture;
    imgWrap.append(pic);
  }

  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';

  const caption = document.createElement('figcaption');
  caption.className = 'gallery-caption';
  caption.textContent = data.caption;

  const dlLink = document.createElement('a');
  dlLink.className = 'gallery-download';
  dlLink.href = data.imgSrc || '#';
  dlLink.download = data.caption || 'image';
  dlLink.target = '_blank';
  dlLink.rel = 'noopener noreferrer';
  dlLink.setAttribute('aria-label', `Download: ${data.caption}`);
  dlLink.innerHTML = DOWNLOAD_SVG;

  overlay.append(caption, dlLink);
  imgWrap.append(overlay);
  figure.append(imgWrap);
  return figure;
}

function buildGalleryFilters(categories, grid) {
  const gridId = grid.id || `gallery-grid-${Math.random().toString(36).slice(2, 7)}`;
  grid.id = gridId;

  const wrap = document.createElement('div');
  wrap.className = 'gallery-filters';
  wrap.setAttribute('role', 'tablist');
  wrap.setAttribute('aria-label', 'Filter images by category');

  const allCats = ['All', ...categories];
  const els = allCats.map((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-filter-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-controls', gridId);
    btn.id = `gallery-tab-${i}`;
    btn.textContent = name;
    wrap.append(btn);
    return btn;
  });

  function selectFilter(name) {
    els.forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.textContent === name));
    });
    [...grid.children].forEach((item) => {
      item.hidden = name !== 'All' && item.dataset.category !== name;
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

  return wrap;
}

function decorateGallery(block, cfg, items) {
  const categories = [...new Set(items.map((it) => it.category).filter(Boolean))];

  block.textContent = '';

  const headerRow = document.createElement('div');
  headerRow.className = 'gallery-header-row';

  const headerText = document.createElement('div');
  headerText.className = 'gallery-header-text';

  const crumb = buildInlineBreadcrumb(
    [{ href: '/', text: 'Home' }, { text: cfg.title || 'Photos' }],
    'gallery-breadcrumb',
  );
  headerText.append(crumb);

  const h1 = document.createElement('h1');
  h1.className = 'gallery-page-title';
  h1.textContent = cfg.title || 'Media images';
  headerText.append(h1);

  if (cfg.description) {
    const desc = document.createElement('p');
    desc.className = 'gallery-desc';
    desc.textContent = cfg.description;
    headerText.append(desc);
  }

  headerRow.append(headerText);

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';
  items.forEach((data) => grid.append(buildGalleryItem(data)));

  if (categories.length > 0) {
    headerRow.append(buildGalleryFilters(categories, grid));
  }

  block.append(headerRow, grid);
}

/* ── Photo-grid variant helpers ── */
function readPhotoCard(row) {
  const cols = [...row.children];
  const img = cols[0]?.querySelector('img');
  const textCol = cols[1] || cols[0];
  const paragraphs = textCol?.querySelectorAll('p') || [];
  const link = textCol?.querySelector('a');

  const item = {
    image: img?.src || '',
    caption: '',
    date: '',
    category: '',
    link: link?.href || '',
  };

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (text.match(/^\d{2}\s/)) {
      const parts = text.split('|').map((s) => s.trim());
      item.date = parts[0] || '';
      item.category = parts[1] || '';
    } else if (!p.querySelector('a') && text) {
      item.caption = text;
    }
  });

  return item;
}

function buildPhotoCard(item) {
  const card = document.createElement('article');
  card.className = 'photo-card';
  card.setAttribute('role', 'article');

  if (item.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'photo-card-image';
    const pic = createOptimizedPicture(item.image, item.caption || '', false, [{ width: '480' }]);
    imgWrap.append(pic);
    card.append(imgWrap);
  }

  if (item.caption || item.date || item.category) {
    const info = document.createElement('div');
    info.className = 'photo-card-info';

    if (item.date || item.category) {
      const meta = document.createElement('p');
      meta.className = 'photo-card-meta';
      meta.textContent = [item.date, item.category].filter(Boolean).join(' | ');
      info.append(meta);
    }

    if (item.caption) {
      const cap = document.createElement('p');
      cap.className = 'photo-card-caption';
      cap.textContent = item.caption;
      info.append(cap);
    }

    if (item.link) {
      const a = document.createElement('a');
      a.href = item.link;
      a.className = 'photo-card-link';
      a.textContent = 'Details';
      info.append(a);
    }

    card.append(info);
  }

  return card;
}

function decoratePhotoGrid(block) {
  const rows = [...block.children];
  const items = rows.map(readPhotoCard).filter((it) => it.image || it.caption);

  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'photo-grid-container';

  let currentPage = 1;

  function showPage(page) {
    currentPage = page;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(start, start + ITEMS_PER_PAGE);

    grid.innerHTML = '';
    pageItems.forEach((item) => grid.append(buildPhotoCard(item)));

    const existingNav = block.querySelector('.cards-pagination');
    if (existingNav) existingNav.remove();
    const paginationNav = buildPagination(items.length, currentPage, ITEMS_PER_PAGE, showPage);
    if (paginationNav) block.append(paginationNav);

    const firstCard = grid.querySelector('.photo-card');
    if (firstCard) {
      firstCard.tabIndex = -1;
      firstCard.focus();
    }
  }

  block.append(grid);
  showPage(1);
}

/* ── Main decorate ── */
export default function decorate(block) {
  if (block.classList.contains('photo-grid')) {
    decoratePhotoGrid(block);
    return;
  }

  const rows = [...block.children];

  const isCfg = (r) => r.children.length === 2
    && GALLERY_KEYS.has(r.children[0].textContent.trim().toLowerCase());

  const cfg = {};
  rows.filter(isCfg).forEach((r) => {
    cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
  });

  const items = rows.filter((r) => !isCfg(r)).map(readGalleryItem);
  decorateGallery(block, cfg, items);
}
