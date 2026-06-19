/**
 * Shared pagination builder.
 * Replaces duplicate implementations in article-list, photo-grid, and search.
 *
 * @param {number} total       - total item count
 * @param {number} current     - current page (1-based)
 * @param {number} perPage     - items per page
 * @param {Function} onChange  - called with new page number on click
 * @param {string} [navClass]  - CSS class for the <nav> element
 * @returns {HTMLElement|null} - nav element, or null when only one page
 */
// eslint-disable-next-line import/prefer-default-export
export function buildPagination(total, current, perPage, onChange, navClass = 'cards-pagination') {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const nav = document.createElement('nav');
  nav.className = navClass;
  nav.setAttribute('aria-label', 'Page navigation');

  const maxVisible = 5;
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  if (current > 1) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Previous page');
    prev.addEventListener('click', () => onChange(current - 1));
    nav.append(prev);
  }

  for (let i = start; i <= end; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.className = i === current ? 'active' : '';
    btn.setAttribute('aria-label', `Page ${i}`);
    if (i === current) btn.setAttribute('aria-current', 'page');
    btn.addEventListener('click', () => onChange(i));
    nav.append(btn);
  }

  if (current < totalPages) {
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next page');
    next.addEventListener('click', () => onChange(current + 1));
    nav.append(next);
  }

  return nav;
}
