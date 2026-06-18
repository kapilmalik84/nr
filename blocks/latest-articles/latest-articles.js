import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

const DEFAULT_IMAGE = 'https://newsroom.auspost.com.au/uploads/defaults/Female-with-Express-Post-Parcel-optimised.jpg';
const BAD_DEFAULTS = ['photo-man-reading-on-tablet', 'default-meta-image'];

function resolveImage(url) {
  if (!url || BAD_DEFAULTS.some((s) => url.includes(s))) return DEFAULT_IMAGE;
  return url;
}

function renderCard(article) {
  const card = document.createElement('li');
  card.className = 'card';

  const imageUrl = resolveImage(article.image);
  if (imageUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    const pic = createOptimizedPicture(imageUrl, '', false, [{ width: '480' }]);
    const img = pic.querySelector('img');
    if (img) img.addEventListener('error', () => { imgWrap.remove(); });
    link.append(pic);
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
    if (article.category) meta.textContent += ` | ${article.category}`;
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

  const cta = document.createElement('a');
  cta.href = article.path;
  cta.className = 'card-cta';
  cta.textContent = 'Read more';
  text.append(cta);

  card.append(text);
  return card;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);

  // Config options (set as rows in the DA block table):
  //   limit    — number of cards to show (default 6)
  //   filter   — path prefix e.g. /section/stamps/ to restrict to one section
  //   view-all — URL for the "View all" link (default /archive/news/)
  //   source   — custom query-index URL (default /query-index.json)
  const limit = parseInt(config.limit, 10) || 6;
  const filterPath = (config.filter || '').trim().replace(/\/?$/, '/');
  const viewAllHref = (config['view-all'] || '').trim();
  const source = config.source || '/query-index.json';

  block.textContent = '';

  try {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`${resp.status}`);
    const json = await resp.json();
    let articles = json.data || [];

    // Optionally restrict to a section by path prefix
    if (filterPath && filterPath !== '/') {
      articles = articles.filter((a) => (a.path || '').startsWith(filterPath));
    }

    // Most recent first
    articles.sort((a, b) => (b.date || 0) - (a.date || 0));
    articles = articles.slice(0, limit);

    if (articles.length === 0) {
      block.textContent = 'No articles found.';
      return;
    }

    const grid = document.createElement('ul');
    grid.className = 'cards-grid';
    articles.forEach((a) => grid.append(renderCard(a)));
    block.append(grid);

    if (viewAllHref) {
      const footer = document.createElement('div');
      footer.className = 'latest-articles-footer';
      const viewAll = document.createElement('a');
      viewAll.href = viewAllHref;
      viewAll.className = 'latest-articles-view-all';
      viewAll.textContent = 'View all articles';
      footer.append(viewAll);
      block.append(footer);
    }
  } catch (e) {
    block.textContent = 'Unable to load articles.';
  }
}
