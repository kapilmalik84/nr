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

/**
 * Parses a flat paragraph with links separated by <br> into a nested <ul> structure.
 * Links are top-level items; plain text items following a link are sub-items of that link.
 */
function buildNavList(paragraph) {
  const ul = document.createElement('ul');
  let currentLi = null;
  let currentSubUl = null;

  const nodes = [...paragraph.childNodes];
  nodes.forEach((node) => {
    if (node.nodeName === 'BR') return;

    if (node.nodeName === 'A') {
      currentLi = document.createElement('li');
      const a = node.cloneNode(true);
      a.href = a.href.replace(/^http:\/\/\//, '/').replace(/^http:\/\/(?!\/)/, '/');
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
        const parentLink = currentLi.querySelector(':scope > a');
        const a = document.createElement('a');
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

  const sections = [...nav.children];

  // Build top bar (brand + contact)
  const topBar = document.createElement('div');
  topBar.className = 'nav-top-bar';

  const logoDiv = document.createElement('div');
  logoDiv.className = 'nav-logo';
  if (sections[0]) {
    const brandLink = sections[0].querySelector('a');
    if (brandLink) {
      brandLink.href = brandLink.href.replace(/^http:\/\/\//, '/');
      const a = document.createElement('a');
      a.href = brandLink.href;
      a.textContent = 'Australia Post';
      logoDiv.append(a);
    }
  }
  topBar.append(logoDiv);

  const contactDiv = document.createElement('div');
  contactDiv.className = 'nav-contact';
  if (sections[2]) {
    sections[2].querySelectorAll('p').forEach((p) => {
      const a = p.querySelector('a');
      if (a) {
        contactDiv.append(a.cloneNode(true));
      } else if (p.textContent.trim()) {
        const span = document.createElement('span');
        span.textContent = p.textContent.trim();
        contactDiv.append(span);
      }
    });
  }
  topBar.append(contactDiv);

  // Build bottom bar (Newsroom + nav + search)
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

  if (sections[1]) {
    const navP = sections[1].querySelector('p');
    const existingUl = sections[1].querySelector('ul');

    if (existingUl) {
      navSections.append(existingUl);
    } else if (navP) {
      const ul = buildNavList(navP);
      navSections.append(ul);
    }
  }

  // Add click handlers for dropdowns
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
  searchDiv.innerHTML = `<input type="text" placeholder="Search..." aria-label="Search the newsroom">
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

  // Assemble nav
  nav.textContent = '';
  nav.append(topBar);
  bottomBar.prepend(hamburger);
  nav.append(bottomBar);
  nav.setAttribute('aria-expanded', 'false');

  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  // Close dropdowns on outside click
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
