import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Article Cards block — grid of article teasers.
 * Content model (Collection):
 *   | Article Cards |
 *   | ![image](img.jpg) | **Title** Excerpt text [Read more](/slug) |
 *   | ![image](img.jpg) | **Title** Excerpt text [Read more](/slug) |
 *
 * Variant: article-cards (compact) — smaller cards for listing pages
 * @param {Element} block the article-cards block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const grid = document.createElement('ul');
  grid.className = 'cards-grid';

  rows.forEach((row) => {
    const cols = [...row.children];
    const card = document.createElement('li');
    card.className = 'card';

    // Column 1: image
    const imageCol = cols[0];
    const picture = imageCol?.querySelector('picture');
    if (picture) {
      const img = picture.querySelector('img');
      const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '480' }]);
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image';
      imageWrap.append(optimized);

      // Wrap image in link if there's a CTA
      const link = cols[1]?.querySelector('a');
      if (link) {
        const imageLink = document.createElement('a');
        imageLink.href = link.href;
        imageLink.setAttribute('aria-hidden', 'true');
        imageLink.tabIndex = -1;
        imageLink.append(optimized);
        imageWrap.append(imageLink);
      } else {
        imageWrap.append(optimized);
      }

      card.append(imageWrap);
    }

    // Column 2: text content
    const textCol = cols[1];
    if (textCol) {
      const textWrap = document.createElement('div');
      textWrap.className = 'card-text';

      // Find heading (strong or h-tag)
      const heading = textCol.querySelector('h2, h3, h4, strong');
      if (heading) {
        const titleEl = document.createElement('h4');
        titleEl.className = 'card-title';

        // Wrap heading in link if CTA exists
        const link = textCol.querySelector('a');
        if (link) {
          const titleLink = document.createElement('a');
          titleLink.href = link.href;
          titleLink.textContent = heading.textContent;
          titleEl.append(titleLink);
        } else {
          titleEl.textContent = heading.textContent;
        }
        textWrap.append(titleEl);
      }

      // Extract excerpt text (paragraphs that aren't just the heading or CTA)
      const allP = textCol.querySelectorAll('p');
      allP.forEach((p) => {
        const isHeading = p.querySelector('strong') === heading;
        const isCta = p.querySelector('a.button');
        if (!isHeading && !isCta && p.textContent.trim()) {
          const excerpt = document.createElement('p');
          excerpt.className = 'card-excerpt';
          excerpt.textContent = p.textContent;
          textWrap.append(excerpt);
        }
      });

      // Read more link
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

  block.replaceChildren(grid);
}
