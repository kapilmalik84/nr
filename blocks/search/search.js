import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import { resolveImage } from '../../scripts/article-card.js';
import { getQueryIndex } from '../../scripts/query-index.js';

const PAGE_SIZE = 20;

function deriveType(path = '') {
  return path.startsWith('/section/') ? 'stamps' : 'news';
}

/* ── Result row ── */
function renderResult(article) {
  const type = deriveType(article.path);
  const typeLabel = type === 'stamps' ? 'Stamps' : 'News';
  const eyebrow = article.year ? `${typeLabel} · ${article.year}` : typeLabel;
  const imageUrl = resolveImage(article.image, type === 'stamps');

  const item = document.createElement('div');
  item.className = 'search-result';

  if (imageUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'result-image';
    const a = document.createElement('a');
    a.href = article.path;
    a.setAttribute('aria-hidden', 'true');
    a.tabIndex = -1;
    a.append(createOptimizedPicture(imageUrl, article.title || '', false, [{ width: '200' }]));
    imgWrap.append(a);
    item.append(imgWrap);
  }

  const text = document.createElement('div');
  text.className = 'result-text';

  const eyebrowEl = document.createElement('p');
  eyebrowEl.className = 'result-eyebrow';
  eyebrowEl.textContent = eyebrow;
  text.append(eyebrowEl);

  const titleEl = document.createElement('p');
  titleEl.className = 'result-title';
  const titleA = document.createElement('a');
  titleA.href = article.path;
  titleA.textContent = article.title || '';
  titleEl.append(titleA);
  text.append(titleEl);

  if (article.description) {
    const desc = document.createElement('p');
    desc.className = 'result-excerpt';
    desc.textContent = article.description;
    text.append(desc);
  }

  item.append(text);
  return item;
}

/* ── Live category counts ──
 * Counts categories in the subset filtered by type + year + query,
 * deliberately NOT filtered by category — so counts show what's available. */
function computeCounts(data, { activeType, selectedYear, query }) {
  let base = data.filter((a) => a.title);
  if (query.length >= 2) {
    const q = query.toLowerCase();
    base = base.filter((a) => [a.title, a.description, a.category]
      .filter(Boolean).join(' ').toLowerCase().includes(q));
  }
  if (selectedYear) base = base.filter((a) => a.year === Number(selectedYear));
  if (activeType === 'news') base = base.filter((a) => !a.path.startsWith('/section/'));
  else if (activeType === 'stamps') base = base.filter((a) => a.path.startsWith('/section/'));

  const counts = {};
  base.forEach((a) => {
    if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
  });
  return counts;
}

/* ── Active filter chips ── */
function buildChips(filters, onRemove) {
  const { activeType, selectedYear, activeCategories } = filters;
  const wrapper = document.createElement('div');
  wrapper.className = 'active-chips';

  const makeChip = (label, onRemoveChip) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'active-chip';
    btn.innerHTML = `${label} <span class="chip-x" aria-hidden="true">✕</span>`;
    btn.setAttribute('aria-label', `Remove filter: ${label}`);
    btn.addEventListener('click', onRemoveChip);
    return btn;
  };

  if (activeType !== 'all') {
    wrapper.append(makeChip(activeType === 'stamps' ? 'Stamps' : 'News', () => onRemove('type', activeType)));
  }
  if (selectedYear) {
    wrapper.append(makeChip(selectedYear, () => onRemove('year', selectedYear)));
  }
  activeCategories.forEach((cat) => {
    wrapper.append(makeChip(cat, () => onRemove('category', cat)));
  });

  return wrapper;
}

/* ── Numbered pagination ── */
function buildPagination(total, current, perPage, onPageChange) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const nav = document.createElement('nav');
  nav.className = 'search-pagination';
  nav.setAttribute('aria-label', 'Search results pages');

  const makeBtn = (label, page, isActive = false, isDisabled = false, ariaLabel = '') => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `page-btn${isActive ? ' active' : ''}`;
    btn.textContent = label;
    btn.disabled = isDisabled;
    if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
    if (isActive) btn.setAttribute('aria-current', 'page');
    if (!isDisabled && !isActive) {
      btn.addEventListener('click', () => onPageChange(page));
    }
    return btn;
  };

  const ellipsis = () => {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '…';
    span.setAttribute('aria-hidden', 'true');
    return span;
  };

  nav.append(makeBtn('←', current - 1, false, current === 1, 'Previous page'));

  const delta = 1;
  const pages = new Set([1, totalPages]);
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(totalPages - 1, current + delta);
  for (let p = rangeStart; p <= rangeEnd; p += 1) {
    pages.add(p);
  }

  let prev = 0;
  [...pages].sort((a, b) => a - b).forEach((p) => {
    if (p - prev > 1) nav.append(ellipsis());
    nav.append(makeBtn(p, p, p === current, false, `Page ${p}`));
    prev = p;
  });

  nav.append(makeBtn('→', current + 1, false, current === totalPages, 'Next page'));
  return nav;
}

