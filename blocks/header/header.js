import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
}

function fixHref(href) {
  if (!href) return '/';
  return href.replace(/^http:\/\/\//, '/').replace(/^http:\/\/(?!\/)/, '/');
}

function setupHoverDropdown(drop) {
  let closeTimer = null;

  const open = () => {
    clearTimeout(closeTimer);
    toggleAllNavSections(drop.closest('.nav-sections'));
    drop.setAttribute('aria-expanded', 'true');
  };

  const close = (delay = 150) => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      drop.setAttribute('aria-expanded', 'false');
    }, delay);
  };

  drop.addEventListener('mouseenter', open);
  drop.addEventListener('mouseleave', () => close());

  // Keep dropdown open when hovering inside the submenu
  const subUl = drop.querySelector(':scope > ul');
  if (subUl) {
    subUl.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    subUl.addEventListener('mouseleave', () => close());
  }
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const allParagraphs = [...nav.querySelectorAll('p')];
  const navUl = nav.querySelector('ul');

  const brandP = allParagraphs[0];
  const contactPs = allParagraphs.slice(1);

  // Build top bar
  const topBar = document.createElement('div');
  topBar.className = 'nav-top-bar';

  const logoDiv = document.createElement('div');
  logoDiv.className = 'nav-logo';
  if (brandP) {
    const brandLink = brandP.querySelector('a');
    if (brandLink) {
      const a = document.createElement('a');
      a.href = fixHref(brandLink.href);
      a.textContent = 'Australia Post';
      logoDiv.append(a);
    }
  }
  topBar.append(logoDiv);

  const contactDiv = document.createElement('div');
  contactDiv.className = 'nav-contact';
  contactPs.forEach((p) => {
    const a = p.querySelector('a');
    if (a) {
      const clone = a.cloneNode(true);
      clone.href = fixHref(a.href);
      contactDiv.append(clone);
    } else if (p.textContent.trim()) {
      const span = document.createElement('span');
      span.textContent = p.textContent.trim();
      contactDiv.append(span);
    }
  });
  topBar.append(contactDiv);

  // Build bottom bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'nav-bottom-bar';

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandA = document.createElement('a');
  brandA.href = '/';
  brandA.textContent = 'Newsroom';
  brand.append(brandA);
  bottomBar.append(brand);

  // Nav sections
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';

  if (navUl) {
    navSections.append(navUl);
    navUl.querySelectorAll(':scope > li').forEach((li) => {
      if (li.querySelector('ul')) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Desktop: hover opens dropdown; mobile: click toggles
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    // Mobile click handler
    drop.addEventListener('click', (e) => {
      if (isDesktop.matches) return;
      if (e.target.closest('ul ul')) return;
      e.preventDefault();
      const expanded = drop.getAttribute('aria-expanded') === 'true';
      toggleAllNavSections(navSections);
      drop.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      navSections.querySelectorAll('.nav-drop').forEach(setupHoverDropdown);
    }
  });

  if (isDesktop.matches) {
    navSections.querySelectorAll('.nav-drop').forEach(setupHoverDropdown);
  }

  bottomBar.append(navSections);

  // Search — navigates to /search?q=query
  const searchDiv = document.createElement('div');
  searchDiv.className = 'nav-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  searchInput.setAttribute('aria-label', 'Search');

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  const doNavSearch = () => {
    const q = searchInput.value.trim();
    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };
  searchBtn.addEventListener('click', doNavSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doNavSearch();
  });

  searchDiv.append(searchInput, searchBtn);
  bottomBar.append(searchDiv);

  // Hamburger
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));

  // Assemble
  nav.textContent = '';
  nav.append(topBar);
  bottomBar.prepend(hamburger);
  nav.append(bottomBar);
  nav.setAttribute('aria-expanded', 'false');

  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  // Close all dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-sections')) {
      toggleAllNavSections(navSections, false);
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
