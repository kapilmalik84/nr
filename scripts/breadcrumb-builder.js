/**
 * Shared inline breadcrumb builder used by gallery, video, and cards (collection).
 * The standalone breadcrumb block (blocks/breadcrumb) handles article pages.
 *
 * @param {Array<{href?: string, text: string}>} crumbs
 *   Array of crumb objects. The last item is the current page (no href needed).
 * @param {string} [navClass] - extra CSS class for the <nav> element
 * @returns {HTMLElement} nav element
 */
// eslint-disable-next-line import/prefer-default-export
export function buildInlineBreadcrumb(crumbs, navClass = '') {
  const nav = document.createElement('nav');
  nav.className = ['breadcrumb-inline', navClass].filter(Boolean).join(' ');
  nav.setAttribute('aria-label', 'Breadcrumb');

  crumbs.forEach((crumb, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '›';
      nav.append(sep);
    }

    if (crumb.href) {
      const a = document.createElement('a');
      a.href = crumb.href;
      a.textContent = crumb.text;
      nav.append(a);
    } else {
      const span = document.createElement('span');
      if (i === crumbs.length - 1) span.setAttribute('aria-current', 'page');
      span.textContent = crumb.text;
      nav.append(span);
    }
  });

  return nav;
}
