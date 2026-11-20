(() => {
  const byId = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPrice = (cents) => money.format(cents / 100);
  const cartKey = 'torquebox-cart';
  const bottlePhoto = 'assets/images/qifor-wind-shield-pro.jpg';
  const shippingCharge = 990;
  const priorityThreshold = 7990;
  const bundles = Array.from(document.querySelectorAll('.bundle-card'), (card) => {
    const radio = card.querySelector('input[name="bundle_selection"]');
    return {
      id: radio.value,
      title: card.dataset.title,
      bottles: Number(card.dataset.bottles),
      price: Math.round(Number(card.dataset.price) * 100),
      shipping: card.dataset.shipping,
      card,
      radio,
    };
  });

  const quantityInput = byId('qty-input');
  const quantityMinus = byId('qty-minus');
  const quantityPlus = byId('qty-plus');
  let selectedBundle = bundles.find((bundle) => bundle.radio.checked) ?? bundles[0];
  let quantity = Number(quantityInput.value);

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey));
      return Object.fromEntries(bundles.flatMap(({ id }) => {
        const savedQuantity = saved?.[id];
        return Number.isSafeInteger(savedQuantity) && savedQuantity > 0 ? [[id, savedQuantity]] : [];
      }));
    } catch {
      return {};
    }
  }

  let cart = readCart();

  function shippingFor(subtotal, includedBundles) {
    if (subtotal === 0) return { cost: 0, label: '' };
    if (subtotal > priorityThreshold) return { cost: 0, label: 'Frete grátis' };
    if (includedBundles.some((bundle) => bundle.shipping === 'priority')) {
      return { cost: 0, label: 'Frete grátis' };
    }
    if (includedBundles.some((bundle) => bundle.shipping === 'standard')) {
      return { cost: 0, label: 'Frete grátis' };
    }
    return { cost: shippingCharge, label: formatPrice(shippingCharge) };
  }

  function showBottlePhoto(container, count) {
    if (container.childElementCount === count) return;
    container.setAttribute('aria-label', `${count} ${count === 1 ? 'frasco' : 'frascos'} QIFOR`);
    const photos = Array.from({ length: count }, () => {
      const photo = document.createElement('img');
      photo.src = bottlePhoto;
      photo.alt = '';
      return photo;
    });
    container.replaceChildren(...photos);
  }

  function updateSelection() {
    const price = quantity * selectedBundle.price;
    const shipping = shippingFor(price, [selectedBundle]);
    for (const bundle of bundles) {
      const active = bundle === selectedBundle;
      for (const className of ['ring-2', 'ring-secondary-container', 'shadow-md', 'border-secondary-container']) {
        bundle.card.classList.toggle(className, active);
      }
      bundle.card.classList.toggle('shadow-sm', !active);
      bundle.card.classList.toggle('border-outline-variant/30', !active);
    }
    quantityInput.value = quantity;
    quantityMinus.disabled = quantity <= 1;
    quantityPlus.disabled = quantity >= 20;
    byId('selection-volume').textContent = `${selectedBundle.bottles} × 120 mL cada`;
    byId('atc-btn-text').textContent = `ADICIONAR AO CARRINHO — ${formatPrice(price)}`;
    byId('sticky-price').textContent = formatPrice(price);
    byId('sticky-bundle-label').textContent = selectedBundle.title;
    byId('sticky-shipping').textContent = shipping.cost ? `${shipping.label} de frete` : shipping.label;
    showBottlePhoto(byId('sticky-product-photo'), selectedBundle.bottles);
  }

  function updateCart() {
    const includedBundles = [];
    let kits = 0;
    let bottles = 0;
    let subtotal = 0;
    for (const bundle of bundles) {
      const kitQuantity = cart[bundle.id] ?? 0;
      bundle.row.classList.toggle('hidden', kitQuantity === 0);
      if (!kitQuantity) continue;
      const linePrice = bundle.price * kitQuantity;
      includedBundles.push(bundle);
      kits += kitQuantity;
      bottles += bundle.bottles * kitQuantity;
      subtotal += linePrice;
      bundle.row.querySelector('[data-item-price]').textContent = formatPrice(linePrice);
      bundle.row.querySelector('[data-item-quantity]').textContent = kitQuantity;
      bundle.row.querySelector('[data-cart-action="decrease"]').disabled = kitQuantity === 1;
    }

    const shipping = shippingFor(subtotal, includedBundles);
    const counter = byId('cart-counter');
    counter.textContent = kits;
    counter.classList.toggle('hidden', kits === 0);
    byId('open-cart-btn').setAttribute('aria-label', `Carrinho (${kits} ${kits === 1 ? 'kit' : 'kits'})`);
    byId('drawer-cart-count').textContent = kits;
    byId('drawer-bottle-summary').textContent = `${bottles} ${bottles === 1 ? 'frasco' : 'frascos'} no total`;
    byId('drawer-volume').classList.toggle('hidden', kits === 0);
    byId('cart-empty').classList.toggle('hidden', kits > 0);
    byId('cart-totals').classList.toggle('hidden', kits === 0);
    byId('drawer-subtotal').textContent = formatPrice(subtotal);
    byId('drawer-shipping').textContent = shipping.label;
    byId('drawer-total').textContent = formatPrice(subtotal + shipping.cost);
  }

  function setCartQuantity(id, newQuantity) {
    if (newQuantity > 0) cart[id] = newQuantity;
    else delete cart[id];
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      // The cart still works for this page when browser storage is unavailable.
    }
    updateCart();
  }

  const cartTemplate = byId('cart-item-template');
  for (const bundle of bundles) {
    bundle.radio.addEventListener('change', () => {
      selectedBundle = bundle;
      updateSelection();
    });

    const row = cartTemplate.content.firstElementChild.cloneNode(true);
    bundle.row = row;
    row.dataset.bundle = bundle.id;
    row.querySelector('[data-item-title]').textContent = bundle.title;
    showBottlePhoto(row.querySelector('[data-item-photo]'), bundle.bottles);

    const increase = row.querySelector('[data-cart-action="increase"]');
    const decrease = row.querySelector('[data-cart-action="decrease"]');
    const remove = row.querySelector('[data-cart-action="remove"]');
    increase.setAttribute('aria-label', `Aumentar quantidade de ${bundle.title}`);
    decrease.setAttribute('aria-label', `Diminuir quantidade de ${bundle.title}`);
    remove.setAttribute('aria-label', `Remover ${bundle.title} do carrinho`);
    increase.addEventListener('click', () => setCartQuantity(bundle.id, cart[bundle.id] + 1));
    decrease.addEventListener('click', () => setCartQuantity(bundle.id, cart[bundle.id] - 1));
    remove.addEventListener('click', () => {
      setCartQuantity(bundle.id, 0);
      byId('cart-modal').querySelector('button[data-close-modal]').focus();
    });
    byId('cart-items').append(row);
  }

  quantityMinus.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    updateSelection();
  });
  quantityPlus.addEventListener('click', () => {
    quantity = Math.min(20, quantity + 1);
    updateSelection();
  });

  const searchInput = byId('search-input');
  let activeModal;
  let modalTrigger;

  function closeModal(restoreFocus = true) {
    if (!activeModal) return;
    activeModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    if (restoreFocus) modalTrigger?.focus({ preventScroll: true });
    activeModal = null;
    modalTrigger = null;
  }

  function openModal(id, trigger) {
    closeModal(false);
    activeModal = byId(id);
    modalTrigger = trigger;
    activeModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    const initialFocus = id === 'search-modal' ? searchInput
      : id === 'pix-modal' ? byId('pix-customer-form').elements.namedItem('name')
        : activeModal.querySelector('button[data-close-modal]');
    initialFocus.focus({ preventScroll: true });
  }

  document.querySelectorAll('button[data-modal]').forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.modal, button));
  });
  document.querySelectorAll('[data-close-modal]').forEach((control) => {
    control.addEventListener('click', () => closeModal());
  });
  document.addEventListener('keydown', (event) => {
    if (!activeModal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(activeModal.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select'))
      .filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Pix payments are issued and verified by server-side Cloudflare Pages Functions.
  // Neither an API key nor an exchange rate chosen by the browser can create a charge.
  const pixForm = byId('pix-customer-form');
  const pixSubmit = byId('pix-generate');
  const pixError = byId('pix-error');
  const pixStatus = byId('pix-order-status');
  let pixCharge = null;
  let pixPollTimeout;
  let pixPolling = false;
  let pixPollUntil = 0;

  async function pixApi(path, payload) {
    const response = await fetch(`/api/pix/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Pagamento Pix temporariamente indisponível.');
    return data;
  }

  async function checkPixCheckoutAvailability() {
    pixSubmit.disabled = true;
    pixError.textContent = '';
    byId('pix-usd-total').textContent = byId('drawer-total').textContent;
    byId('pix-availability').textContent = 'Verificando disponibilidade do Pix…';
    // Do not allow a changed cart to use a stale quote.
    const cartSnapshot = JSON.stringify(cart);
    try {
      const quote = await pixApi('quote', { cart });
      if (cartSnapshot !== JSON.stringify(cart)) {
        byId('pix-availability').textContent = 'O carrinho foi alterado.';
        pixError.textContent = 'Feche o checkout e abra novamente para atualizar o total.';
        return;
      }
      byId('pix-usd-total').textContent = formatPrice(quote.totalBrlCents);
      byId('pix-availability').textContent = 'Você verá o valor exato em reais antes de confirmar o Pix no seu banco.';
      pixSubmit.disabled = false;
    } catch (error) {
      byId('pix-availability').textContent = 'O Pix está indisponível no momento.';
      pixError.textContent = error.message;
    }
  }

  function displayPixCharge(charge) {
    pixForm.classList.add('hidden');
    byId('pix-payment').classList.remove('hidden');
    byId('pix-pending').classList.remove('hidden');
    byId('pix-success').classList.add('hidden');
    pixError.textContent = '';
    byId('pix-usd-total').textContent = formatPrice(charge.totalBrlCents);
    byId('pix-availability').textContent = 'O código Pix contém o valor do pedido em reais. Confira no seu aplicativo bancário.';
    const rawImage = String(charge.qrCodeBase64).replace(/^data:image\/png;base64,/i, '').replace(/\s+/g, '');
    if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(rawImage)) throw new Error('Não foi possível gerar a imagem do QR Code.');
    byId('pix-qr-image').src = `data:image/png;base64,${rawImage}`;
    byId('pix-copy-code').value = charge.pixCode;
    pixStatus.textContent = 'Aguardando confirmação da operadora Pix…';
    byId('pix-check-status').disabled = false;
  }

  async function checkPixPayment() {
    if (!pixCharge || pixPolling) return;
    pixPolling = true;
    byId('pix-check-status').disabled = true;
    try {
      const result = await pixApi('status', {
        orderId: pixCharge.orderId,
        accessToken: pixCharge.accessToken,
      });
      if (result.status === 'paid') {
        byId('pix-success-order').textContent = pixCharge.orderId;
        byId('pix-pending').classList.add('hidden');
        byId('pix-success').classList.remove('hidden');
        clearTimeout(pixPollTimeout);
        pixCharge = null;
        cart = {};
        try { localStorage.removeItem(cartKey); } catch { /* Storage can be disabled. */ }
        updateCart();
      } else if (['expired', 'cancelled'].includes(result.status)) {
        pixStatus.textContent = `Cobrança Pix encerrada (${result.status}). Nenhum pagamento foi confirmado. Entre em contato com o suporte antes de tentar novamente.`;
        clearTimeout(pixPollTimeout);
        pixCharge = null;
      } else {
        pixStatus.textContent = 'Aguardando confirmação segura do pagamento…';
      }
    } catch {
      pixStatus.textContent = 'Ainda não conseguimos confirmar o pagamento. Vamos tentar novamente. Não pague duas vezes.';
    } finally {
      pixPolling = false;
      byId('pix-check-status').disabled = !pixCharge;
      if (pixCharge && Date.now() < pixPollUntil) {
        clearTimeout(pixPollTimeout);
        pixPollTimeout = setTimeout(checkPixPayment, 12_000);
      }
    }
  }

  byId('open-pix-checkout').addEventListener('click', (event) => {
    if (!Object.keys(cart).length) return;
    openModal('pix-modal', event.currentTarget);
    if (pixCharge) {
      displayPixCharge(pixCharge);
      return;
    }
    byId('pix-payment').classList.add('hidden');
    byId('pix-check-status').classList.remove('hidden');
    pixForm.classList.remove('hidden');
    checkPixCheckoutAvailability();
  });

  pixForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pixSubmit.disabled || pixCharge) return;
    pixSubmit.disabled = true;
    pixSubmit.textContent = 'Gerando Pix seguro…';
    pixError.textContent = '';
    const fields = Object.fromEntries(new FormData(pixForm).entries());
    const customer = {
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      address: {
        line1: fields.line1, line2: fields.line2, city: fields.city,
        state: fields.state, postalCode: fields.postalCode, country: 'BR',
      },
    };
    try {
      const charge = await pixApi('charge', { cart, customer });
      if (!charge.orderId || !charge.accessToken || !charge.pixCode || !charge.qrCodeBase64) {
        throw new Error('A resposta da operadora Pix veio incompleta. Procure o suporte antes de pagar novamente.');
      }
      pixCharge = charge;
      displayPixCharge(charge);
      pixPollUntil = Date.now() + 30 * 60_000;
      checkPixPayment();
    } catch (error) {
      pixError.textContent = `${error.message} Se uma cobrança Pix já foi gerada, procure o suporte antes de tentar novamente.`;
    } finally {
      pixSubmit.textContent = 'Gerar QR Code Pix';
      pixSubmit.disabled = Boolean(pixCharge);
    }
  });

  byId('pix-copy-button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(byId('pix-copy-code').value);
      byId('pix-copy-button').textContent = 'Copiado!';
    } catch {
      byId('pix-copy-code').focus();
      byId('pix-copy-code').select();
      byId('pix-copy-button').textContent = 'Selecione e copie o código';
    }
  });
  byId('pix-check-status').addEventListener('click', checkPixPayment);

  let toastTimer;
  function addToCart(event) {
    const { id, title } = selectedBundle;
    setCartQuantity(id, (cart[id] ?? 0) + quantity);
    const toast = byId('toast');
    byId('toast-msg').textContent = `${title} (${quantity}×)`;
    toast.classList.remove('opacity-0', 'translate-y-[-10px]');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-[-10px]'), 3000);
    openModal('cart-modal', event.currentTarget);
  }

  byId('main-atc-btn').addEventListener('click', addToCart);
  byId('sticky-atc-btn').addEventListener('click', addToCart);
  window.addEventListener('storage', (event) => {
    if (event.key === cartKey || event.key === null) {
      cart = readCart();
      updateCart();
    }
  });

  const searchResults = Array.from(byId('search-results').querySelectorAll('a'));
  function filterSearch() {
    const words = searchInput.value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const matches = searchResults.filter((link) => {
      const text = `${link.textContent} ${link.dataset.searchKeywords}`.toLowerCase();
      const matchesQuery = words.every((word) => text.includes(word));
      link.classList.toggle('hidden', !matchesQuery);
      return matchesQuery;
    });
    byId('search-results-title').textContent = words.length ? 'Resultados da busca' : 'Buscas populares';
    byId('search-status').classList.toggle('hidden', matches.length > 0);
    return matches;
  }

  searchInput.addEventListener('input', filterSearch);
  byId('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const matches = filterSearch();
    if (matches.length === 1) matches[0].click();
  });
  searchResults.forEach((link) => link.addEventListener('click', () => closeModal(false)));

  const mainImage = byId('main-product-img');
  const thumbnails = document.querySelectorAll('.gallery-thumb-btn');
  let imageTimer;
  thumbnails.forEach((button) => {
    button.addEventListener('click', () => {
      thumbnails.forEach((thumb) => {
        thumb.classList.remove('ring-2', 'ring-secondary-container', 'opacity-100');
        thumb.classList.add('opacity-70');
      });
      button.classList.add('ring-2', 'ring-secondary-container', 'opacity-100');
      button.classList.remove('opacity-70');
      const source = button.dataset.src;
      mainImage.style.opacity = '0.3';
      clearTimeout(imageTimer);
      imageTimer = setTimeout(() => {
        mainImage.src = source;
        mainImage.alt = button.querySelector('img').alt;
        mainImage.style.opacity = '1';
      }, 120);
    });
  });

  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const trigger = item.querySelector('.faq-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => {
      const shouldOpen = item.querySelector('.faq-content').classList.contains('hidden');
      faqItems.forEach((other) => {
        const expanded = other === item && shouldOpen;
        other.querySelector('.faq-trigger').setAttribute('aria-expanded', String(expanded));
        other.querySelector('.faq-content').classList.toggle('hidden', !expanded);
        other.querySelector('.faq-icon').style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    });
  });

  const reviewFilters = document.querySelectorAll('.review-filter-btn');
  const reviewCards = document.querySelectorAll('.review-card');
  reviewFilters.forEach((button) => {
    button.addEventListener('click', () => {
      reviewFilters.forEach((filter) => {
        filter.classList.remove('bg-primary', 'text-on-primary', 'font-bold');
        filter.classList.add('bg-surface-container', 'text-on-surface');
      });
      button.classList.add('bg-primary', 'text-on-primary', 'font-bold');
      button.classList.remove('bg-surface-container', 'text-on-surface');
      const tag = button.dataset.tag;
      reviewCards.forEach((card) => {
        card.style.display = tag === 'all' || card.dataset.category === tag ? 'flex' : 'none';
      });
    });
  });

  const stickyBar = byId('sticky-bar');
  function updateStickyBar() {
    stickyBar.classList.toggle('translate-y-full', window.scrollY <= 400);
  }
  window.addEventListener('scroll', updateStickyBar, { passive: true });
  updateStickyBar();
  updateSelection();
  updateCart();
})();
