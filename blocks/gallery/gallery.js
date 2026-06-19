import { createOptimizedPicture } from '../../scripts/aem.js';

const GALLERY_KEYS = new Set(['title', 'description']);

const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
  stroke="#DC1928" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`;

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
  dlLink.rel = 'noopener';
  dlLink.setAttribute('aria-label', `Download: ${data.caption}`);
  dlLink.innerHTML = DOWNLOAD_SVG;

  overlay.append(caption, dlLink);
  imgWrap.append(overlay);
  figure.append(imgWrap);
  return figure;
}

function buildGalleryFilters(categories, grid) {
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

export default function decorate(block) {
  const rows = [...block.children];

  const isCfg = (r) => r.children.length === 2
    && GALLERY_KEYS.has(r.children[0].textContent.trim().toLowerCase());

  const cfg = {};
  rows.filter(isCfg).forEach((r) => {
    cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
  });

  const items = rows.filter((r) => !isCfg(r)).map(readGalleryItem);
  const categories = [...new Set(items.map((it) => it.category).filter(Boolean))];

  block.textContent = '';

  // Page header: title left, filters right
  const headerRow = document.createElement('div');
  headerRow.className = 'gallery-header-row';

  const headerText = document.createElement('div');
  headerText.className = 'gallery-header-text';

  const crumb = document.createElement('nav');
  crumb.className = 'gallery-breadcrumb';
  crumb.setAttribute('aria-label', 'Breadcrumb');
  const homeA = document.createElement('a');
  homeA.href = '/';
  homeA.textContent = 'Home';
  const sep = document.createElement('span');
  sep.className = 'gallery-crumb-sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '›';
  const curr = document.createElement('span');
  curr.textContent = cfg.title || 'Photos';
  crumb.append(homeA, sep, curr);
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
