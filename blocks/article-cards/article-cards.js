import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rows = [...block.children];
  const grid = document.createElement('ul');
  grid.className = 'cards-grid';

  rows.forEach((row) => {
    const cols = [...row.children];
    const card = document.createElement('li');
    card.className = 'card';

    const imgCol = cols[0];
    const textCol = cols[1];

    if (imgCol) {
      const pic = imgCol.querySelector('picture');
      if (pic) {
        const img = pic.querySelector('img');
        const optimized = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '480' }]);
        const imageWrap = document.createElement('div');
        imageWrap.className = 'card-image';
        const link = textCol ? textCol.querySelector('a') : null;
        if (link) {
          const imgLink = document.createElement('a');
          imgLink.href = link.href;
          imgLink.setAttribute('aria-hidden', 'true');
          imgLink.tabIndex = -1;
          imgLink.append(optimized);
          imageWrap.append(imgLink);
        } else {
          imageWrap.append(optimized);
        }
        card.append(imageWrap);
      }
    }

    if (textCol) {
      const textWrap = document.createElement('div');
      textWrap.className = 'card-text';

      const strong = textCol.querySelector('strong');
      if (strong) {
        const title = document.createElement('h4');
        title.className = 'card-title';
        const link = textCol.querySelector('a');
        if (link) {
          const a = document.createElement('a');
          a.href = link.href;
          a.textContent = strong.textContent;
          title.append(a);
        } else {
          title.textContent = strong.textContent;
        }
        textWrap.append(title);
      }

      textCol.querySelectorAll('p').forEach((p) => {
        const hasStrong = p.querySelector('strong');
        const hasButton = p.querySelector('a.button');
        if (!hasStrong && !hasButton && p.textContent.trim()) {
          const excerpt = document.createElement('p');
          excerpt.className = 'card-excerpt';
          excerpt.textContent = p.textContent;
          textWrap.append(excerpt);
        }
      });

      const cta = textCol.querySelector('a');
      if (cta) {
        const readMore = document.createElement('a');
        readMore.href = cta.href;
        readMore.className = 'card-cta';
        readMore.textContent = cta.textContent || 'Read more';
        textWrap.append(readMore);
      }

      card.append(textWrap);
    }

    grid.append(card);
  });

  block.textContent = '';
  block.append(grid);
}
