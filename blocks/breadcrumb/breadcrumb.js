export default function decorate(block) {
  const links = block.querySelectorAll('a');
  const items = [...block.querySelectorAll('li, p')];

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  // Helper to format labels
  const formatLabel = (text) =>
    decodeURIComponent(text)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  //  1. If authored links exist
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
  }

  //  2. If authored list/text exists
  else if (items.length) {
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
  }

  //  3. Fallback to URL (MAIN FIX)
  else {
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

    let cumulativePath = '';

    pathSegments.forEach((segment, i) => {
      cumulativePath += `/${segment}`;

      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      const isLast = i === pathSegments.length - 1;
      const label = formatLabel(segment);

      if (isLast) {
        const span = document.createElement('span');
        span.setAttribute('aria-current', 'page');
        span.textContent = label;
        li.append(span);
        li.classList.add('breadcrumb-current');
      } else {
        const link = document.createElement('a');
        link.href = cumulativePath;
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
