export default function decorate(block) {
  const picture = block.querySelector('picture');
  const heading = block.querySelector('h1, h2');
  const cta = block.querySelector('a');

  const content = document.createElement('div');
  content.className = 'hero-content';

  if (heading) content.append(heading);

  block.querySelectorAll('p').forEach((p) => {
    if (!p.querySelector('picture') && !p.querySelector('a') && p.textContent.trim()) {
      content.append(p);
    }
  });

  if (cta) {
    cta.classList.add('button');
    const ctaWrap = document.createElement('p');
    ctaWrap.className = 'hero-cta';
    ctaWrap.append(cta);
    content.append(ctaWrap);
  }

  const inner = document.createElement('div');
  inner.className = 'hero-inner';
  inner.append(content);

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      block.style.backgroundImage = `url(${img.src})`;
      img.loading = 'eager';
    }
  }

  block.textContent = '';
  block.append(inner);
}
