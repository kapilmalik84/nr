/**
 * Quick Links block — sidebar panel with list of links.
 * Content model (Standalone):
 *   | Quick Links |
 *   | **Quick links** |
 *   | [About Us](https://auspost.com.au/about-us) |
 *   | [Fast facts](https://auspost.com.au/...) |
 *
 * @param {Element} block the quick-links block element
 */
export default async function decorate(block) {
  const heading = block.querySelector('h2, h3, h4, strong');
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
    links.forEach((link) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent;
      if (link.hostname !== window.location.hostname) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      li.append(a);
      list.append(li);
    });
    panel.append(list);
  }

  block.replaceChildren(panel);
}
