(() => {
  // Keep links from older store versions working after the home/catalog split.
  const legacyQuery = new URL(location.href);
  if (/\/shop(?:\.html)?$/.test(location.pathname)
      && ['q','category','sort','saved'].some((key) => legacyQuery.searchParams.has(key))) {
    const target = new URL('collection.html', location.href);
    target.search = legacyQuery.search; target.hash = '#collection';
    location.replace(target.pathname + target.search + target.hash);
    return;
  }

  const hero = document.querySelector('[data-hero-carousel]');
  if (hero) {
    const slides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(hero.querySelectorAll('[data-hero-index]'));
    const status = document.createElement('span');
    status.className = 'sr-only'; status.setAttribute('aria-live','polite'); hero.append(status);
    let active = 0;
    const showHero = (index) => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide,i) => { slide.hidden = i !== active; });
      dots.forEach((dot,i) => { dot.classList.toggle('is-active',i === active); dot.setAttribute('aria-pressed',String(i === active)); });
      const photo = slides[active].querySelector('img'); if (photo) photo.loading = 'eager';
      status.textContent = `Banner ${active + 1} of ${slides.length}`;
    };
    hero.querySelector('[data-hero-prev]').addEventListener('click', () => showHero(active-1));
    hero.querySelector('[data-hero-next]').addEventListener('click', () => showHero(active+1));
    dots.forEach((dot,i) => dot.addEventListener('click', () => showHero(i)));
    hero.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showHero(active + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    let touch;
    hero.addEventListener('touchstart',(event) => { touch = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null; },{passive:true});
    hero.addEventListener('touchend',(event) => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX-touch.x, dy = event.changedTouches[0].clientY-touch.y;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) showHero(active+(dx<0?1:-1));
      touch = null;
    },{passive:true});
    hero.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
    showHero(0);
  }

  const dropdowns = Array.from(document.querySelectorAll('.reference-dropdown'));
  document.addEventListener('click',(event) => dropdowns.forEach((details)=>{if(!details.contains(event.target))details.open=false;}));
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')dropdowns.forEach((details)=>{if(details.open){details.open=false;details.querySelector('summary').focus();}});});

  const knownProducts = new Set(JSON.parse(document.getElementById('catalog-slugs')?.textContent || '[]'));
  const savedKey = 'torqueboxSavedProducts';
  const readSaved = () => {
    try { const data = JSON.parse(localStorage.getItem(savedKey)||'[]'); return new Set(Array.isArray(data)?data.filter((slug)=>knownProducts.has(slug)):[]); }
    catch { return new Set(); }
  };
  let savedProducts = readSaved();
  let refreshSavedList = () => {};
  const paintSaved = () => {
    document.querySelectorAll('[data-save-product]').forEach((button) => {
      const saved = savedProducts.has(button.dataset.saveProduct);
      button.classList.toggle('is-saved',saved); button.setAttribute('aria-pressed',String(saved));
      const title = button.getAttribute('aria-label').replace(/^(Save |Unsave )/,'');
      button.setAttribute('aria-label',(saved?'Unsave ':'Save ')+title);
    });
    document.querySelectorAll('[data-saved-count]').forEach((badge)=>{badge.textContent=String(savedProducts.size);badge.hidden=savedProducts.size===0;});
  };
  document.addEventListener('click',(event)=>{
    const button = event.target.closest('[data-save-product]'); if(!button)return;
    const slug = button.dataset.saveProduct; if(!knownProducts.has(slug))return;
    if(savedProducts.has(slug))savedProducts.delete(slug);else savedProducts.add(slug);
    try {localStorage.setItem(savedKey,JSON.stringify([...savedProducts]));}catch{}
    paintSaved();refreshSavedList();
  });
  const paintCartCount = () => {
    let count=0;
    try {const cart=JSON.parse(localStorage.getItem('torquebox-cart-usd-v1')||'{}');if(cart&&typeof cart==='object'&&!Array.isArray(cart))count=Object.values(cart).filter((n)=>Number.isSafeInteger(n)&&n>0&&n<100).reduce((sum,n)=>sum+n,0);}catch{}
    document.querySelectorAll('[data-qifor-count]').forEach((badge)=>{badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;});
  };
  window.addEventListener('storage',(event)=>{if(event.key===savedKey||event.key===null){savedProducts=readSaved();paintSaved();refreshSavedList();}if(event.key==='torquebox-cart-usd-v1'||event.key===null)paintCartCount();});
  paintCartCount();

  document.querySelectorAll('[data-newsletter-form]').forEach((form)=>{
    form.addEventListener('submit',async(event)=>{
      event.preventDefault();if(!form.reportValidity())return;
      const button=form.querySelector('button[type=submit]'),message=form.querySelector('[data-newsletter-message]');
      const email=form.elements.email.value.trim();const website=form.elements.website.value;
      button.disabled=true;button.textContent='Saving…';message.textContent='';
      try {
        const response=await fetch('/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent:true,website})});
        const data=await response.json();if(!response.ok||data.ok!==true)throw new Error(data.error||'Please try again or contact TorqueBox support.');
        form.reset();message.textContent='You’re subscribed to TorqueBox collection updates.';
      } catch {message.textContent='We couldn’t save that right now. Please try again or contact support.';}
      finally {button.disabled=false;button.textContent='Subscribe';}
    });
  });

  const saveBrowseContext = () => {
    if(document.body.dataset.currentProduct)return;
    if(!/\/(?:shop|collection)(?:\.html)?$/.test(location.pathname))return;
    try {sessionStorage.setItem('torqueboxCollectionContext',JSON.stringify({href:location.pathname+location.search+(location.hash||'#collection'),scroll:Math.max(0,Math.round(window.scrollY))}));}catch{}
  };
  document.addEventListener('click',(event)=>{
    const link=event.target.closest('a[href]');if(!link)return;
    try {const url=new URL(link.href);if(url.origin===location.origin&&/\/products\/[^/]+(?:\.html)?$/.test(url.pathname))saveBrowseContext();}catch{}
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

  // Header height keeps section navigation clear of the sticky store navigation.
  const storeHeader = document.querySelector('.store-header');
  const updateHeaderHeight = () => {
    if (storeHeader) document.documentElement.style.setProperty('--store-header-height', `${storeHeader.offsetHeight}px`);
  };
  updateHeaderHeight();
  if (storeHeader && 'ResizeObserver' in window) new ResizeObserver(updateHeaderHeight).observe(storeHeader);

  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch {} },
  };
  const readJSON = (key, fallback) => {
    try { return JSON.parse(storage.get(key)) ?? fallback; } catch { return fallback; }
  };
  const currentSlug = document.body.dataset.currentProduct;
  const templates = Array.from(document.querySelectorAll('[data-recent-template]'));
  const allowedSlugs = new Set(templates.map((t) => t.dataset.recentTemplate));
  let viewed = readJSON('torqueboxViewedProducts', []);
  if (!Array.isArray(viewed)) viewed = [];
  viewed = viewed.filter((slug) => allowedSlugs.has(slug));
  if (currentSlug && allowedSlugs.has(currentSlug)) {
    viewed = [currentSlug, ...viewed.filter((slug) => slug !== currentSlug)].slice(0, 8);
    storage.set('torqueboxViewedProducts', JSON.stringify(viewed));
  }
  const recentSection = document.querySelector('[data-recent-section]');
  const recentGrid = document.querySelector('[data-recent-grid]');
  if (recentSection && recentGrid) {
    const display = viewed.filter((slug) => slug !== currentSlug).slice(0, 4);
    display.forEach((slug) => {
      const template = templates.find((t) => t.dataset.recentTemplate === slug);
      if (template) recentGrid.append(template.content.cloneNode(true));
    });
    recentSection.hidden = display.length === 0;
  }

  paintSaved();

  // Returning to the collection restores the visitor's own category, query and position.
  const context = readJSON('torqueboxCollectionContext', null);
  let returnUrl;
  if (context && typeof context.href === 'string') {
    try {
      const url = new URL(context.href, location.origin);
      if (url.origin === location.origin && /^\/(?:shop|collection)(?:\.html)?$/.test(url.pathname)) returnUrl = url.pathname + url.search + url.hash;
    } catch {}
  }
  document.querySelectorAll('[data-back-collection]').forEach((link) => {
    if (returnUrl) link.href = returnUrl;
    link.addEventListener('click', () => {
      if (returnUrl) storage.set('torqueboxRestoreCollection', '1');
    });
  });

  const currentCategory = document.body.dataset.currentCategory;
  if (currentCategory) document.querySelectorAll('.store-nav [data-category-link]').forEach((link) => {
    const active = link.dataset.categoryLink === currentCategory;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
  });

  const tabs = Array.from(document.querySelectorAll('.store-product-tabs a'));
  if (tabs.length) {
    const selectTab = (id) => tabs.forEach((tab) => {
      const active = tab.getAttribute('href') === '#' + id;
      tab.classList.toggle('is-active', active);
      if (active) tab.setAttribute('aria-current', 'location'); else tab.removeAttribute('aria-current');
    });
    tabs.forEach((tab) => tab.addEventListener('click', () => selectTab(tab.hash.slice(1))));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) selectTab(visible[0].target.id);
      }, { rootMargin: `-${storeHeader.offsetHeight + 62}px 0px -40% 0px`, threshold: 0 });
      tabs.forEach((tab) => { const section = document.getElementById(tab.hash.slice(1)); if (section) observer.observe(section); });
    }
  }

  const grid = document.getElementById('product-grid');
  const filters = Array.from(document.querySelectorAll('[data-category-filter]'));
  const input = document.getElementById('product-search');
  if (!grid || !input || !filters.length) {
    if (input && currentSlug && returnUrl) input.value = new URL(returnUrl, location.origin).searchParams.get('q') || '';
    if (!currentSlug && storage.get('torqueboxRestoreCollection') === '1') {
      storage.remove('torqueboxRestoreCollection');
      if (context && Number.isFinite(context.scroll)) requestAnimationFrame(() => window.scrollTo({top:Math.max(0,context.scroll),behavior:'instant'}));
    }
    return;
  }
  const cards = Array.from(grid.querySelectorAll('[data-product-card]'));
  const sorter = document.getElementById('product-sort');
  const section = document.getElementById('collection');
  const title = document.getElementById('collection-title');
  const description = document.getElementById('collection-description');
  const categoryNames = { all: 'All products', wash: 'Wash & foam', dry: 'Drying', finish: 'Paint & gloss', interior: 'Interior', glass: 'Glass', wheels: 'Wheels & tires' };
  const categoryIntros = {
    all: 'Choose the job. Discover the product. See how to use it.',
    wash: 'Find your tools and formulas for the foam, contact wash and rinse.',
    dry: 'A towel for clean panels. Directed air for the details.',
    finish: 'Get to know the final touch for clean paintwork.',
    interior: 'Give the surfaces inside your car the right kind of care.',
    glass: 'Explore products for the glass and the view ahead.',
    wheels: 'Clean the wheels, prepare the rubber and choose your finish.',
  };
  let category = 'all';
  let savedOnly = false;
  let order = 'featured';
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const render = () => {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach((card) => {
      const text = normalize(card.dataset.search);
      const matches = (!savedOnly || savedProducts.has(card.dataset.productSlug)) && (category === 'all' || card.dataset.category === category)
        && words.every((word) => text.includes(word) || text.replaceAll(' ', '').includes(word));
      card.hidden = !matches;
      if (matches) visible++;
    });
    const sorted = [...cards];
    if (order !== 'featured') sorted.sort((a,b) => a.dataset.title.localeCompare(b.dataset.title, 'en', { sensitivity:'base' }) * (order === 'name-desc' ? -1 : 1));
    sorted.forEach((card) => grid.append(card));
    filters.forEach((button) => {
      const active = button.dataset.categoryFilter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.store-nav [data-category-link]').forEach((link) => {
      const active = link.dataset.categoryLink === category;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    title.textContent = savedOnly ? 'Your saved products.' : category === 'all' ? 'Explore the collection.' : 'Explore ' + categoryNames[category].toLowerCase() + '.';
    description.textContent = savedOnly ? 'Your favorite products, ready for another look.' : categoryIntros[category];
    document.querySelectorAll('.saved-products-link').forEach((link)=>{link.classList.toggle('is-active',savedOnly);if(savedOnly)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    document.getElementById('result-count').textContent = `${visible} ${visible === 1 ? 'product' : 'products'}`;
    document.getElementById('empty-results').hidden = visible > 0;
    document.getElementById('active-filter').hidden = category === 'all';
    document.getElementById('active-filter-label').textContent = categoryNames[category];
    sorter.value = order;
  };
  const updateUrl = (push = false) => {
    const url = new URL(location.href);
    if(savedOnly)url.searchParams.set('saved','1');else url.searchParams.delete('saved');
    if (category === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', category);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    if (order === 'featured') url.searchParams.delete('sort'); else url.searchParams.set('sort', order);
    const next = url.pathname + url.search + url.hash;
    if (next !== location.pathname + location.search + location.hash) history[push ? 'pushState' : 'replaceState'](null, '', next);
  };
  const readUrl = () => {
    const params = new URL(location.href).searchParams;
    savedOnly = params.get('saved') === '1';
    const requested = params.get('category');
    category = Object.hasOwn(categoryNames, requested) ? requested : 'all';
    input.value = params.get('q') || '';
    const sort = params.get('sort');
    order = ['featured','name','name-desc'].includes(sort) ? sort : 'featured';
    render();
  };
  const scrollToProducts = () => section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
  filters.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.categoryFilter; render(); updateUrl(true);
  }));
  document.querySelectorAll('[data-category-link]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); savedOnly = false; category = link.dataset.categoryLink; render(); updateUrl(true); scrollToProducts();
  }));
  input.addEventListener('input', () => { render(); updateUrl(); });
  document.getElementById('search').addEventListener('submit', (event) => {
    event.preventDefault(); render(); updateUrl(); scrollToProducts();
  });
  sorter.addEventListener('change', () => { order = sorter.value; render(); updateUrl(true); });
  document.getElementById('clear-category').addEventListener('click', () => { category = 'all'; render(); updateUrl(true); });
  document.getElementById('reset-search').addEventListener('click', () => {
    category = 'all'; savedOnly = false; order = 'featured'; input.value = ''; render(); updateUrl(true); input.focus({ preventScroll:true });
  });
  refreshSavedList = () => render();
  window.addEventListener('popstate', readUrl);
  readUrl();
  if (storage.get('torqueboxRestoreCollection') === '1') {
    storage.remove('torqueboxRestoreCollection');
    if (context && Number.isFinite(context.scroll)) requestAnimationFrame(() => window.scrollTo({ top:Math.max(0, context.scroll), behavior:'instant' }));
  }
})();
