import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

function renderCard(article) {
  const card = document.createElement('li');
  card.className = 'card';

  if (article.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    link.append(createOptimizedPicture(article.image, article.title || '', false, [{ width: '480' }]));
    imgWrap.append(link);
    card.append(imgWrap);
  }

  const text = document.createElement('div');
  text.className = 'card-text';

  if (article.date) {
    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const d = new Date(article.date * 1000);
    meta.textContent = d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    text.append(meta);
  }

  const title = document.createElement('h4');
  title.className = 'card-title';
  const titleLink = document.createElement('a');
  titleLink.href = article.path;
  titleLink.textContent = article.title || '';
  title.append(titleLink);
  text.append(title);

  if (article.description) {
    const desc = document.createElement('p');
    desc.className = 'card-excerpt';
    desc.textContent = article.description;
    text.append(desc);
  }

  card.append(text);
  return card;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const source = config.source || '/query-index.json';
  const limit = parseInt(config.limit, 10) || 12;
  const category = (config.category || '').toLowerCase();

  block.textContent = 'Loading…';

  try {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error('Failed to fetch');
    const json = await resp.json();
    let articles = json.data || [];

    if (category) {
      articles = articles.filter((a) => (a.category || '').toLowerCase().includes(category));
    }

    articles.sort((a, b) => (b.date || 0) - (a.date || 0));
    articles = articles.slice(0, limit);

    block.textContent = '';

    if (articles.length === 0) {
      block.textContent = 'No articles found.';
      return;
    }

    const grid = document.createElement('ul');
    grid.className = 'cards-grid';
    articles.forEach((article) => grid.append(renderCard(article)));
    block.append(grid);
  } catch (e) {
    block.textContent = 'Unable to load articles.';
  }
}
