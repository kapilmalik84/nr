import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

// Track which drop elements already have hover listeners so resize never
// double-attaches them (WeakSet avoids memory leaks).
const hoverAttached = new WeakSet();

function toggleAllNavSections(navSections) {
  if (!navSections) return;
  navSections.querySelectorAll('.nav-drop').forEach((d) => {
    d.setAttribute('aria-expanded', 'false');
    const trigger = d.querySelector(':scope > a');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function toggleMenu(nav, navSections, forceOpen = null) {
  const isOpen = forceOpen !== null ? forceOpen : !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', isOpen);
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
  if (hoverAttached.has(drop)) return;
  hoverAttached.add(drop);

  let closeTimer = null;

  const open = () => {
    clearTimeout(closeTimer);
    toggleAllNavSections(drop.closest('.nav-sections'));
    drop.setAttribute('aria-expanded', 'true');
    const trigger = drop.querySelector(':scope > a');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  };

  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      drop.setAttribute('aria-expanded', 'false');
      const trigger = drop.querySelector(':scope > a');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }, 180);
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

  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

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

  const logoImg = document.createElement('img');
  logoImg.src = '/icons/auspost-logo.svg';
  logoImg.alt = 'Australia Post';
  logoImg.setAttribute('aria-hidden', 'true');

  const newsroomLabel = document.createElement('span');
  newsroomLabel.className = 'nav-brand-newsroom';
  newsroomLabel.textContent = 'Newsroom';

  brandA.append(logoImg, newsroomLabel);
  brandDiv.append(brandA);

  // ── Nav sections ──────────────────────────────────────────────────────────
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  navSections.id = 'nav-sections';

  if (navUl) {
    navSections.append(navUl);

    navUl.querySelectorAll(':scope > li').forEach((li) => {
      const subUl = li.querySelector('ul');
      if (!subUl) return;

      li.classList.add('nav-drop');
      const parentLink = li.querySelector(':scope > a');
      if (!parentLink) return;

      // ARIA state on the interactive <a>, not the <li>
      parentLink.setAttribute('aria-expanded', 'false');
      parentLink.setAttribute('aria-haspopup', 'true');

      // Chevron as aria-hidden span so screen readers never hear "∨" noise
      const chevron = document.createElement('span');
      chevron.className = 'nav-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      parentLink.append(chevron);

      // Keyboard interaction on the trigger link
      parentLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const expanded = parentLink.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          const next = expanded ? 'false' : 'true';
          parentLink.setAttribute('aria-expanded', next);
          li.setAttribute('aria-expanded', next);
          // ArrowDown or open: move focus to first sub-menu item
          if (next === 'true') {
            const first = subUl.querySelector('a');
            if (first) first.focus();
          }
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Open dropdown and focus first item
          toggleAllNavSections(navSections);
          parentLink.setAttribute('aria-expanded', 'true');
          li.setAttribute('aria-expanded', 'true');
          const first = subUl.querySelector('a');
          if (first) first.focus();
        }
        if (e.key === 'Escape') {
          parentLink.setAttribute('aria-expanded', 'false');
          li.setAttribute('aria-expanded', 'false');
        }
      });

      // Keyboard within sub-menu: ArrowUp on first item returns to trigger; Escape closes
      subUl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          parentLink.setAttribute('aria-expanded', 'false');
          li.setAttribute('aria-expanded', 'false');
          parentLink.focus();
        }
        if (e.key === 'ArrowUp') {
          const links = [...subUl.querySelectorAll('a')];
          if (document.activeElement === links[0]) {
            e.preventDefault();
            parentLink.setAttribute('aria-expanded', 'false');
            li.setAttribute('aria-expanded', 'false');
            parentLink.focus();
          }
        }
      });

      // Prepend "view all" link in dropdown
      const headingLi = document.createElement('li');
      const headingA = document.createElement('a');
      headingA.href = fixHref(parentLink.href);
      // Use only text content (not the chevron span)
      const firstText = parentLink.firstChild?.textContent?.trim();
      headingA.textContent = firstText || parentLink.textContent.trim();
      headingLi.append(headingA);
      subUl.prepend(headingLi);
    });
  }

  // Click to toggle (works on both mobile and desktop for keyboard activation)
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    drop.addEventListener('click', (e) => {
      if (e.target.closest('ul ul')) return;
      // Only handle clicks not already handled by keydown (i.e. pointer clicks)
      if (e.detail === 0) return; // keyboard-synthesised click — keydown already handled it
      e.preventDefault();
      const trigger = drop.querySelector(':scope > a');
      const expanded = (trigger || drop).getAttribute('aria-expanded') === 'true';
      toggleAllNavSections(navSections);
      const next = expanded ? 'false' : 'true';
      if (trigger) trigger.setAttribute('aria-expanded', next);
      drop.setAttribute('aria-expanded', next);
    });
  });

  const attachHover = () => {
    if (isDesktop.matches) {
      navSections.querySelectorAll('.nav-drop').forEach(setupHoverDropdown);
    }
  };
  attachHover();
  isDesktop.addEventListener('change', attachHover);

  // Mark active nav items
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  navSections.querySelectorAll(':scope > ul > li > a').forEach((a) => {
    try {
      const li = a.parentElement;
      const linkPath = new URL(a.href, window.location.href).pathname.replace(/\/$/, '') || '/';
      const isActive = linkPath === '/'
        ? currentPath === '/'
        : currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
      if (isActive) {
        a.classList.add(li.classList.contains('nav-drop') ? 'nav-current-section' : 'nav-current-page');
      }
    } catch (_) { /* skip */ }
  });

  // ── Utilities ─────────────────────────────────────────────────────────────
  const utilitiesDiv = document.createElement('div');
  utilitiesDiv.className = 'nav-utilities';

  contactLinks.forEach((a) => {
    const link = document.createElement('a');
    link.href = fixHref(a.href);
    link.className = 'nav-contact-link';
    link.textContent = a.textContent.trim();
    utilitiesDiv.append(link);
  });

  const searchPill = document.createElement('form');
  searchPill.className = 'nav-search-pill';
  searchPill.setAttribute('role', 'search');
  searchPill.setAttribute('aria-label', 'Site search');

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search Newsroom';
  searchInput.setAttribute('aria-label', 'Search Newsroom');

  const searchBtn = document.createElement('button');
  searchBtn.type = 'submit';
  searchBtn.setAttribute('aria-label', 'Submit search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  searchPill.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
  });

  searchPill.append(searchInput, searchBtn);
  utilitiesDiv.append(searchPill);

  // ── Hamburger ─────────────────────────────────────────────────────────────
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-sections" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
  </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));

  // ── Assemble ──────────────────────────────────────────────────────────────
  nav.textContent = '';
  nav.append(brandDiv, navSections, utilitiesDiv, hamburger);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav')) toggleAllNavSections(navSections);
  });

  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      nav.classList.remove('is-open');
      document.body.style.overflowY = '';
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
