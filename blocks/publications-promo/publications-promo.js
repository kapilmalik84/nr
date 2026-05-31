export default function decorate(block) {
  const row = block.children[0];
  if (!row) return;
  const cols = [...row.children];

  const imageCol = document.createElement('div');
  imageCol.className = 'promo-image';
  const pic = cols[0] ? cols[0].querySelector('picture') : null;
  if (pic) imageCol.append(pic);

  const textCol = document.createElement('div');
  textCol.className = 'promo-text';
  if (cols[1]) textCol.append(...[...cols[1].childNodes]);

  const cta = textCol.querySelector('a');
  if (cta) cta.classList.add('button');

  block.textContent = '';
  block.append(imageCol, textCol);
}
