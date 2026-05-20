/**
 * Subscribe Form block — email subscription form.
 * Content model (Standalone):
 *   | Subscribe Form |
 *   | **Subscribe to Australia Post Newsroom** |
 *   | Receive the latest news and media releases |
 *
 * NOTE: The form endpoint must be configured. Options:
 * 1. Set data-action attribute in section metadata
 * 2. Configure endpoint in the block code below (FORM_ENDPOINT)
 * 3. Use AEM Forms integration
 *
 * @param {Element} block the subscribe-form block element
 */

// TODO: Replace with actual form submission endpoint
const FORM_ENDPOINT = '/api/subscribe';

export default async function decorate(block) {
  const heading = block.querySelector('h2, h3, h4, strong');
  const paragraphs = block.querySelectorAll('p');

  const container = document.createElement('div');
  container.className = 'subscribe-container';

  // Text content
  const textSection = document.createElement('div');
  textSection.className = 'subscribe-text';

  if (heading) {
    const title = document.createElement('h3');
    title.textContent = heading.textContent;
    textSection.append(title);
  }

  paragraphs.forEach((p) => {
    if (p.textContent.trim() && p !== heading?.closest('p')) {
      const desc = document.createElement('p');
      desc.textContent = p.textContent;
      textSection.append(desc);
    }
  });

  container.append(textSection);

  // Form
  const formEl = document.createElement('div');
  formEl.className = 'subscribe-form';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'Enter your email address';
  emailInput.required = true;
  emailInput.setAttribute('aria-label', 'Email address');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'button';
  submitBtn.textContent = 'Subscribe';

  const status = document.createElement('p');
  status.className = 'subscribe-status';

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) {
      status.textContent = 'Please enter a valid email address.';
      status.className = 'subscribe-status error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing…';

    try {
      const resp = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (resp.ok) {
        status.textContent = 'Thank you for subscribing!';
        status.className = 'subscribe-status success';
        emailInput.value = '';
      } else {
        throw new Error('Subscription failed');
      }
    } catch {
      status.textContent = 'Something went wrong. Please try again later.';
      status.className = 'subscribe-status error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Subscribe';
    }
  });

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });

  formEl.append(emailInput, submitBtn);
  container.append(formEl, status);

  block.replaceChildren(container);
}
