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

  block.textContent = '';

  // Use a <picture> element as the background so AEM's image optimisation CDN
  // applies and the browser's native fallback chain handles load errors.
  // fetchpriority="high" + loading="eager" ensures this is treated as LCP.
  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
      img.setAttribute('alt', '');
    }
    bg.append(picture);
    block.append(bg);
    block.classList.add('has-bg-image');
  }

  block.append(inner);
}
