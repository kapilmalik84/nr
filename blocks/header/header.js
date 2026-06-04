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

/**
 * Parses a flat paragraph with links separated by <br> into a nested <ul>.
 * Links = top-level items; plain text after a link = sub-items (dropdown).
 */
function buildNavList(paragraph) {
  const ul = document.createElement('ul');
  let currentLi = null;
  let currentSubUl = null;

  [...paragraph.childNodes].forEach((node) => {
    if (node.nodeName === 'BR') return;

    if (node.nodeName === 'A') {
      currentLi = document.createElement('li');
      const a = document.createElement('a');
      a.href = fixHref(node.href);
      a.textContent = node.textContent;
      currentLi.append(a);
      ul.append(currentLi);
      currentSubUl = null;
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      if (currentLi) {
        if (!currentSubUl) {
          currentSubUl = document.createElement('ul');
          currentLi.append(currentSubUl);
          currentLi.classList.add('nav-drop');
          currentLi.setAttribute('aria-expanded', 'false');
        }
        const subLi = document.createElement('li');
        const a = document.createElement('a');
        const parentLink = currentLi.querySelector(':scope > a');
        a.href = parentLink ? parentLink.href : '#';
        a.textContent = node.textContent.trim();
        subLi.append(a);
        currentSubUl.append(subLi);
      }
    }
  });

  return ul;
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Get all paragraphs from the fragment (may be in one div or multiple divs)
  const allParagraphs = [...nav.querySelectorAll('p')];
  const navUl = nav.querySelector('ul');

  // Identify paragraphs by content pattern:
  // p[0] = brand link, p[1] = nav links (with <br>), p[2+] = contact info
  const brandP = allParagraphs[0];
  const navP = allParagraphs[1];
  const contactPs = allParagraphs.slice(2);

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
  } else if (navP && navP.querySelector('a')) {
    const ul = buildNavList(navP);
    navSections.append(ul);
  }

  // Dropdown click handlers
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    drop.addEventListener('click', (e) => {
      if (e.target.closest('ul ul')) return;
      if (isDesktop.matches) {
        e.preventDefault();
        const expanded = drop.getAttribute('aria-expanded') === 'true';
        toggleAllNavSections(navSections);
        drop.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      }
    });
  });

  bottomBar.append(navSections);

  // Search box
  const searchDiv = document.createElement('div');
  searchDiv.className = 'nav-search';
  searchDiv.innerHTML = `<input type="text" placeholder="Search..." aria-label="Search">
    <button type="button" aria-label="Search">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>`;
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
