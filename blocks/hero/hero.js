/**
 * Hero block — full-width banner with background image, heading, description, CTA.
 * Content model (Standalone):
 *   | Hero |
 *   | ![background](image.jpg) |
 *   | # Heading |
 *   | Description text |
 *   | [CTA Label](/path) |
 *
 * Variants: hero (dark) — dark gradient overlay
 * @param {Element} block the hero block element
 */
export default async function decorate(block) {
  const picture = block.querySelector('picture');
  const h1 = block.querySelector('h1, h2');
  const paragraphs = block.querySelectorAll('p:not(:has(picture)):not(:has(a.button))');
  const cta = block.querySelector('a.button, a');

  // Build the hero structure
  const content = document.createElement('div');
  content.className = 'hero-content';

  if (h1) content.append(h1);
  paragraphs.forEach((p) => {
    if (p.textContent.trim()) content.append(p);
  });

  if (cta) {
    cta.classList.add('button');
    const ctaWrapper = document.createElement('p');
    ctaWrapper.className = 'hero-cta';
    ctaWrapper.append(cta);
    content.append(ctaWrapper);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-inner';
  wrapper.append(content);

  // Set background image
  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      block.style.backgroundImage = `url(${img.src})`;
      img.loading = 'eager';
    }
  }

  block.replaceChildren(wrapper);
}
