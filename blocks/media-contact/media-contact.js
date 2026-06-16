/*
 * Media Contact Block
 * Authored as rows of "Name, M: <mobile>, E: <email>" text, with the
 * Australia Post National Media Line as the last row (optional).
 * Converts phone numbers and emails into tel:/mailto: links.
 */

function linkify(text) {
  const frag = document.createDocumentFragment();
  const re = /(\+?\d[\d\s]{6,}\d)|([\w.+-]+@[\w-]+\.[\w.-]+)/g;
  let lastIndex = 0;
  let match = re.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      frag.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const a = document.createElement('a');
    if (match[1]) {
      a.href = `tel:${match[1].replace(/\s+/g, '')}`;
      a.textContent = match[1];
    } else {
      a.href = `mailto:${match[2]}`;
      a.textContent = match[2];
    }
    frag.append(a);
    lastIndex = re.lastIndex;
    match = re.exec(text);
  }
  if (lastIndex < text.length) {
    frag.append(document.createTextNode(text.slice(lastIndex)));
  }
  return frag;
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.className = 'media-contact-row';
    const cell = row.firstElementChild;
    if (!cell) return;
    const text = cell.textContent.trim();
    cell.textContent = '';
    cell.append(linkify(text));
  });
}
