import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  const track = document.createElement('div');
  track.className = 'gallery-track';
  track.setAttribute('role', 'group');
  track.setAttribute('aria-roledescription', 'carousel');

  const slides = [];
  let currentIndex = 0;

  const counter = document.createElement('span');
  counter.className = 'gallery-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');
  counter.textContent = `1 / ${rows.length}`;

  rows.forEach((row, i) => {
    const cols = [...row.children];
    const slide = document.createElement('figure');
    slide.className = 'gallery-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${rows.length}`);
    slide.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');
    if (i === 0) slide.classList.add('active');

    const pic = cols[0] ? cols[0].querySelector('picture') : null;
    if (pic) {
      const img = pic.querySelector('img');
      const optimized = createOptimizedPicture(img.src, img.alt || '', i === 0, [{ width: '800' }]);
      // Lazy-load off-screen slides
      const slideImg = optimized.querySelector('img');
      if (slideImg && i !== 0) slideImg.loading = 'lazy';
      slide.append(optimized);
    }

    const captionText = cols[1] ? cols[1].textContent.trim() : '';
    if (captionText) {
      const caption = document.createElement('figcaption');
      caption.textContent = captionText;
      slide.append(caption);
    }

    slides.push(slide);
    track.append(slide);
  });

  if (slides.length <= 1) {
    block.textContent = '';
    block.append(track);
    return;
  }

  function goTo(index) {
    slides[currentIndex].classList.remove('active');
    slides[currentIndex].setAttribute('aria-hidden', 'true');
    currentIndex = (index + slides.length) % slides.length;
    slides[currentIndex].classList.add('active');
    slides[currentIndex].setAttribute('aria-hidden', 'false');
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    counter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  const controls = document.createElement('div');
  controls.className = 'gallery-controls';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'gallery-prev';
  prevBtn.setAttribute('aria-label', 'Previous image');
  prevBtn.textContent = '\u2039';
  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'gallery-next';
  nextBtn.setAttribute('aria-label', 'Next image');
  nextBtn.textContent = '\u203A';
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  controls.append(prevBtn, counter, nextBtn);

  const viewport = document.createElement('div');
  viewport.className = 'gallery-viewport';
  viewport.setAttribute('tabindex', '0');
  viewport.setAttribute('aria-label', 'Image gallery — use arrow keys to navigate');
  viewport.append(track);

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex + 1); }
  });

  block.textContent = '';
  block.append(viewport, controls);
}
