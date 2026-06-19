import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SOCIAL_LINKS = [
  {
    href: 'https://www.facebook.com/australiapost',
    src: '/assets/icons-logos/icon-facebook.svg',
    label: 'Facebook',
  },
  {
    href: 'https://www.linkedin.com/company/australia-post/',
    src: '/assets/icons-logos/icon-linkedin.svg',
    label: 'LinkedIn',
  },
];

const ACK_IMAGE_SRC = '/assets/acknowledgement.svg';
const BRAND_DESC = 'The official source for Australia Post news, media releases and stories.';

/* Build the brand column (always col 1) */
function buildBrandCol(descText) {
  const col = document.createElement('div');
  col.className = 'footer-brand-col';

  const lockup = document.createElement('div');
  lockup.className = 'footer-brand-lockup';

  const roundel = document.createElement('span');
  roundel.className = 'footer-roundel';
  roundel.setAttribute('aria-hidden', 'true');
  roundel.textContent = 'P';

  const name = document.createElement('span');
  name.className = 'footer-brand-name';
  name.textContent = 'Australia Post Newsroom';

  lockup.append(roundel, name);

  const desc = document.createElement('p');
  desc.className = 'footer-brand-desc';
  desc.textContent = descText || BRAND_DESC;

  col.append(lockup, desc);
  return col;
}

/* Build a nav column from a heading text + list of links */
function buildNavCol(headingText, listEl) {
  const col = document.createElement('div');
  col.className = 'footer-nav-col';

  if (headingText) {
    const h = document.createElement('p');
    h.className = 'footer-col-heading';
    h.textContent = headingText;
    col.append(h);
  }

  if (listEl) {
    const ul = document.createElement('ul');
    ul.className = 'footer-col-links';
    [...listEl.querySelectorAll('li')].forEach((li) => {
      const newLi = document.createElement('li');
      const a = li.querySelector('a');
      if (a) {
        const link = document.createElement('a');
        link.href = a.href;
        link.textContent = a.textContent.trim();
        newLi.append(link);
      } else {
        newLi.textContent = li.textContent.trim();
      }
      ul.append(newLi);
    });
    col.append(ul);
  }

  return col;
}

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // ── Parse fragment ──────────────────────────────────────────────────────────
  const allEls = [...(fragment?.children || [])].flatMap((sec) => [...sec.children]);

  const paras = allEls.filter((el) => el.tagName === 'P' || el.matches('div > p'));
  const lists = allEls.filter((el) => el.tagName === 'UL');

  const copyrightP = allEls.find((el) => el.textContent.includes('©') || el.textContent.includes('Copyright'));
  const ackP = allEls.find((el) => el.textContent.includes('Traditional Custodians') || el.textContent.includes('Elders'));
  const descP = allEls.find((el) => el.tagName === 'P' && el !== copyrightP && el !== ackP && el.textContent.trim().length > 20);

  // ── Column grid ─────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'footer-grid';

  // Col 1: brand
  grid.append(buildBrandCol(descP?.textContent.trim()));

  // Cols 2-4: built from <ul> elements in the fragment, using the preceding heading
  lists.forEach((ul) => {
    let headingText = '';
    let prev = ul.previousElementSibling;
    if (prev) {
      headingText = (prev.querySelector('strong') || prev).textContent.trim();
    }
    grid.append(buildNavCol(headingText, ul));
  });

  // Fallback: if no lists in fragment, add placeholder columns so layout holds
  if (lists.length === 0) {
    [
      { heading: 'Newsroom', links: [] },
      { heading: 'Media centre', links: [] },
      { heading: 'Australia Post', links: [] },
    ].forEach(({ heading }) => grid.append(buildNavCol(heading, null)));
  }

  footer.append(grid);

  // ── Legal row (copyright + social) ──────────────────────────────────────────
  const legal = document.createElement('div');
  legal.className = 'footer-legal';

  const copyright = document.createElement('span');
  copyright.className = 'footer-copyright';
  copyright.textContent = copyrightP?.textContent.trim()
    || `© ${new Date().getFullYear()} Australia Post. All rights reserved.`;
  legal.append(copyright);

  const socialNav = document.createElement('nav');
  socialNav.className = 'footer-social';
  socialNav.setAttribute('aria-label', 'Social media links');

  SOCIAL_LINKS.forEach(({ href, src, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'footer-social-link';
    a.setAttribute('aria-label', label);
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    img.width = 18;
    img.height = 18;
    a.append(img);
    socialNav.append(a);
  });

  legal.append(socialNav);
  footer.append(legal);

  // ── Acknowledgement strip ────────────────────────────────────────────────────
  const ackText = ackP?.textContent.trim()
    || 'Australia Post acknowledges the Traditional Custodians of the land on which we operate, live and gather as employees, and recognises their continuing connection to land, water and community. We pay respect to Elders past, present and emerging.';

  const ack = document.createElement('div');
  ack.className = 'footer-acknowledgement';

  const ackImg = document.createElement('img');
  ackImg.src = ACK_IMAGE_SRC;
  ackImg.alt = 'Acknowledgement of Country artwork';
  ackImg.width = 64;
  ackImg.height = 64;
  ackImg.loading = 'lazy';

  const ackSpan = document.createElement('span');
  ackSpan.textContent = ackText;

  ack.append(ackImg, ackSpan);
  footer.append(ack);

  block.append(footer);
}
