export default function decorate(block) {
  if (block.classList.contains('newsroom')) {
    decorateNewsroomHero(block);
    return;
  }
  decorateImageHero(block);
}

/* ── Newsroom variant: red full-bleed section ── */
function decorateNewsroomHero(block) {
  const heading = block.querySelector('h1, h2');
  const allParas = [...block.querySelectorAll('p')];
  const eyebrowP = allParas[0];
  const subtitleParas = allParas.slice(1);

  block.textContent = '';

  const inner = document.createElement('div');
  inner.className = 'hero-inner';

  if (eyebrowP) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'hero-eyebrow';
    eyebrow.textContent = eyebrowP.textContent.trim();
    inner.append(eyebrow);
  }

  if (heading) {
    heading.removeAttribute('class');
    inner.append(heading);
  }

  subtitleParas.forEach((p) => {
    p.className = 'hero-subtitle';
    inner.append(p);
  });

  block.append(inner);
}

/* ── Standard hero: image background + text card ── */
function decorateImageHero(block) {
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
