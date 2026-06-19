import { getMetadata } from '../../scripts/aem.js';

const LINKEDIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/>
</svg>`;

const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.918l4.266 5.64 4.81-5.64Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>
</svg>`;

const LINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>`;

function formatPubDate(str) {
  if (!str) return '';
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return str;
  const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  if (Number.isNaN(date.getTime())) return str;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function categorySlug(cat) {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

function calcReadingTime() {
  const text = [...document.querySelectorAll('main p, main li')].map((el) => el.textContent).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function buildShareBtn(href, svg, label, isButton = false) {
  const el = isButton ? document.createElement('button') : document.createElement('a');
  el.className = 'ah-share-btn';
  el.setAttribute('aria-label', label);
  if (!isButton) {
    el.href = href;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }
  el.innerHTML = svg;
  return el;
}

export default function decorate(block) {
  const main = document.querySelector('main');
  const pageUrl = window.location.href;
  const pageTitle = document.title;

  // Read metadata
  const category = getMetadata('category') || '';
  const subCategory = getMetadata('sub-category') || '';
  const rawDate = getMetadata('publication-date') || '';
  const author = getMetadata('author') || 'Australia Post Media Team';

  // Find and move the page h1 (from default content)
  const existingH1 = main.querySelector('h1');
  const titleText = existingH1?.textContent.trim() || getMetadata('og:title') || pageTitle;

  // Hide legacy inline meta paragraphs
  main.querySelector('p.article-category')?.setAttribute('hidden', '');
  main.querySelector('p.article-date')?.setAttribute('hidden', '');

  // Hide existing breadcrumb block (we build our own)
  const bcWrapper = main.querySelector('.breadcrumb-wrapper');
  if (bcWrapper) bcWrapper.setAttribute('hidden', '');

  block.textContent = '';

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'ah-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');

  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Newsroom';

  const sep1 = document.createElement('span');
  sep1.className = 'ah-crumb-sep';
  sep1.setAttribute('aria-hidden', 'true');
  sep1.textContent = '›';

  breadcrumb.append(homeLink, sep1);

  if (category) {
    const catLink = document.createElement('a');
    catLink.href = `/section/${categorySlug(category)}`;
    catLink.textContent = category;
    breadcrumb.append(catLink);
  }

  // ── Badges ──────────────────────────────────────────────────────────────────
  const badges = document.createElement('div');
  badges.className = 'ah-badges';

  if (category) {
    const catBadge = document.createElement('span');
    catBadge.className = 'ah-category-badge';
    catBadge.textContent = category;
    badges.append(catBadge);
  }

  if (subCategory && subCategory.toLowerCase() !== category.toLowerCase()) {
    const subBadge = document.createElement('span');
    subBadge.className = 'ah-type-badge';
    subBadge.textContent = subCategory;
    badges.append(subBadge);
  }

  // ── H1 ──────────────────────────────────────────────────────────────────────
  const h1 = document.createElement('h1');
  h1.className = 'ah-title';
  h1.textContent = titleText;
  if (existingH1) existingH1.remove();

  // ── Byline ──────────────────────────────────────────────────────────────────
  const byline = document.createElement('div');
  byline.className = 'ah-byline';

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'ah-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  const initials = author.split(' ').slice(0, 2)
    .map((w) => w[0]).join('')
    .toUpperCase();
  avatar.textContent = initials || 'AP';

  // Author + date
  const authorBlock = document.createElement('div');
  authorBlock.className = 'ah-author-block';

  const authorName = document.createElement('p');
  authorName.className = 'ah-author-name';
  authorName.textContent = author;

  const dateLine = document.createElement('p');
  dateLine.className = 'ah-date-read';
  const parts = [formatPubDate(rawDate), calcReadingTime()].filter(Boolean);
  dateLine.textContent = parts.join(' · ');

  authorBlock.append(authorName, dateLine);

  // Share buttons
  const share = document.createElement('div');
  share.className = 'ah-share';
  share.setAttribute('aria-label', 'Share this article');

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(titleText)}`;

  const copyBtn = buildShareBtn('', LINK_SVG, 'Copy link to clipboard', true);
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      copyBtn.setAttribute('aria-label', 'Link copied!');
      setTimeout(() => copyBtn.setAttribute('aria-label', 'Copy link to clipboard'), 2000);
    } catch (_) { /* clipboard not available */ }
  });

  share.append(
    buildShareBtn(linkedInUrl, LINKEDIN_SVG, 'Share on LinkedIn'),
    buildShareBtn(xUrl, X_SVG, 'Share on X (Twitter)'),
    copyBtn,
  );

  byline.append(avatar, authorBlock, share);

  // ── Assemble ────────────────────────────────────────────────────────────────
  block.append(breadcrumb, badges, h1, byline);
}
