export default function decorate(block) {
  const row = block.children[0];
  if (!row) return;
  const cols = [...row.children];

  const imageCol = document.createElement('div');
  imageCol.className = 'feature-image';
  const picture = cols[0] ? cols[0].querySelector('picture') : null;
  if (picture) imageCol.append(picture);

  const textCol = document.createElement('div');
  textCol.className = 'feature-text';
  if (cols[1]) textCol.append(...[...cols[1].childNodes]);

  const cta = textCol.querySelector('a');
  if (cta) cta.classList.add('button');

  block.textContent = '';
  block.append(imageCol, textCol);
}
