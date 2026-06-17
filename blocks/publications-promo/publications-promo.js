const BOOK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
</svg>`;

export default function decorate(block) {
  const row = block.children[0];
  if (!row) return;

  // Col 0: unused image slot (empty in migrated content)
  // Col 1: text — heading, description, ul nav links, CTA paragraph
  const textCol = row.children[1] || row.children[0];
  if (!textCol) return;

  const heading = textCol.querySelector('h3, h2');
  const desc = [...textCol.querySelectorAll('p')].find((p) => !p.querySelector('a'));
  const navList = textCol.querySelector('ul');
  const ctaLink = textCol.querySelector('p > a[href]');

  block.textContent = '';

  // Icon badge
  const iconBadge = document.createElement('div');
  iconBadge.className = 'promo-icon';
  iconBadge.innerHTML = BOOK_ICON;
  block.append(iconBadge);

  // Heading
  if (heading) {
    const h = document.createElement('h3');
    h.className = 'promo-heading';
    h.textContent = heading.textContent;
    block.append(h);
  }

  // Description
  if (desc) {
    const p = document.createElement('p');
    p.className = 'promo-desc';
    p.textContent = desc.textContent;
    block.append(p);
  }

  // Nav links list
  if (navList) {
    const nav = document.createElement('ul');
    nav.className = 'promo-nav';
    [...navList.querySelectorAll('li a')].forEach((a) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = a.href;
      link.textContent = a.textContent;
      li.append(link);
      nav.append(li);
    });
    block.append(nav);
  }

  // CTA button
  if (ctaLink) {
    const cta = document.createElement('a');
    cta.href = ctaLink.href;
    cta.className = 'promo-cta button';
    cta.textContent = ctaLink.textContent;
    block.append(cta);
  }
}
