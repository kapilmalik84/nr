/*
 * Downloads Block
 * Authored as rows: either a link to a downloadable file (e.g. PDF), or an
 * image + caption (high-resolution photo for media use). Renders a PDF link
 * list followed by a photo grid of download links.
 */

function isImageRow(row) {
  return !!row.querySelector('picture, img');
}

export default function decorate(block) {
  const rows = [...block.children];
  const fileLinks = document.createElement('ul');
  fileLinks.className = 'downloads-files';

  const photos = document.createElement('ul');
  photos.className = 'downloads-photos';

  rows.forEach((row) => {
    if (isImageRow(row)) {
      const picture = row.querySelector('picture');
      const link = row.querySelector('a');
      const caption = row.querySelector('div:last-child')?.textContent?.trim() || '';
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link ? link.href : (picture?.querySelector('img')?.src || '#');
      a.target = '_blank';
      a.rel = 'noopener';
      if (picture) a.append(picture);
      const figcaption = document.createElement('span');
      figcaption.className = 'downloads-photo-caption';
      figcaption.textContent = caption;
      a.append(figcaption);
      li.append(a);
      photos.append(li);
    } else {
      const link = row.querySelector('a');
      if (!link) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = link.textContent.trim() || 'Download';
      li.append(a);
      fileLinks.append(li);
    }
  });

  block.textContent = '';

  if (fileLinks.children.length) {
    const heading = document.createElement('h4');
    heading.textContent = 'Downloads';
    block.append(heading, fileLinks);
  }

  if (photos.children.length) {
    const heading = document.createElement('h4');
    heading.textContent = 'High Resolution Photos';
    const note = document.createElement('p');
    note.className = 'downloads-note';
    note.textContent = 'All photos © by their respective copyright owners and have been authorised for Editorial use only.';
    block.append(heading, note, photos);
  }
}
