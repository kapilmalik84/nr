import { createOptimizedPicture } from '../../scripts/aem.js';

function renderResult(article) {
  const item = document.createElement('div');
  item.className = 'search-result';

  if (article.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'result-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.append(createOptimizedPicture(article.image, article.title || '', false, [{ width: '200' }]));
    imgWrap.append(link);
    item.append(imgWrap);
  }

  const text = document.createElement('div');
  text.className = 'result-text';

  const title = document.createElement('h4');
  const titleLink = document.createElement('a');
  titleLink.href = article.path;
  titleLink.textContent = article.title || '';
  title.append(titleLink);
  text.append(title);

  if (article.description) {
    const desc = document.createElement('p');
    desc.textContent = article.description;
    text.append(desc);
  }

  item.append(text);
  return item;
}

export default async function decorate(block) {
  const placeholderText = block.textContent.trim() || 'Search the newsroom';
  block.textContent = '';

  const form = document.createElement('div');
  form.className = 'search-form';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholderText;
  input.setAttribute('aria-label', 'Search');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'search-btn';
  btn.textContent = 'Search';

  form.append(input, btn);

  const results = document.createElement('div');
  results.className = 'search-results';

  let articles = null;

  async function loadIndex() {
    if (articles) return articles;
    const resp = await fetch('/query-index.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    articles = json.data || [];
    return articles;
  }

  async function doSearch(query) {
    if (!query || query.length < 2) {
      results.textContent = '';
      return;
    }
    const data = await loadIndex();
    const q = query.toLowerCase();
    const matched = data.filter((a) => {
      const searchable = [a.title || '', a.description || '', a.category || ''].join(' ').toLowerCase();
      return searchable.includes(q);
    });
    results.textContent = '';
    const info = document.createElement('p');
    info.className = 'search-info';
    info.textContent = `${matched.length} result${matched.length !== 1 ? 's' : ''} for "${query}"`;
    results.append(info);
    if (matched.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.innerHTML = `<strong>No results found</strong>Try different keywords or check the spelling.`;
      results.append(noResults);
    } else {
      matched.slice(0, 20).forEach((a) => results.append(renderResult(a)));
    }
  }

  btn.addEventListener('click', () => doSearch(input.value.trim()));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch(input.value.trim());
  });

  block.append(form, results);

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    input.value = q;
    doSearch(q);
  }
}
