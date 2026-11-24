(() => {
  const menu = document.querySelector('.tb-menu-toggle');
  const navigation = document.getElementById('tb-navigation');
  function closeMenu() {
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open menu');
    navigation?.classList.remove('is-open');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navigation?.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.tb-header')) closeMenu();
  });

  const mainImage = document.getElementById('tb-product-main');
  const thumbs = Array.from(document.querySelectorAll('.tb-thumbs button'));
  thumbs.forEach((button) => button.addEventListener('click', () => {
    if (!mainImage) return;
    mainImage.src = button.dataset.image;
    mainImage.alt = button.dataset.alt;
    thumbs.forEach((thumb) => {
      thumb.classList.toggle('is-selected', thumb === button);
      thumb.setAttribute('aria-pressed', String(thumb === button));
    });
  }));

  const input = document.getElementById('tb-search');
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('#tb-product-grid .tb-card'));
  const count = document.getElementById('tb-results');
  let category = 'all';
  function render() {
    const words = (input?.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach((card) => {
      const matches = (category === 'all' || card.dataset.category === category)
        && words.every((word) => card.dataset.search.toLowerCase().includes(word));
      card.hidden = !matches;
      if (matches) visible++;
    });
    filters.forEach((filter) => {
      const active = filter.dataset.filter === category;
      filter.setAttribute('aria-pressed', String(active));
      filter.classList.toggle('is-active', active);
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? 'product' : 'products'}`;
    const empty = document.getElementById('tb-empty');
    if (empty) empty.hidden = visible > 0;
  }
  function readUrl() {
    const query = new URL(window.location.href).searchParams;
    const requested = query.get('category');
    category = filters.some((button) => button.dataset.filter === requested) ? requested : 'all';
    if (input) input.value = query.get('q') || '';
    render();
  }
  function writeUrl() {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    if (input?.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.filter;
    render();
    writeUrl();
  }));
  input?.addEventListener('input', () => { render(); writeUrl(); });
  document.getElementById('tb-search-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    render();
    writeUrl();
  });
  document.getElementById('tb-reset')?.addEventListener('click', () => {
    category = 'all';
    if (input) input.value = '';
    render();
    writeUrl();
    input?.focus();
  });
  if (cards.length) {
    readUrl();
    window.addEventListener('popstate', readUrl);
  }
  // Collection pages can open the established QIFOR cart without changing its state.
  if (location.hash === '#cart') document.getElementById('open-cart-btn')?.click();
})();
