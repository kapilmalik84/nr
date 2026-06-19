/* eslint-disable no-unused-vars */
import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards block — Australia Post Newsroom
 *
 * Variants (set by the author via the block name cell in da.live):
 *   "Cards (articles)"  -> .cards.articles  : 3-col photo grid + category filter
 *   "Cards (list)"      -> .cards.list      : horizontal list rows (listing pages)
 *   "Cards"             -> default           : plain grid, no filter
 *
 * Authoring contract — ONE da.live table ROW per article, cells in this order:
 *   | :image: | Category | Headline (with link) | Date | Excerpt |
 * Empty trailing cells are tolerated. The Headline link target becomes the
 * whole-card link; the entire <article> is wrapped in that single <a>.
 */

const CELL = ['image', 'category', 'title', 'date', 'excerpt'];

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

function buildCard(data) {
  const article = document.createElement('article');
  article.className = 'card';

  const href = data.link ? data.link.getAttribute('href') : '#';
  const a = document.createElement('a');
  a.className = 'card-link';
  a.href = href;

  // media
  if (data.picture) {
    const media = document.createElement('div');
    media.className = 'card-media';
    const optimized = data.picture.querySelector('img')
      ? createOptimizedPicture(
        data.picture.querySelector('img').src,
        data.picture.querySelector('img').getAttribute('alt') || '',
        false,
        [{ width: '750' }],
      )
      : data.picture;
    media.append(optimized);
    if (data.category) {
      const pill = document.createElement('span');
      pill.className = 'card-category';
      pill.textContent = data.category;
      media.append(pill);
    }
    a.append(media);
  }

  // body
  const body = document.createElement('div');
  body.className = 'card-body';
  if (data.date) {
    const meta = document.createElement('p');
    meta.className = 'card-date';
    meta.textContent = data.date;
    body.append(meta);
  }
  if (data.titleEl) {
    const h3 = document.createElement('h3');
    h3.className = 'card-title';
    h3.textContent = (data.link || data.titleEl).textContent.trim();
    body.append(h3);
  }
  if (data.excerpt) {
    const p = document.createElement('p');
    p.className = 'card-excerpt';
    p.textContent = data.excerpt;
    body.append(p);
  }
  const cta = document.createElement('span');
  cta.className = 'card-cta';
  cta.setAttribute('aria-hidden', 'true');
  cta.innerHTML = 'Read more <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';
  body.append(cta);

  a.append(body);
  article.append(a);
  article.dataset.category = data.category || '';
  return article;
}

function buildFilter(categories, grid, status) {
  const tablist = document.createElement('div');
  tablist.className = 'cards-filter';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter articles by category');

  const tabs = ['All news', ...categories];
  const els = tabs.map((name, i) => {
    const tab = document.createElement('button');
    tab.className = 'cards-tab';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.textContent = name;
    tablist.append(tab);
    return tab;
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
    status.textContent = `${shown} article${shown === 1 ? '' : 's'} in ${cat}`;
  }

  els.forEach((tab, i) => {
    tab.addEventListener('click', () => { select(i); els[i].focus(); });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (i + dir + els.length) % els.length;
      select(next);
      els[next].focus();
    });
  });

  return tablist;
}

export default function decorate(block) {
  const rows = [...block.children];
  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  const categories = new Set();
  rows.forEach((row) => {
    const data = readCard(row);
    if (data.category) categories.add(data.category);
    grid.append(buildCard(data));
  });

  block.textContent = '';

  // category filter only for the articles variant
  if (block.classList.contains('articles') && categories.size > 1) {
    const status = document.createElement('p');
    status.className = 'cards-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    block.append(buildFilter([...categories], grid, status));
    block.append(status);
  }

  block.append(grid);
}
