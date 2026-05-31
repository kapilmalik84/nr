export default function decorate(block) {
  const heading = block.querySelector('strong, h2, h3');
  const desc = block.querySelector('p:not(:has(strong))');

  const container = document.createElement('div');
  container.className = 'subscribe-container';

  const textSection = document.createElement('div');
  textSection.className = 'subscribe-text';

  if (heading) {
    const h3 = document.createElement('h3');
    h3.textContent = heading.textContent;
    textSection.append(h3);
  }

  if (desc && desc.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = desc.textContent;
    textSection.append(p);
  }

  container.append(textSection);

  const formEl = document.createElement('div');
  formEl.className = 'subscribe-inputs';

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

  submitBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!email || !emailInput.validity.valid) {
      status.textContent = 'Please enter a valid email address.';
      status.className = 'subscribe-status error';
      return;
    }
    status.textContent = 'Thank you for subscribing!';
    status.className = 'subscribe-status success';
    emailInput.value = '';
  });

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });

  formEl.append(emailInput, submitBtn);
  container.append(formEl, status);

  block.textContent = '';
  block.append(container);
}
