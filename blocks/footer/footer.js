import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SOCIAL_LINKS = [
  {
    href: 'https://www.facebook.com/australiapost',
    src: 'https://newsroom.auspost.com.au/assets/img/icon-facebook.svg',
    label: 'Facebook',
  },
  {
    href: 'https://www.linkedin.com/company/australia-post/',
    src: 'https://newsroom.auspost.com.au/assets/img/icon-linkedin.svg',
    label: 'LinkedIn',
  },
];

const ACK_IMAGE_SRC = 'https://newsroom.auspost.com.au/assets/img/acknowledgement.svg';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // Identify the three content paragraphs by pattern
  const paras = [...footer.querySelectorAll('p')];
  const copyrightP = paras.find((p) => p.textContent.includes('Copyright'));
  const ackP = paras.find((p) => p.textContent.includes('Traditional Custodians'));

  // Copyright row: copyright text + social icons
  if (copyrightP) {
    const legalRow = document.createElement('div');
    legalRow.className = 'footer-legal';

    const copyrightSpan = document.createElement('span');
    copyrightSpan.className = 'footer-copyright';
    copyrightSpan.innerHTML = copyrightP.innerHTML;

    const socialDiv = document.createElement('div');
    socialDiv.className = 'footer-social';
    SOCIAL_LINKS.forEach(({ href, src, label }) => {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', label);
      const img = document.createElement('img');
      img.src = src;
      img.alt = label;
      img.width = 32;
      img.height = 32;
      a.append(img);
      socialDiv.append(a);
    });

    legalRow.append(copyrightSpan, socialDiv);
    copyrightP.replaceWith(legalRow);
  }

  // Acknowledgement row: RAP image + text
  if (ackP) {
    const ackRow = document.createElement('div');
    ackRow.className = 'footer-acknowledgement';

    const img = document.createElement('img');
    img.src = ACK_IMAGE_SRC;
    img.alt = 'Acknowledgement of Country artwork';
    img.width = 80;
    img.height = 80;

    const textSpan = document.createElement('span');
    textSpan.textContent = ackP.textContent;

    ackRow.append(img, textSpan);
    ackP.replaceWith(ackRow);
  }

  block.append(footer);
}
