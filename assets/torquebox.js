(() => {
  const byId = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const formatPrice = (cents) => money.format(cents / 100);
  const cartKey = 'torquebox-cart-usd-v1';
  const bottlePhoto = 'assets/images/qifor-wind-shield-pro.jpg';
  const shippingCharge = 499;
  const priorityThreshold = 4000;
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
    if (subtotal > priorityThreshold) return { cost: 0, label: 'Free US shipping' };
    if (includedBundles.some((bundle) => bundle.shipping === 'priority')) {
      return { cost: 0, label: 'Free US shipping' };
    }
    if (includedBundles.some((bundle) => bundle.shipping === 'standard')) {
      return { cost: 0, label: 'Free standard US shipping' };
    }
    return { cost: shippingCharge, label: formatPrice(shippingCharge) };
  }

  function showBottlePhoto(container, count) {
    if (container.childElementCount === count) return;
    container.setAttribute('aria-label', `${count} QIFOR ${count === 1 ? 'bottle' : 'bottles'}`);
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
    byId('selection-volume').textContent = `${selectedBundle.bottles} × 120 mL (4.05 fl oz each)`;
    byId('atc-btn-text').textContent = `ADD TO CART — ${formatPrice(price)} USD`;
    byId('sticky-price').textContent = formatPrice(price);
    byId('sticky-bundle-label').textContent = selectedBundle.title;
    byId('sticky-shipping').textContent = shipping.cost ? `${shipping.label} US shipping` : shipping.label;
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
    byId('open-cart-btn').setAttribute('aria-label', `Shopping Cart (${kits} ${kits === 1 ? 'kit' : 'kits'})`);
    byId('drawer-cart-count').textContent = kits;
    byId('drawer-bottle-summary').textContent = `${bottles} ${bottles === 1 ? 'bottle' : 'bottles'} total`;
    byId('drawer-volume').classList.toggle('hidden', kits === 0);
    byId('cart-empty').classList.toggle('hidden', kits > 0);
    byId('cart-totals').classList.toggle('hidden', kits === 0);
    byId('drawer-subtotal').textContent = formatPrice(subtotal);
    byId('drawer-shipping').textContent = shipping.label;
    byId('drawer-total').textContent = formatPrice(subtotal + shipping.cost);
    byId('checkout-button').disabled = !kits || !stripeReady || stripeLoading;
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
    increase.setAttribute('aria-label', `Increase quantity for ${bundle.title}`);
    decrease.setAttribute('aria-label', `Decrease quantity for ${bundle.title}`);
    remove.setAttribute('aria-label', `Remove ${bundle.title} from cart`);
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
  let stripeCheckout = null;
  let stripeReady = false;
  let stripeLoading = false;
  let stripeClient = null;

  function closeModal(restoreFocus = true) {
    if (!activeModal) return;
    if (activeModal.id === 'stripe-modal' && stripeCheckout) {
      stripeCheckout.destroy();
      stripeCheckout = null;
      byId('stripe-checkout').replaceChildren();
    }
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


  // Preview-only Stripe Embedded Checkout. Card details never reach our server.
  const checkoutButton = byId('checkout-button');
  const checkoutStatus = byId('checkout-status');
  const checkoutMessage = byId('stripe-message');
  const checkoutContainer = byId('stripe-checkout');
  const returnBanner = byId('stripe-return-banner');

  function notice(message) {
    returnBanner.textContent = message;
    returnBanner.classList.remove('hidden');
  }

  async function stripeJson(path, options) {
    const response = await fetch(`/api/stripe/${path}`, {
      cache: 'no-store', credentials: 'same-origin',
      headers: options?.body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Stripe test checkout is unavailable.');
    return data;
  }

  async function checkStripeAvailability() {
    try {
      const config = await stripeJson('config');
      if (config.mode !== 'test' || !config.publishableKey?.startsWith('pk_test_') || !window.Stripe) {
        throw new Error('Stripe test mode is not configured.');
      }
      stripeClient = window.Stripe(config.publishableKey);
      stripeReady = true;
      checkoutStatus.textContent = 'Secure card checkout • Stripe test mode • No real charges';
    } catch {
      checkoutStatus.textContent = 'Stripe test checkout needs configuration in Cloudflare before it can be used.';
    }
    updateCart();
  }

  checkoutButton.addEventListener('click', async (event) => {
    if (!stripeReady || stripeLoading || !Object.keys(cart).length) return;
    stripeLoading = true;
    updateCart();
    openModal('stripe-modal', event.currentTarget);
    checkoutMessage.textContent = 'Preparing your secure payment form…';
    byId('stripe-order-total').textContent = `Total: ${byId('drawer-total').textContent} USD`;
    checkoutContainer.replaceChildren();
    try {
      const snapshot = JSON.stringify(cart);
      const session = await stripeJson('create-session', {
        method: 'POST', body: JSON.stringify({ cart }),
      });
      if (snapshot !== JSON.stringify(cart)) throw new Error('Your cart changed. Close checkout and start again.');
      if (!session.clientSecret || !stripeClient) throw new Error('Could not open the payment form.');
      const embedded = await stripeClient.initEmbeddedCheckout({ clientSecret: session.clientSecret });
      if (activeModal?.id !== 'stripe-modal') {
        embedded.destroy();
        return;
      }
      stripeCheckout = embedded;
      embedded.mount('#stripe-checkout');
      checkoutMessage.textContent = 'Enter your name, email, US shipping address, and payment details below.';
    } catch (error) {
      if (activeModal?.id === 'stripe-modal') checkoutMessage.textContent = error.message;
    } finally {
      stripeLoading = false;
      updateCart();
    }
  });

  async function checkReturnedPayment(sessionId) {
    try {
      const result = await stripeJson(`status?session_id=${encodeURIComponent(sessionId)}`);
      if (result.status === 'paid') {
        cart = {};
        try { localStorage.setItem(cartKey, '{}'); } catch { /* Storage is optional. */ }
        updateCart();
        notice('Payment confirmed! Thank you for your TorqueBox order. For shipping updates, contact suporte@torque-box.com.');
        const url = new URL(window.location.href);
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      } else {
        notice('Your payment is being confirmed. Please do not pay again. Contact suporte@torque-box.com if this notice persists.');
      }
    } catch {
      notice('We could not check your payment right now. Please contact suporte@torque-box.com before trying again.');
    }
  }

  const returnSession = new URL(window.location.href).searchParams.get('session_id');
  if (returnSession) checkReturnedPayment(returnSession);
  checkStripeAvailability();

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
    byId('search-results-title').textContent = words.length ? 'Search results' : 'Popular searches';
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
