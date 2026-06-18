import { readBlockConfig } from '../../scripts/aem.js';

function isImageRow(row) {
  return !!row.querySelector('picture, img');
}

export default function decorate(block) {
  const config = readBlockConfig(block);
  const filesHeading = config['files-heading'] || 'Downloads';
  const photosHeading = config['photos-heading'] || 'High Resolution Photos';
  const photosNote = config['photos-note'] || 'All photos © by their respective copyright owners and have been authorised for Editorial use only.';

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
    heading.textContent = filesHeading;
    block.append(heading, fileLinks);
  }

  if (photos.children.length) {
    const heading = document.createElement('h4');
    heading.textContent = photosHeading;
    const note = document.createElement('p');
    note.className = 'downloads-note';
    note.textContent = photosNote;
    block.append(heading, note, photos);
  }
}
