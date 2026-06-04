import { createOptimizedPicture } from '../../scripts/aem.js';

const ITEMS_PER_PAGE = 12;

function renderGrid(items, container) {
  container.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'photo-card';

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

    container.append(card);
  });
}

function renderPagination(totalPages, currentPage, onPageChange) {
  const nav = document.createElement('nav');
  nav.className = 'photo-grid-pagination';
  nav.setAttribute('aria-label', 'Page navigation');

  for (let i = 1; i <= Math.min(totalPages, 5); i += 1) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === currentPage ? 'active' : '';
    btn.addEventListener('click', () => onPageChange(i));
    nav.append(btn);
  }

  if (totalPages > 5) {
    const next = document.createElement('button');
    next.textContent = '>';
    next.addEventListener('click', () => {
      const nextPage = Math.min(currentPage + 1, totalPages);
      onPageChange(nextPage);
    });
    nav.append(next);
  }

  return nav;
}

export default function decorate(block) {
  const rows = [...block.children];
  const items = [];

  rows.forEach((row) => {
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

    if (item.image || item.caption) items.push(item);
  });

  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'photo-grid-container';

  let currentPage = 1;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  function showPage(page) {
    currentPage = page;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
    renderGrid(pageItems, grid);

    const existingNav = block.querySelector('.photo-grid-pagination');
    if (existingNav) existingNav.remove();
    if (totalPages > 1) {
      block.append(renderPagination(totalPages, currentPage, showPage));
    }
  }

  block.append(grid);
  showPage(1);
}
