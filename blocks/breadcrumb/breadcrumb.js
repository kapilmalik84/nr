export default function decorate(block) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  const pathParts = window.location.pathname.split('/').filter(Boolean);

  const formatLabel = (text) => decodeURIComponent(text)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Paths that have no published DA page — skip in breadcrumb
  function pathHasPage(path) {
    if (path === '/section') return false;
    if (/^\/archive(\/(?:news|video))?$/.test(path)) return false;
    if (/^\/archive\/news\/\d{4}$/.test(path)) return false;
    // Year folders under stamp sections (e.g. /section/stamps/history/2022)
    if (/^\/section\/[^/]+\/[^/]+\/\d{4}$/.test(path)) return false;
    return true;
  }

  // Match a crumb label to the current URL to infer its href
  function inferHref(label) {
    const slug = label.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const idx = pathParts.findIndex((p) => p === slug);
    if (idx < 0) return null;
    const path = `/${pathParts.slice(0, idx + 1).join('/')}`;
    return pathHasPage(path) ? `${path}/` : null;
  }

  function appendCrumb(text, href, isCurrent) {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';

    if (isCurrent) {
      const span = document.createElement('span');
      span.setAttribute('aria-current', 'page');
      if (text.length > 50) {
        const cut = text.lastIndexOf(' ', 50);
        span.textContent = `${text.slice(0, cut > 0 ? cut : 50)} ...`;
      } else {
        span.textContent = text;
      }
      li.classList.add('breadcrumb-current');
      li.append(span);
    } else if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      li.append(a);
    } else {
      const span = document.createElement('span');
      span.textContent = text;
      li.append(span);
    }

    ol.append(li);
  }

  // Always start with Home
  appendCrumb('Home', '/', false);

  // Block content path: each row in the block is one crumb
  const cells = [...block.querySelectorAll(':scope > div > div')];

  if (cells.length) {
    cells.forEach((cell) => {
      const a = cell.querySelector('a');
      const text = (a ? a.textContent : cell.textContent).trim();
      if (!text) return;
      // Skip home/newsroom — already added above
      if (/^(home|newsroom)$/i.test(text)) return;

      const href = a ? a.getAttribute('href') : inferHref(text);
      appendCrumb(text, href, false);
    });

    // Add the article title as the current-page crumb
    const h1 = document.querySelector('main h1');
    if (h1) appendCrumb(h1.textContent.trim(), null, true);
  } else {
    // URL segment fallback (no block content authored)
    let cumulativePath = '';
    pathParts.forEach((segment, i) => {
      cumulativePath += `/${segment}`;
      const isLast = i === pathParts.length - 1;

      if (!isLast && !pathHasPage(cumulativePath)) return;

      if (isLast) {
        const h1 = document.querySelector('main h1');
        const label = h1 ? h1.textContent.trim() : formatLabel(segment);
        appendCrumb(label, null, true);
      } else {
        appendCrumb(formatLabel(segment), `${cumulativePath}/`, false);
      }
    });
  }

  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
