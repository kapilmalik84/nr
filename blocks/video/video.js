import { createOptimizedPicture } from '../../scripts/aem.js';
import { buildInlineBreadcrumb } from '../../scripts/breadcrumb-builder.js';

const VIDEO_KEYS = new Set(['title']);

const PLAY_SVG_LG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="#DC1928" aria-hidden="true">
  <polygon points="8 5 19 12 8 19"/>
</svg>`;

const PLAY_SVG_SM = `<svg viewBox="0 0 24 24" width="20" height="20" fill="#DC1928" aria-hidden="true">
  <polygon points="8 5 19 12 8 19"/>
</svg>`;

function extractYouTubeId(url) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function readVideoRow(row) {
  const cells = [...row.children];
  const pic = cells[0]?.querySelector('picture');
  const link = cells[0]?.querySelector('a');
  const videoUrl = link?.href || link?.textContent?.trim() || '';
  const ytId = extractYouTubeId(videoUrl);
  return {
    picture: pic,
    videoUrl,
    ytId,
    autoThumb: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '',
    title: cells[1]?.textContent.trim() || '',
    date: cells[2]?.textContent.trim() || '',
    duration: cells[3]?.textContent.trim() || '',
    featured: cells[2]?.textContent.trim().toLowerCase() === 'featured',
  };
}

function embedVideo(wrapper, videoUrl, ytId, title = '') {
  const id = ytId || extractYouTubeId(videoUrl);
  if (!id) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.title = title || 'Video player';
  iframe.className = 'video-iframe';
  wrapper.replaceWith(iframe);
}

function buildPlayBtn(size) {
  const btn = document.createElement('button');
  btn.className = `video-play-btn video-play-btn-${size}`;
  btn.setAttribute('aria-label', 'Play video');
  btn.innerHTML = size === 'lg' ? PLAY_SVG_LG : PLAY_SVG_SM;
  return btn;
}

function buildFeaturedPanel(data) {
  const panel = document.createElement('div');
  panel.className = 'video-featured';

  const thumb = document.createElement('div');
  thumb.className = 'video-featured-thumb';

  if (data.picture) {
    const img = data.picture.querySelector('img');
    if (img) {
      thumb.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '1200' }]));
    } else {
      thumb.append(data.picture);
    }
  } else if (data.autoThumb) {
    const img = document.createElement('img');
    img.src = data.autoThumb;
    img.alt = data.title;
    img.loading = 'lazy';
    thumb.append(img);
  }

  const playBtn = buildPlayBtn('lg');
  playBtn.addEventListener('click', () => embedVideo(panel, data.videoUrl, data.ytId, data.title));

  const info = document.createElement('div');
  info.className = 'video-featured-info';
  const badge = document.createElement('span');
  badge.className = 'video-featured-badge';
  badge.textContent = 'Featured';
  const title = document.createElement('p');
  title.className = 'video-featured-title';
  title.textContent = data.title;
  info.append(badge, title);

  panel.append(thumb, playBtn, info);
  return panel;
}

function buildVideoCard(data) {
  const article = document.createElement('article');
  article.className = 'video-card';

  const media = document.createElement('div');
  media.className = 'video-card-media';

  if (data.picture) {
    const img = data.picture.querySelector('img');
    if (img) {
      media.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '600' }]));
    } else {
      media.append(data.picture);
    }
  } else if (data.autoThumb) {
    const img = document.createElement('img');
    img.src = data.autoThumb;
    img.alt = data.title;
    img.loading = 'lazy';
    media.append(img);
  }

  const playBtn = buildPlayBtn('sm');
  playBtn.addEventListener('click', () => embedVideo(media, data.videoUrl, data.ytId, data.title));
  media.append(playBtn);

  if (data.duration) {
    const dur = document.createElement('span');
    dur.className = 'video-duration';
    dur.textContent = data.duration;
    media.append(dur);
  }

  const body = document.createElement('div');
  body.className = 'video-card-body';

  if (data.date) {
    const dateEl = document.createElement('p');
    dateEl.className = 'video-card-date';
    dateEl.textContent = data.date;
    body.append(dateEl);
  }

  if (data.title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'video-card-title';
    titleEl.textContent = data.title;
    body.append(titleEl);
  }

  article.append(media, body);
  return article;
}

export default function decorate(block) {
  const rows = [...block.children];

  const isCfg = (r) => r.children.length === 2
    && VIDEO_KEYS.has(r.children[0].textContent.trim().toLowerCase());

  const cfg = {};
  rows.filter(isCfg).forEach((r) => {
    cfg[r.children[0].textContent.trim().toLowerCase()] = r.children[1].textContent.trim();
  });

  const videoRows = rows.filter((r) => !isCfg(r)).map(readVideoRow);

  block.textContent = '';

  // Page header
  const crumb = buildInlineBreadcrumb(
    [{ href: '/', text: 'Home' }, { text: cfg.title || 'Video' }],
    'video-breadcrumb',
  );

  const h1 = document.createElement('h1');
  h1.className = 'video-page-title';
  h1.textContent = cfg.title || 'Video';

  block.append(crumb, h1);

  // Featured panel (first row)
  const [featuredData, ...gridData] = videoRows;
  if (featuredData) {
    block.append(buildFeaturedPanel(featuredData));
  }

  // Grid
  if (gridData.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'video-grid';
    gridData.forEach((data) => grid.append(buildVideoCard(data)));
    block.append(grid);
  }
}
