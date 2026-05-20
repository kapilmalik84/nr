/**
 * Publications Promo block — CTA panel with image + heading + button.
 * Content model (Standalone):
 *   | Publications Promo |
 *   | ![image](tablet.jpg) | **View our latest publications** [Read more](url) |
 *
 * @param {Element} block the publications-promo block element
 */
export default async function decorate(block) {
  const cols = [...block.children][0]?.children;
  if (!cols || cols.length < 2) return;

  const imageCol = document.createElement('div');
  imageCol.className = 'promo-image';
  const picture = cols[0].querySelector('picture');
  if (picture) imageCol.append(picture);

  const textCol = document.createElement('div');
  textCol.className = 'promo-text';
  textCol.append(...cols[1].childNodes);

  const cta = textCol.querySelector('a');
  if (cta) cta.classList.add('button');

  block.replaceChildren(imageCol, textCol);
}
