import {
  buildBlock,
  decorateBlocks,
  decorateIcons,
  decorateSections,
  decorateTemplateAndTheme,
  getMetadata,
  loadBlock,
  loadCSS,
  loadFooter,
  loadHeader,
  loadSections,
  sampleRUM,
  setup,
  waitForFirstImage,
} from './aem.js';

/**
 * Auto-decorate article pages: insert formatted date and category above the h1.
 * @param {Element} main the main element
 */
function decorateArticlePage(main) {
  const date = getMetadata('publication-date');
  const category = getMetadata('category');
  if (!date) return;

  const h1 = main.querySelector('h1');
  if (!h1) return;

  // Remove the raw category paragraph (before h1) — AEM strips its class, left as plain <p>
  const prevEl = h1.previousElementSibling;
  if (prevEl && prevEl.tagName === 'P' && prevEl.textContent.trim() === (category || '').trim()) {
    prevEl.remove();
  }

  // Remove the raw date paragraph (first <p> after h1) — AEM strips its class too
  const nextEl = h1.nextElementSibling;
  if (nextEl && nextEl.tagName === 'P') {
    const txt = nextEl.textContent.trim();
    if (/^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(txt)) {
      nextEl.remove();
    }
  }

  const dateEl = document.createElement('p');
  dateEl.className = 'article-date';

  const parsedDate = new Date(date.split('/').reverse().join('-'));
  const formatted = Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  dateEl.textContent = formatted;

  if (category) {
    const catSpan = document.createElement('span');
    catSpan.className = 'article-category';
    catSpan.textContent = category;
    dateEl.append(' | ', catSpan);
  }

  h1.parentElement.insertBefore(dateEl, h1);
}

/**
 * Builds hero block if the first section has a specific pattern:
 * full-width image followed by heading + text + CTA.
 * @param {Element} main the main element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  if (
    h1
    && picture
    && h1.closest('div') === picture.closest('div')
  ) {
    const section = h1.closest('div');
    const elems = [...section.children];
    // Only auto-block if we're in the first section and it looks like a hero
    if (section === main.querySelector(':scope > div:first-child') && elems.length <= 5) {
      const block = buildBlock('hero', { elems });
      section.append(block);
    }
  }
}

/**
 * Auto-inject a breadcrumb block at the top of any page that doesn't already
 * have one. The breadcrumb.js fallback generates trail from the URL path.
 * @param {Element} main the main element
 */
function buildBreadcrumb(main) {
  // Only auto-inject on the actual page main, not on nav/footer fragments
  if (main !== document.querySelector('main')) return;
  if (main.querySelector('.breadcrumb')) return;
  // Skip homepage
  if (window.location.pathname === '/' || window.location.pathname === '/index') return;

  const breadcrumb = buildBlock('breadcrumb', '');
  const firstSection = main.querySelector(':scope > div');
  if (firstSection) firstSection.prepend(breadcrumb);
}

/**
 * Decorates the main element.
 * @param {Element} main the main element
 */
export default function decorateMain(main) {
  decorateIcons(main);
  buildHeroBlock(main);
  buildBreadcrumb(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateArticlePage(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Document} doc the document
 */
async function loadEager(doc) {
  setup();
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  // Load critical CSS
  const styles = loadCSS(`${window.hlx.codeBasePath}/styles/styles.css`);

  const main = doc.querySelector('main');
  if (main) {
    main.id = 'main-content';
    const skipNav = document.createElement('a');
    skipNav.href = '#main-content';
    skipNav.className = 'skip-nav';
    skipNav.textContent = 'Skip to main content';
    document.body.prepend(skipNav);
    decorateMain(main);
    document.body.classList.add('appear');
    const heroBlock = main.querySelector('.hero');
    if (heroBlock) await loadBlock(heroBlock);
    await waitForFirstImage(main);
  }

  await styles;
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Document} doc the document
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  sampleRUM('lazy');
  if (sampleRUM.observe) sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
}

/**
 * Loads everything that happens a lot later (analytics, etc.)
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => {
    import('./delayed.js');
  }, 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
