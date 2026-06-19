/**
 * photo-grid — delegates to the unified Gallery block (photo-grid variant).
 *
 * DA content using "Photo Grid" block name continues to work unchanged.
 * Adding .photo-grid class routes gallery.js to decoratePhotoGrid().
 */
import galleryDecorate from '../gallery/gallery.js';

export default function decorate(block) {
  block.classList.add('photo-grid');
  return galleryDecorate(block);
}