/* ── Filter panel ── */
function buildFilterPanel(categories, years) {
  const panel = document.createElement('aside');
  panel.className = 'search-filter-panel';
  panel.setAttribute('aria-label', 'Search filters');

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
    if (!expanded) inner.querySelector('button, select, input')?.focus();
  });

  // Clear button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter-clear';
  clearBtn.textContent = 'Clear all filters';
  clearBtn.hidden = true;
  inner.append(clearBtn);

  // Content type
  const typeGroup = document.createElement('div');
  typeGroup.className = 'filter-group';
  const typeHeading = document.createElement('h3');
  typeHeading.className = 'filter-heading';
  typeHeading.textContent = 'Content Type';
  typeGroup.append(typeHeading);

  const typePills = document.createElement('div');
  typePills.className = 'type-pills';

  [['all', 'All'], ['news', 'News'], ['stamps', 'Stamps']].forEach(([val, lbl]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `type-btn${val === 'all' ? ' active' : ''}`;
    b.dataset.type = val;
    b.textContent = lbl;
    b.setAttribute('aria-pressed', val === 'all' ? 'true' : 'false');
    typePills.append(b);
  });

  typeGroup.append(typePills);
  inner.append(typeGroup);

  // Year
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

  // Category
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
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat;
    const countSpan = document.createElement('span');
    countSpan.className = 'category-count';
    countSpan.dataset.cat = cat;
    lbl.append(cb, nameSpan, countSpan);
    catList.append(lbl);
  });
  catGroup.append(catList);
  inner.append(catGroup);

  panel.append(inner);
  return panel;
}

