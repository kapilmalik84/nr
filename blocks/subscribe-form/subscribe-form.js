import { readBlockConfig } from '../../scripts/aem.js';

export default function decorate(block) {
  const config = readBlockConfig(block);

  // Endpoint must be configured in the DA block table as: endpoint | <url>
  const endpoint = (config.endpoint || '').trim();

  const heading = block.querySelector('strong, h1, h2, h3');
  const descriptionP = [...block.querySelectorAll('p')].find((p) => !p.querySelector('strong, a'));
  const descriptionText = descriptionP ? descriptionP.textContent.trim() : '';
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'subscribe-container';

  const existingH1 = document.querySelector('main h1');
  const h = document.createElement(existingH1 ? 'h2' : 'h1');
  h.textContent = heading ? heading.textContent : 'Media sign up';
  container.append(h);

  if (descriptionText) {
    const desc = document.createElement('p');
    desc.className = 'subscribe-description';
    desc.textContent = descriptionText;
    container.append(desc);
  }

  // If no endpoint is configured, show a holding message rather than a broken form.
  if (!endpoint) {
    const notice = document.createElement('p');
    notice.className = 'subscribe-unavailable';
    notice.textContent = (config['unavailable-message'] || '').trim()
      || 'Subscription sign-up is temporarily unavailable. Please check back soon.';
    container.append(notice);
    block.append(container);
    return;
  }

  const form = document.createElement('form');
  form.className = 'subscribe-form';
  form.setAttribute('novalidate', '');

  const fields = [
    {
      name: 'firstName', label: 'First Name', type: 'text', required: true,
    },
    {
      name: 'lastName', label: 'Last Name', type: 'text', required: true,
    },
    {
      name: 'email', label: 'Email', type: 'email', required: true,
    },
  ];

  fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const input = document.createElement('input');
    input.type = field.type;
    input.name = field.name;
    input.id = field.name;
    input.placeholder = field.label;
    input.required = field.required;
    input.setAttribute('aria-label', field.label);
    const label = document.createElement('label');
    label.htmlFor = field.name;
    label.textContent = field.label;
    group.append(label, input);
    form.append(group);
  });

  const privacyGroup = document.createElement('div');
  privacyGroup.className = 'form-group form-checkbox';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'privacy';
  checkbox.name = 'privacy';
  checkbox.required = true;
  const privacyLabel = document.createElement('label');
  privacyLabel.htmlFor = 'privacy';
  privacyLabel.innerHTML = 'Accept our <a href="https://auspost.com.au/privacy" target="_blank" rel="noopener">privacy policy</a>';
  privacyGroup.append(checkbox, privacyLabel);
  form.append(privacyGroup);

  const status = document.createElement('p');
  status.className = 'subscribe-status';
  status.setAttribute('role', 'alert');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button';
  submitBtn.textContent = 'Sign Up';

  form.append(submitBtn, status);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = form.querySelector('#firstName');
    const lastName = form.querySelector('#lastName');
    const email = form.querySelector('#email');
    const privacy = form.querySelector('#privacy');

    status.className = 'subscribe-status';
    status.textContent = '';

    if (!firstName.value.trim()) {
      status.textContent = 'Please enter your first name.';
      status.className = 'subscribe-status error';
      firstName.focus();
      return;
    }
    if (!lastName.value.trim()) {
      status.textContent = 'Please enter your last name.';
      status.className = 'subscribe-status error';
      lastName.focus();
      return;
    }
    if (!email.value.trim() || !email.validity.valid) {
      status.textContent = 'Please enter a valid email address.';
      status.className = 'subscribe-status error';
      email.focus();
      return;
    }
    if (!privacy.checked) {
      status.textContent = 'Please accept the privacy policy to continue.';
      status.className = 'subscribe-status error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.value.trim(),
          lastName: lastName.value.trim(),
          email: email.value.trim(),
        }),
      });

      if (!resp.ok) throw new Error(`${resp.status}`);

      const success = document.createElement('div');
      success.className = 'subscribe-success';
      success.innerHTML = `
        <p class="subscribe-success-heading">Thank you for subscribing!</p>
        <p>You'll receive the latest news and updates from Australia Post Newsroom in your inbox.</p>
      `;
      form.replaceWith(success);
    } catch {
      status.textContent = 'Something went wrong. Please try again later.';
      status.className = 'subscribe-status error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  });

  container.append(form);
  block.append(container);
}
