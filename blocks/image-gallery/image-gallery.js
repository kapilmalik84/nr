import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Image Gallery block — scrollable image carousel with captions.
 * Content model (Collection):
 *   | Image Gallery |
 *   | ![photo](img1.jpg) | Caption for image 1 |
 *   | ![photo](img2.jpg) | Caption for image 2 |
 *
 * @param {Element} block the image-gallery block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  const track = document.createElement('div');
  track.className = 'gallery-track';

  const slides = [];

  rows.forEach((row, i) => {
    const cols = [...row.children];
    const slide = document.createElement('figure');
    slide.className = 'gallery-slide';
    if (i === 0) slide.classList.add('active');

    // Image
    const picture = cols[0]?.querySelector('picture');
    if (picture) {
      const img = picture.querySelector('img');
      const optimized = createOptimizedPicture(
        img.src,
        img.alt || '',
        i === 0,
        [{ width: '800' }],
      );
      slide.append(optimized);
    }

    // Caption
    const captionText = cols[1]?.textContent?.trim();
    if (captionText) {
      const caption = document.createElement('figcaption');
      caption.textContent = captionText;
      slide.append(caption);
    }

    slides.push(slide);
    track.append(slide);
  });

  // Only add navigation if more than 1 image
  if (slides.length <= 1) {
    block.replaceChildren(track);
    return;
  }

  let currentIndex = 0;

  function goTo(index) {
    slides[currentIndex].classList.remove('active');
    currentIndex = (index + slides.length) % slides.length;
    slides[currentIndex].classList.add('active');
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    counter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  // Navigation controls
  const controls = document.createElement('div');
  controls.className = 'gallery-controls';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'gallery-prev';
  prevBtn.setAttribute('aria-label', 'Previous image');
  prevBtn.textContent = '‹';
  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'gallery-next';
  nextBtn.setAttribute('aria-label', 'Next image');
  nextBtn.textContent = '›';
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  const counter = document.createElement('span');
  counter.className = 'gallery-counter';
  counter.textContent = `1 / ${slides.length}`;

  controls.append(prevBtn, counter, nextBtn);

  const viewport = document.createElement('div');
  viewport.className = 'gallery-viewport';
  viewport.append(track);

  block.replaceChildren(viewport, controls);
}
