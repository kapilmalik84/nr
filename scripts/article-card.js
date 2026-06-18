/**
 * Shared article card rendering logic used by article-list and latest-articles.
 * Centralised here so image-resolution rules and card markup are maintained once.
 */

import { createOptimizedPicture } from './aem.js';

export const DEFAULT_IMAGE = 'https://main--nr--kapilmalik84.aem.page/assets/images/defaults/female-with-express-post-parcel-optimised.jpg';
export const STAMP_DEFAULT_IMAGE = '/assets/images/stamp-placeholder.png';

const BAD_DEFAULTS = ['photo-man-reading-on-tablet', 'default-meta-image'];

// AEM media proxy hash of the default Female-with-Express-Post-Parcel image —
// appears in query index when an article has no real image and was migrated with
// that URL as the og:image fallback.
const FEMALE_PARCEL_MEDIA_HASH = '1010d36fe031';

export function resolveImage(url, isStamp) {
  if (!url || BAD_DEFAULTS.some((s) => url.includes(s))) {
    return isStamp ? STAMP_DEFAULT_IMAGE : DEFAULT_IMAGE;
  }
  if (isStamp && url.includes(FEMALE_PARCEL_MEDIA_HASH)) return STAMP_DEFAULT_IMAGE;
  return url;
}

export function renderCard(article) {
  const card = document.createElement('li');
  card.className = 'card';
  const isStamp = (article.path || '').startsWith('/section/');
  if (isStamp) card.classList.add('card-stamp');

  const imageUrl = resolveImage(article.image, isStamp);
  if (imageUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    const pic = createOptimizedPicture(imageUrl, '', false, [{ width: '480' }]);
    const img = pic.querySelector('img');
    if (img) img.addEventListener('error', () => { imgWrap.remove(); });
    link.append(pic);
    imgWrap.append(link);
    card.append(imgWrap);
  }

  const text = document.createElement('div');
  text.className = 'card-text';

  if (article.date) {
    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const d = new Date(article.date * 1000);
    meta.textContent = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    if (article.category) meta.textContent += ` | ${article.category}`;
    text.append(meta);
  }

  const title = document.createElement('h4');
  title.className = 'card-title';
  const titleLink = document.createElement('a');
  titleLink.href = article.path;
  titleLink.textContent = article.title || '';
  title.append(titleLink);
  text.append(title);

  if (article.description) {
    const desc = document.createElement('p');
    desc.className = 'card-excerpt';
    desc.textContent = article.description;
    text.append(desc);
  }

  const cta = document.createElement('a');
  cta.href = article.path;
  cta.className = 'card-cta';
  cta.textContent = 'Read more';
  text.append(cta);

  card.append(text);
  return card;
}
