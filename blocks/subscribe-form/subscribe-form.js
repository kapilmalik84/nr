export default function decorate(block) {
  const heading = block.querySelector('strong, h1, h2, h3');
  const descriptionP = [...block.querySelectorAll('p')].find((p) => !p.querySelector('strong, a'));
  const descriptionText = descriptionP ? descriptionP.textContent.trim() : '';
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'subscribe-container';

  const h1 = document.createElement('h1');
  h1.textContent = heading ? heading.textContent : 'Media sign up';
  container.append(h1);

  if (descriptionText) {
    const desc = document.createElement('p');
    desc.className = 'subscribe-description';
    desc.textContent = descriptionText;
    container.append(desc);
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
  status.setAttribute('aria-live', 'polite');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button';
  submitBtn.textContent = 'Sign Up';

  form.append(submitBtn, status);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstName = form.querySelector('#firstName');
    const lastName = form.querySelector('#lastName');
    const email = form.querySelector('#email');
    const privacy = form.querySelector('#privacy');

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

    // Replace form with success panel
    const success = document.createElement('div');
    success.className = 'subscribe-success';
    success.innerHTML = `
      <p class="subscribe-success-heading">Thank you for subscribing!</p>
      <p>You'll receive the latest news and updates from Australia Post Newsroom in your inbox.</p>
    `;
    form.replaceWith(success);
  });

  container.append(form);
  block.append(container);
}
