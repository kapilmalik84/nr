import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SOCIAL_LINKS = [
  {
    href: 'https://www.facebook.com/australiapost',
    src: '/assets/icons/icon-facebook.svg',
    label: 'Facebook',
  },
  {
    href: 'https://www.linkedin.com/company/australia-post/',
    src: '/assets/icons/icon-linkedin.svg',
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

  const paras = [...fragment.querySelectorAll('p')];
  const copyrightP = paras.find((p) => p.textContent.includes('Copyright'));
  const ackP = paras.find((p) => p.textContent.includes('Traditional Custodians'));

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
      img.width = 24;
      img.height = 24;
      a.append(img);
      socialDiv.append(a);
    });

    legalRow.append(copyrightSpan, socialDiv);
    footer.append(legalRow);
  }

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
    footer.append(ackRow);
  }

  block.append(footer);
}