/* ── Main block decorator ── */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const source = config.source || '/query-index.json';
  const placeholderText = config.placeholder || 'Search the newsroom';
  block.textContent = '';

  const form = document.createElement('form');
  form.className = 'search-form';
  form.setAttribute('role', 'search');
  form.setAttribute('aria-label', 'Newsroom search');

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholderText;
  input.setAttribute('aria-label', 'Search the Newsroom');

  const searchBtn = document.createElement('button');
  searchBtn.type = 'submit';
  searchBtn.className = 'search-btn';
  searchBtn.textContent = 'Search';

  form.append(input, searchBtn);

  const body = document.createElement('div');
  body.className = 'search-body';

  const resultsArea = document.createElement('div');
  resultsArea.className = 'search-results-area';
  resultsArea.setAttribute('role', 'region');
  resultsArea.setAttribute('aria-label', 'Search results');

  const infoEl = document.createElement('p');
  infoEl.className = 'search-info';
  infoEl.setAttribute('role', 'status');
  infoEl.setAttribute('aria-live', 'polite');
  infoEl.setAttribute('aria-atomic', 'true');
  infoEl.hidden = true;

  const chipsEl = document.createElement('div');
  const resultsEl = document.createElement('div');
  resultsEl.className = 'search-results';
  const paginationEl = document.createElement('div');

  resultsArea.append(infoEl, chipsEl, resultsEl, paginationEl);
  body.append(resultsArea);
  block.append(form, body);

  // ── Lazy data loading ──
  let enrichedData = null;
  let dataPromise = null;

  const ensureData = async () => {
    if (enrichedData) return enrichedData;
    if (!dataPromise) dataPromise = getQueryIndex(source);
    const raw = await dataPromise;
    enrichedData = raw.map((a) => ({
      ...a,
      year: a.date ? new Date(a.date * 1000).getFullYear() : null,
    }));
    return enrichedData;
  };

  // ── Filter panel (built once on first interaction) ──
  let filterPanel = null;
  let typeBtns;
  let yearSelect;
  let categoryCbs;
  let clearBtn;

  const getFilters = () => ({
    activeType: [...(typeBtns || [])].find((b) => b.classList.contains('active'))?.dataset?.type || 'all',
    selectedYear: yearSelect?.value || '',
    activeCategories: [...(categoryCbs || [])].filter((cb) => cb.checked).map((cb) => cb.value),
  });

  // ── Core search: filter → count → chips → paginate → render ──
  const doSearch = async (page = 1) => {
    const allData = await ensureData();
    const query = input.value.trim();
    const { activeType, selectedYear, activeCategories } = getFilters();
    const hasQuery = query.length >= 2;
    const hasFacet = activeCategories.length > 0 || selectedYear || activeType !== 'all';

    // Update clear button visibility
    if (clearBtn) clearBtn.hidden = !hasQuery && !hasFacet;

    if (!hasQuery && !hasFacet) {
      infoEl.hidden = true;
      chipsEl.textContent = '';
      resultsEl.textContent = '';
      paginationEl.textContent = '';
      return;
    }

    // Filter data
    let matched = allData.filter((a) => a.title);
    if (hasQuery) {
      const q = query.toLowerCase();
      matched = matched.filter((a) => [a.title, a.description, a.category]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (activeCategories.length > 0) {
      matched = matched.filter((a) => activeCategories.includes(a.category));
    }
    if (selectedYear) matched = matched.filter((a) => a.year === Number(selectedYear));
    if (activeType === 'news') matched = matched.filter((a) => !a.path.startsWith('/section/'));
    else if (activeType === 'stamps') matched = matched.filter((a) => a.path.startsWith('/section/'));

    // Live category counts (without category filter applied)
    const counts = computeCounts(allData, { activeType, selectedYear, query: hasQuery ? query : '' });
    if (categoryCbs) {
      categoryCbs.forEach((cb) => {
        const countSpan = cb.closest('.category-item')?.querySelector('.category-count');
        if (countSpan) {
          const n = counts[cb.value] || 0;
          countSpan.textContent = n > 0 ? ` (${n})` : '';
        }
      });
    }

    // Result count announcement
    const queryLabel = hasQuery ? ` for "${query}"` : '';
    infoEl.innerHTML = `<strong>${matched.length} result${matched.length !== 1 ? 's' : ''}</strong>${queryLabel}`;
    infoEl.hidden = false;

    // Active chips
    chipsEl.textContent = '';
    const chips = buildChips(
      { activeType, selectedYear, activeCategories },
      (filterType, value) => {
        if (filterType === 'type') {
          typeBtns?.forEach((b) => {
            b.classList.toggle('active', b.dataset.type === 'all');
            b.setAttribute('aria-pressed', b.dataset.type === 'all' ? 'true' : 'false');
          });
        } else if (filterType === 'year' && yearSelect) {
          yearSelect.value = '';
        } else if (filterType === 'category') {
          categoryCbs?.forEach((cb) => { if (cb.value === value) cb.checked = false; });
        }
        doSearch(1);
      },
    );
    if (chips.children.length > 0) chipsEl.append(chips);

    // Paginate
    const totalPages = Math.ceil(matched.length / PAGE_SIZE);
    const safePage = Math.min(Math.max(1, page), totalPages || 1);
    const pageSlice = matched.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    resultsEl.textContent = '';
    if (matched.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.innerHTML = '<strong>No results found</strong><p>Try adjusting your filters or search terms.</p>';
      resultsEl.append(noResults);
    } else {
      pageSlice.forEach((a) => resultsEl.append(renderResult(a)));
    }

    // Pagination
    paginationEl.textContent = '';
    const paginationNav = buildPagination(matched.length, safePage, PAGE_SIZE, (p) => {
      doSearch(p);
      resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (paginationNav) paginationEl.append(paginationNav);
  };

  // ── Build filter panel once on first interaction ──
  const buildPanel = async () => {
    if (filterPanel) return;
    const data = await ensureData();
    const categories = [...new Set(data.map((a) => a.category).filter(Boolean))].sort();
    const years = [...new Set(data.map((a) => a.year).filter(Boolean))].sort((a, b) => b - a);

    filterPanel = buildFilterPanel(categories, years);
    body.prepend(filterPanel);

    typeBtns = filterPanel.querySelectorAll('.type-btn');
    yearSelect = filterPanel.querySelector('.year-select');
    categoryCbs = filterPanel.querySelectorAll('.category-cb');
    clearBtn = filterPanel.querySelector('.filter-clear');

    typeBtns.forEach((b) => {
      b.addEventListener('click', () => {
        typeBtns.forEach((other) => {
          other.classList.remove('active');
          other.setAttribute('aria-pressed', 'false');
        });
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
        doSearch(1);
      });
    });

    yearSelect.addEventListener('change', () => doSearch(1));
    categoryCbs.forEach((cb) => cb.addEventListener('change', () => doSearch(1)));

    clearBtn.addEventListener('click', () => {
      input.value = '';
      typeBtns.forEach((b) => {
        b.classList.toggle('active', b.dataset.type === 'all');
        b.setAttribute('aria-pressed', b.dataset.type === 'all' ? 'true' : 'false');
      });
      yearSelect.value = '';
      categoryCbs.forEach((cb) => { cb.checked = false; });
      doSearch(1);
    });
  };

  // ── Form submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await buildPanel();
    doSearch(1);
  });

  // ── Pre-populate from ?q= on page load ──
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    input.value = q;
    buildPanel().then(() => doSearch(1));
  } else {
    input.addEventListener('focus', () => buildPanel(), { once: true });
  }
}
