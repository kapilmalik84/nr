export default function decorate(block) {
  const heading = block.querySelector('strong, h3, h4');
  const links = block.querySelectorAll('a');

  const panel = document.createElement('div');
  panel.className = 'links-panel';

  if (heading) {
    const title = document.createElement('h4');
    title.className = 'links-title';
    title.textContent = heading.textContent;
    panel.append(title);
  }

  if (links.length) {
    const list = document.createElement('ul');
    list.className = 'links-list';
    [...links].forEach((link) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.href;
      const label = document.createElement('span');
      label.className = 'link-label';
      label.textContent = link.textContent;
      a.append(label);
      if (link.hostname && link.hostname !== window.location.hostname) {
        a.target = '_blank';
        a.rel = 'noopener';
        const ext = document.createElement('span');
        ext.className = 'link-ext';
        ext.setAttribute('aria-hidden', 'true');
        ext.textContent = '↗';
        label.append(ext);
        const notice = document.createElement('span');
        notice.className = 'visually-hidden';
        notice.textContent = ' (opens in new tab)';
        a.append(notice);
      }
      li.append(a);
      list.append(li);
    });
    panel.append(list);
  }

  block.textContent = '';
  block.append(panel);
}
