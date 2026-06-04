export default function decorate(block) {
  const heading = block.querySelector('strong, h1, h2, h3');
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'subscribe-container';

  const h1 = document.createElement('h1');
  h1.textContent = heading ? heading.textContent : 'Media sign up';
  container.append(h1);

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

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'button';
  submitBtn.textContent = 'Sign Up';

  form.append(submitBtn, status);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = form.querySelector('#email');
    const firstName = form.querySelector('#firstName');
    const privacy = form.querySelector('#privacy');

    if (!firstName.value.trim()) {
      status.textContent = 'Please enter your first name.';
      status.className = 'subscribe-status error';
      return;
    }

    if (!email.value.trim() || !email.validity.valid) {
      status.textContent = 'Please enter a valid email address.';
      status.className = 'subscribe-status error';
      return;
    }

    if (!privacy.checked) {
      status.textContent = 'Please accept the privacy policy.';
      status.className = 'subscribe-status error';
      return;
    }

    status.textContent = 'Thank you for signing up!';
    status.className = 'subscribe-status success';
    form.reset();
  });

  container.append(form);
  block.append(container);
}
