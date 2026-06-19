/**
 * CTA block — newsletter band and generic call-to-action
 *
 * Variant: "CTA (newsletter)" → .cta.newsletter
 *
 * Authoring (single-column table):
 *   | CTA (newsletter)                                              |
 *   |---------------------------------------------------------------|
 *   | ## Get the Newsroom in your inbox                             |
 *   | Media releases, community stories… — delivered weekly.        |
 *   | [Subscribe link → /signup]  (optional — sets form action)     |
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4');
  const allParas = [...block.querySelectorAll('p')];
  const actionLink = block.querySelector('a');
  const signupHref = actionLink?.href || '/signup';

  // Subtitle paragraphs: not the one that only contains the action link
  const subtitleParas = allParas.filter((p) => {
    if (!p.textContent.trim()) return false;
    const a = p.querySelector('a');
    return !(a && p.textContent.trim() === a.textContent.trim());
  });

  block.textContent = '';

  // ── Text column ──────────────────────────────────────────────────────────
  const textCol = document.createElement('div');
  textCol.className = 'cta-text';

  if (heading) {
    heading.className = 'cta-heading';
    textCol.append(heading);
  }

  subtitleParas.forEach((p) => {
    p.className = 'cta-subtitle';
    textCol.append(p);
  });

  // ── Form column ──────────────────────────────────────────────────────────
  const formCol = document.createElement('div');
  formCol.className = 'cta-form-col';

  const form = document.createElement('form');
  form.className = 'cta-form';
  form.setAttribute('novalidate', '');

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.name = 'email';
  emailInput.className = 'cta-email';
  emailInput.placeholder = 'your.email@example.com';
  emailInput.setAttribute('aria-label', 'Email address for newsletter');
  emailInput.autocomplete = 'email';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'cta-submit';
  submitBtn.textContent = 'Subscribe';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid) {
      emailInput.focus();
      return;
    }
    // Only redirect to same-origin or relative paths to prevent open-redirect abuse
    const dest = new URL(signupHref, window.location.href);
    if (dest.origin !== window.location.origin) {
      emailInput.focus();
      return;
    }
    dest.searchParams.set('email', email);
    window.location.href = dest.toString();
  });

  form.append(emailInput, submitBtn);
  formCol.append(form);

  block.append(textCol, formCol);
}
