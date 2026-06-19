import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * featured-article — simple two-column: image left, freeform text right.
 *
 * @deprecated Prefer the "Featured" block for new content.
 * This block remains for backward compatibility with migrated DA content.
 * Authoring: | image | heading / body / link |
 */
export default function decorate(block) {
  const row = block.children[0];
  if (!row) return;
  const cols = [...row.children];

  const imageCol = document.createElement('div');
  imageCol.className = 'feature-image';
  const origImg = cols[0]?.querySelector('img');
  if (origImg) {
    const opt = createOptimizedPicture(origImg.src, origImg.alt || '', false, [
      { media: '(min-width: 768px)', width: '600' },
      { width: '400' },
    ]);
    imageCol.append(opt);
  }

  const textCol = document.createElement('div');
  textCol.className = 'feature-text';
  if (cols[1]) textCol.append(...[...cols[1].childNodes]);

  const cta = textCol.querySelector('p > a');
  if (cta) cta.classList.add('button');

  block.textContent = '';
  block.append(imageCol, textCol);
}
