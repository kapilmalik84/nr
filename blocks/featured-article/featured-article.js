/**
 * Featured Article block — homepage feature with teaser image + article intro.
 * Content model (Standalone):
 *   | Featured Article |
 *   | ![teaser](image.jpg) | ## Title Excerpt text [Read more](/slug) |
 *
 * @param {Element} block the featured-article block element
 */
export default async function decorate(block) {
  const cols = [...block.children][0]?.children;
  if (!cols || cols.length < 2) return;

  const imageCol = document.createElement('div');
  imageCol.className = 'feature-image';
  const picture = cols[0].querySelector('picture');
  if (picture) imageCol.append(picture);

  const textCol = document.createElement('div');
  textCol.className = 'feature-text';
  textCol.append(...cols[1].childNodes);

  // Ensure the CTA link has a button class
  const cta = textCol.querySelector('a');
  if (cta) cta.classList.add('button');

  block.replaceChildren(imageCol, textCol);
}
