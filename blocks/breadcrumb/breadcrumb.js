export default function decorate(block) {
  const links = block.querySelectorAll('a');
  const items = [...block.querySelectorAll('li, p')];

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  // Helper to format labels
  const formatLabel = (text) => decodeURIComponent(text)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (links.length) {
    links.forEach((link, i) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      if (i === links.length - 1 && !link.href) {
        const span = document.createElement('span');
        span.setAttribute('aria-current', 'page');
        span.textContent = link.textContent;
        li.append(span);
      } else {
        li.append(link.cloneNode(true));
      }

      ol.append(li);
    });
  } else if (items.length) {
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      const anchor = item.querySelector('a');

      if (anchor) {
        li.append(anchor.cloneNode(true));
      } else {
        const span = document.createElement('span');
        span.setAttribute('aria-current', 'page');
        span.textContent = item.textContent.trim();
        li.append(span);
      }

      if (i === items.length - 1) {
        li.classList.add('breadcrumb-current');
      }

      ol.append(li);
    });
  } else {
    // Fallback to URL segments
    const pathSegments = window.location.pathname
      .split('/')
      .filter((segment) => segment);

    //  Add Home explicitly
    const homeLi = document.createElement('li');
    homeLi.className = 'breadcrumb-item';

    const homeLink = document.createElement('a');
    homeLink.href = '/';
    homeLink.textContent = 'Home';

    homeLi.append(homeLink);
    ol.append(homeLi);

    // Returns false for URL namespace folders that have no published DA page.
    // Crumbs for these paths are skipped entirely.
    function pathHasPage(path) {
      // /section is a URL namespace — sections live at /section/news/, /section/stamps/ etc.
      if (path === '/section') return false;
      // /archive and its immediate news/video children are namespace folders only
      if (/^\/archive(\/(?:news|video))?$/.test(path)) return false;
      // Year folders under /archive/news (e.g. /archive/news/2023) have no page
      if (/^\/archive\/news\/\d{4}$/.test(path)) return false;
      return true;
    }

    let cumulativePath = '';

    pathSegments.forEach((segment, i) => {
      cumulativePath += `/${segment}`;

      const isLast = i === pathSegments.length - 1;
      const label = formatLabel(segment);

      // Skip intermediate crumbs that have no published page
      if (!isLast && !pathHasPage(cumulativePath)) return;

      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      if (isLast) {
        const span = document.createElement('span');
        span.setAttribute('aria-current', 'page');
        span.textContent = label;
        li.append(span);
        li.classList.add('breadcrumb-current');
      } else {
        const link = document.createElement('a');
        link.href = `${cumulativePath}/`;
        link.textContent = label;
        li.append(link);
      }

      ol.append(li);
    });
  }

  // Normalise legacy migration crumbs: "Newsroom" home link → "Home"
  ol.querySelectorAll('a[href="/"]').forEach((a) => {
    if (a.textContent.trim().toLowerCase() === 'newsroom') a.textContent = 'Home';
  });

  nav.append(ol);
  block.textContent = '';
  block.append(nav);
}
