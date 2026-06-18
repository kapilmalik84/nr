import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import { resolveImage } from '../../scripts/article-card.js';
import { getQueryIndex } from '../../scripts/query-index.js';

function renderResult(article) {
  const isStamp = (article.path || '').startsWith('/section/');
  const imageUrl = resolveImage(article.image, isStamp);

  const item = document.createElement('div');
  item.className = 'search-result';

  if (imageUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'result-image';
    const link = document.createElement('a');
    link.href = article.path;
    link.append(createOptimizedPicture(imageUrl, article.title || '', false, [{ width: '200' }]));
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

function buildFilterPanel(data) {
  const categories = [...new Set(data.map((a) => a.category).filter(Boolean))].sort();
  const years = [...new Set(
    data.map((a) => (a.date ? new Date(a.date * 1000).getFullYear() : null)).filter(Boolean),
  )].sort((a, b) => b - a);

  const panel = document.createElement('aside');
  panel.className = 'search-filter-panel';
  panel.setAttribute('aria-label', 'Search filters');

  // Mobile toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'filter-toggle';
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-controls', 'search-filter-inner');
  toggleBtn.textContent = 'Filters';
  panel.append(toggleBtn);

  const inner = document.createElement('div');
  inner.className = 'filter-inner';
  inner.id = 'search-filter-inner';

  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    inner.classList.toggle('is-open', !expanded);
  });

  // Clear filters button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter-clear';
  clearBtn.textContent = 'Clear filters';
  clearBtn.hidden = true;
  inner.append(clearBtn);

  // ── Content Type ──
  const typeGroup = document.createElement('div');
  typeGroup.className = 'filter-group';

  const typeHeading = document.createElement('h3');
  typeHeading.className = 'filter-heading';
  typeHeading.textContent = 'Content Type';
  typeGroup.append(typeHeading);

  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'toggle-group';
  toggleGroup.setAttribute('role', 'group');
  toggleGroup.setAttribute('aria-label', 'Content type');

  [['all', 'All'], ['news', 'News'], ['stamps', 'Stamps']].forEach(([val, lbl]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'type-btn';
    b.dataset.type = val;
    b.textContent = lbl;
    b.setAttribute('aria-pressed', val === 'all' ? 'true' : 'false');
    if (val === 'all') b.classList.add('active');
    toggleGroup.append(b);
  });

  typeGroup.append(toggleGroup);
  inner.append(typeGroup);

  // ── Year ──
  const yearGroup = document.createElement('div');
  yearGroup.className = 'filter-group';

  const yearLbl = document.createElement('label');
  yearLbl.className = 'filter-heading';
  yearLbl.setAttribute('for', 'search-year-select');
  yearLbl.textContent = 'Year';
  yearGroup.append(yearLbl);

  const yearSel = document.createElement('select');
  yearSel.className = 'year-select';
  yearSel.id = 'search-year-select';

  const allYrOpt = document.createElement('option');
  allYrOpt.value = '';
  allYrOpt.textContent = 'All Years';
  yearSel.append(allYrOpt);

  years.forEach((yr) => {
    const opt = document.createElement('option');
    opt.value = String(yr);
    opt.textContent = String(yr);
    yearSel.append(opt);
  });

  yearGroup.append(yearSel);
  inner.append(yearGroup);

  // ── Category ──
  const catGroup = document.createElement('div');
  catGroup.className = 'filter-group';

  const catHeading = document.createElement('h3');
  catHeading.className = 'filter-heading';
  catHeading.textContent = 'Category';
  catGroup.append(catHeading);

  const catList = document.createElement('div');
  catList.className = 'category-list';

  categories.forEach((cat) => {
    const lbl = document.createElement('label');
    lbl.className = 'category-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = cat;
    cb.className = 'category-cb';
    const span = document.createElement('span');
    span.textContent = cat;
    lbl.append(cb, span);
    catList.append(lbl);
  });

  catGroup.append(catList);
  inner.append(catGroup);

  panel.append(inner);
  return panel;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const source = config.source || '/query-index.json';
  const placeholderText = config.placeholder || block.textContent.trim() || 'Search the newsroom';
  block.textContent = '';

  const form = document.createElement('div');
  form.className = 'search-form';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholderText;
  input.setAttribute('aria-label', 'Search');

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'search-btn';
  searchBtn.textContent = 'Search';

  form.append(input, searchBtn);

  const body = document.createElement('div');
  body.className = 'search-body';

  const resultsArea = document.createElement('div');
  resultsArea.className = 'search-results-area';

  const infoEl = document.createElement('p');
  infoEl.className = 'search-info';
  infoEl.hidden = true;

  const resultsEl = document.createElement('div');
  resultsEl.className = 'search-results';

  resultsArea.append(infoEl, resultsEl);
  body.append(resultsArea);
  block.append(form, body);

  const data = await getQueryIndex(source);
  const filterPanel = buildFilterPanel(data);
  body.prepend(filterPanel);

  const typeBtns = filterPanel.querySelectorAll('.type-btn');
  const yearSelect = filterPanel.querySelector('.year-select');
  const categoryCbs = filterPanel.querySelectorAll('.category-cb');
  const clearBtn = filterPanel.querySelector('.filter-clear');

  function getFilters() {
    return {
      activeType: ([...typeBtns].find((b) => b.classList.contains('active')) || {}).dataset?.type || 'all',
      selectedYear: yearSelect.value,
      activeCategories: [...categoryCbs].filter((cb) => cb.checked).map((cb) => cb.value),
    };
  }

  function updateClearBtn() {
    const { activeType, selectedYear, activeCategories } = getFilters();
    clearBtn.hidden = activeType === 'all' && !selectedYear && activeCategories.length === 0;
  }

  function doSearch() {
    const query = input.value.trim().toLowerCase();
    const hasQuery = query.length >= 2;
    const { activeType, selectedYear, activeCategories } = getFilters();
    const hasFacet = activeCategories.length > 0 || selectedYear || activeType !== 'all';

    updateClearBtn();

    if (!hasQuery && !hasFacet) {
      infoEl.hidden = true;
      resultsEl.textContent = '';
      return;
    }

    let matched = data.filter((a) => a.title);

    if (hasQuery) {
      matched = matched.filter((a) => [a.title, a.description, a.category]
        .filter(Boolean).join(' ').toLowerCase()
        .includes(query));
    }

    if (activeCategories.length > 0) {
      matched = matched.filter((a) => activeCategories.includes(a.category));
    }

    if (selectedYear) {
      matched = matched.filter((a) => {
        if (!a.date) return false;
        return new Date(a.date * 1000).getFullYear().toString() === selectedYear;
      });
    }

    if (activeType === 'news') matched = matched.filter((a) => a.path.startsWith('/archive/'));
    else if (activeType === 'stamps') matched = matched.filter((a) => a.path.startsWith('/section/'));

    resultsEl.textContent = '';
    const queryLabel = hasQuery ? ` for "${input.value.trim()}"` : '';
    infoEl.textContent = `${matched.length} result${matched.length !== 1 ? 's' : ''}${queryLabel}`;
    infoEl.hidden = false;

    if (matched.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.innerHTML = '<strong>No results found</strong>Try adjusting your filters or search terms.';
      resultsEl.append(noResults);
    } else {
      matched.slice(0, 20).forEach((a) => resultsEl.append(renderResult(a)));
    }
  }

  typeBtns.forEach((b) => {
    b.addEventListener('click', () => {
      typeBtns.forEach((other) => {
        other.classList.remove('active');
        other.setAttribute('aria-pressed', 'false');
      });
      b.classList.add('active');
      b.setAttribute('aria-pressed', 'true');
      doSearch();
    });
  });

  yearSelect.addEventListener('change', doSearch);
  categoryCbs.forEach((cb) => cb.addEventListener('change', doSearch));

  clearBtn.addEventListener('click', () => {
    typeBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
      if (b.dataset.type === 'all') {
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
      }
    });
    yearSelect.value = '';
    categoryCbs.forEach((cb) => { cb.checked = false; });
    doSearch();
  });

  searchBtn.addEventListener('click', () => doSearch());
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    input.value = q;
    doSearch();
  }
}
