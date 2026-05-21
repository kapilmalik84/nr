/**
 * Homepage template — builds the entire homepage layout from code.
 * The Google Doc content is replaced with a structured homepage.
 * Articles are fetched from query-index.json.
 */

const HERO_IMAGE = 'https://newsroom.auspost.com.au/uploads/defaults/Female-with-Express-Post-Parcel-optimised.jpg';
const PUBLICATIONS_IMAGE = 'https://newsroom.auspost.com.au/uploads/photo-man-reading-on-tablet.jpg.auspostimage.1600_0.medium.jpg';

const QUICK_LINKS = [
  { text: 'About Us', url: 'https://auspost.com.au/about-us' },
  { text: 'Important updates', url: 'https://auspost.com.au/service-updates' },
  { text: 'Executive Profiles', url: 'https://auspost.com.au/about-us/corporate-information/executive-leadership-team' },
  { text: 'Fast facts', url: 'https://auspost.com.au/about-us/news-media/fast-facts-about-australia-post' },
  { text: 'auspost.com.au', url: 'https://auspost.com.au/' },
];

async function fetchArticles() {
  try {
    const resp = await fetch('/query-index.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || [];
  } catch {
    return [];
  }
}

function createHeroSection() {
  const section = document.createElement('div');
  section.className = 'homepage-hero';
  section.style.backgroundImage = `url(${HERO_IMAGE})`;
  section.innerHTML = `
    <div class="homepage-hero-overlay"></div>
    <div class="homepage-hero-inner">
      <div class="homepage-hero-card">
        <h1>Welcome to the Australia Post Newsroom</h1>
        <p>Get the latest news, media releases, video, audio and images from Australia Post.</p>
        <p><a class="button" href="/signup">Subscribe</a></p>
      </div>
    </div>
  `;
  return section;
}

function createFeaturedSection(article) {
  const section = document.createElement('div');
  section.className = 'homepage-featured';

  const imgSrc = article?.image || HERO_IMAGE;
  const title = article?.title || 'Australia Post Newsroom';
  const desc = article?.description || '';
  const path = article?.path || '/';

  section.innerHTML = `
    <div class="homepage-featured-inner">
      <div class="featured-content">
        <div class="featured-image">
          <img src="${imgSrc}" alt="${title}" loading="lazy">
        </div>
        <div class="featured-text">
          <h2><a href="${path}">${title}</a></h2>
          <p>${desc}</p>
          <p><a class="button secondary" href="${path}">Read more</a></p>
        </div>
      </div>
      <div class="quick-links-panel">
        <h4>Quick links</h4>
        <ul>
          ${QUICK_LINKS.map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener">${l.text}</a></li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  return section;
}

function createArticleCard(article) {
  const imgSrc = article.image || '';
  const imageHTML = imgSrc
    ? `<div class="hp-card-image"><a href="${article.path}"><img src="${imgSrc}" alt="${article.title}" loading="lazy"></a></div>`
    : '';

  const card = document.createElement('li');
  card.className = 'hp-card';
  card.innerHTML = `
    ${imageHTML}
    <div class="hp-card-text">
      <h4><a href="${article.path}">${article.title}</a></h4>
      <p>${article.description || ''}</p>
      <a class="hp-card-cta" href="${article.path}">Read more</a>
    </div>
  `;
  return card;
}

function createLatestSection(articles) {
  const section = document.createElement('div');
  section.className = 'homepage-latest';
  const grid = document.createElement('ul');
  grid.className = 'hp-cards-grid';

  const displayArticles = articles.slice(0, 6);
  displayArticles.forEach((a) => grid.append(createArticleCard(a)));

  section.innerHTML = '<div class="homepage-latest-inner"><h3>Latest</h3></div>';
  section.querySelector('.homepage-latest-inner').append(grid);
  return section;
}

function createPublicationsSection() {
  const section = document.createElement('div');
  section.className = 'homepage-publications';
  section.innerHTML = `
    <div class="homepage-publications-inner">
      <div class="pub-image">
        <img src="${PUBLICATIONS_IMAGE}" alt="Australia Post publications" loading="lazy">
      </div>
      <div class="pub-text">
        <h4>View our latest publications</h4>
        <p><a class="button" href="https://auspost.com.au/about-us/news-media/publications">Read more</a></p>
      </div>
    </div>
  `;
  return section;
}

export default async function decorate(doc) {
  const main = doc.querySelector('main');
  if (!main) return;

  // Clear existing plain-text content
  main.innerHTML = '';

  // Fetch articles for dynamic content
  const articles = await fetchArticles();

  // Build homepage sections
  main.append(createHeroSection());
  main.append(createFeaturedSection(articles[0]));
  main.append(createLatestSection(articles));
  main.append(createPublicationsSection());
}
