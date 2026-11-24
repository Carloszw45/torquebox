(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-navigation');
  const closeMenu = () => {
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open menu');
    nav?.classList.remove('is-open');
  };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav?.classList.toggle('is-open', open);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });

  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const stage = gallery.querySelector('.photo-stage');
    const main = gallery.querySelector('[data-main-photo]');
    const count = gallery.querySelector('[data-photo-count]');
    const origin = gallery.querySelector('[data-photo-origin]');
    const inset = gallery.querySelector('[data-pack-inset]');
    const thumbs = Array.from(gallery.querySelectorAll('[data-photo-index]'));
    let selected = 0;
    const show = (index, userAction = false) => {
      selected = (index + thumbs.length) % thumbs.length;
      const data = thumbs[selected].dataset;
      main.src = data.src;
      main.alt = data.alt;
      main.classList.toggle('is-pack', data.kind === 'pack' || data.kind === 'detail');
      count.textContent = `${String(selected + 1).padStart(2, '0')} / ${String(thumbs.length).padStart(2, '0')}`;
      origin.textContent = data.origin === 'generated' ? 'Illustrative application'
        : data.kind === 'pack' ? 'Reference product' : data.kind === 'detail' ? 'Product detail' : 'Application reference';
      inset.hidden = data.kind === 'pack' || data.kind === 'detail';
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === selected);
        thumb.setAttribute('aria-pressed', String(i === selected));
      });
      if (userAction) {
        const row = gallery.querySelector('.photo-thumbs');
        const thumb = thumbs[selected];
        row.scrollTo({ left: Math.max(0, thumb.offsetLeft - row.offsetLeft - row.clientWidth / 2 + thumb.offsetWidth / 2), behavior: 'auto' });
      }
      const next = new Image(); next.src = thumbs[(selected + 1) % thumbs.length].dataset.src;
    };
    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i, true)));
    gallery.querySelector('[data-photo-prev]').addEventListener('click', () => show(selected - 1, true));
    gallery.querySelector('[data-photo-next]').addEventListener('click', () => show(selected + 1, true));
    stage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); show(selected + (event.key === 'ArrowRight' ? 1 : -1), true);
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); show(event.key === 'Home' ? 0 : thumbs.length - 1, true);
      }
    });
    let touch;
    stage.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      else touch = null;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(selected + (dx < 0 ? 1 : -1), true);
      touch = null;
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
    show(0);
  });

  const cards = Array.from(document.querySelectorAll('[data-product-card]'));
  const filters = Array.from(document.querySelectorAll('[data-category-filter]'));
  const input = document.getElementById('product-search');
  if (!input || !filters.length) return;
  let category = 'all';
  const render = () => {
    const words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach((card) => {
      const matches = (category === 'all' || card.dataset.category === category)
        && words.every((word) => card.dataset.search.toLowerCase().includes(word));
      card.hidden = !matches; if (matches) visible++;
    });
    filters.forEach((button) => {
      const active = button.dataset.categoryFilter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('result-count').textContent = `${visible} ${visible === 1 ? 'product' : 'products'}`;
    document.getElementById('empty-results').hidden = visible > 0;
  };
  const updateUrl = () => {
    const url = new URL(location.href);
    if (category === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', category);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  };
  const readUrl = () => {
    const query = new URL(location.href).searchParams;
    const requested = query.get('category');
    category = filters.some((b) => b.dataset.categoryFilter === requested) ? requested : 'all';
    input.value = query.get('q') || ''; render();
  };
  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.categoryFilter; render(); updateUrl();
  }));
  input.addEventListener('input', () => { render(); updateUrl(); });
  document.getElementById('search').addEventListener('submit', (event) => {
    event.preventDefault(); render(); updateUrl();
  });
  document.getElementById('reset-search').addEventListener('click', () => {
    input.value = ''; category = 'all'; render(); updateUrl(); input.focus();
  });
  window.addEventListener('popstate', readUrl); readUrl();
})();
