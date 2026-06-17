import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
  <circle cx="30" cy="30" r="30" fill="#dc1928"/>
  <path d="M18 12h14c6.627 0 12 5.373 12 12s-5.373 12-12 12H26v12H18V12zm8 16h6c2.209 0 4-1.791 4-4s-1.791-4-4-4h-6v8z" fill="#fff"/>
</svg>`;

function toggleAllNavSections(navSections) {
  if (!navSections) return;
  navSections.querySelectorAll('.nav-drop').forEach((d) => d.setAttribute('aria-expanded', 'false'));
}

function toggleMenu(nav, navSections, forceOpen = null) {
  const isOpen = forceOpen !== null ? forceOpen : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflowY = isOpen && !isDesktop.matches ? 'hidden' : '';
  if (!isOpen) toggleAllNavSections(navSections);
  const btn = nav.querySelector('.nav-hamburger button');
  if (btn) btn.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
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

  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => drop.setAttribute('aria-expanded', 'false'), 180);
  };

  drop.addEventListener('mouseenter', open);
  drop.addEventListener('mouseleave', scheduleClose);

  const subUl = drop.querySelector(':scope > ul');
  if (subUl) {
    subUl.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    subUl.addEventListener('mouseleave', scheduleClose);
  }
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';

  // Move fragment children into nav so we can query them
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // nav.html structure: div[brand link], div[ul nav], div[contact paragraphs]
  const navUl = nav.querySelector('ul');
  const brandLink = nav.querySelector('a[href]');
  const contactLinks = [...nav.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')];

  // ── Brand ─────────────────────────────────────────────────────────────────
  const brandDiv = document.createElement('div');
  brandDiv.className = 'nav-brand';

  const brandA = document.createElement('a');
  brandA.href = fixHref(brandLink ? brandLink.href : '/');
  brandA.className = 'nav-brand-logo';
  brandA.setAttribute('aria-label', 'Australia Post Newsroom home');
  brandA.innerHTML = LOGO_SVG;

  const brandName = document.createElement('span');
  brandName.className = 'nav-brand-name';
  brandName.innerHTML = 'Australia Post<span>Newsroom</span>';

  brandA.append(brandName);
  brandDiv.append(brandA);

  // ── Nav sections ──────────────────────────────────────────────────────────
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';

  if (navUl) {
    navSections.append(navUl);
    // Mark items that have sub-lists as dropdowns
    navUl.querySelectorAll(':scope > li').forEach((li) => {
      const subUl = li.querySelector('ul');
      if (subUl) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');

        // Prepend a "view all" link at top of dropdown matching parent
        const parentLink = li.querySelector(':scope > a');
        if (parentLink) {
          const headingLi = document.createElement('li');
          const headingA = document.createElement('a');
          headingA.href = fixHref(parentLink.href);
          headingA.textContent = parentLink.textContent;
          headingLi.append(headingA);
          subUl.prepend(headingLi);
        }
      }
    });
  }

  // Desktop: hover | Mobile: click
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    drop.addEventListener('click', (e) => {
      if (isDesktop.matches) return;
      if (e.target.closest('ul ul')) return;
      e.preventDefault();
      const expanded = drop.getAttribute('aria-expanded') === 'true';
      toggleAllNavSections(navSections);
      drop.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  const attachHover = () => {
    if (isDesktop.matches) {
      navSections.querySelectorAll('.nav-drop').forEach(setupHoverDropdown);
    }
  };
  attachHover();
  isDesktop.addEventListener('change', attachHover);

  // ── Utilities (right side) ────────────────────────────────────────────────
  const utilitiesDiv = document.createElement('div');
  utilitiesDiv.className = 'nav-utilities';

  contactLinks.forEach((a) => {
    const link = document.createElement('a');
    link.href = fixHref(a.href);
    link.className = 'nav-contact-link';
    link.textContent = a.textContent.trim();
    utilitiesDiv.append(link);
  });

  // Pill search (styled like "Track or search" on stest.npe.auspost.com.au)
  const searchPill = document.createElement('div');
  searchPill.className = 'nav-search-pill';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search Newsroom';
  searchInput.setAttribute('aria-label', 'Search');

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.setAttribute('aria-label', 'Submit search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

  searchPill.append(searchInput, searchBtn);
  utilitiesDiv.append(searchPill);

  // ── Hamburger ─────────────────────────────────────────────────────────────
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));

  // ── Assemble ──────────────────────────────────────────────────────────────
  nav.textContent = '';
  nav.append(brandDiv, navSections, utilitiesDiv, hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // Close dropdowns when clicking outside nav
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav')) toggleAllNavSections(navSections);
  });

  // Sync hamburger state on resize
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      nav.setAttribute('aria-expanded', 'false');
      document.body.style.overflowY = '';
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
