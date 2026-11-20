import { CHECKOUT_ENABLED, CHECKOUT_UNAVAILABLE_MESSAGE, CHECKOUT_OFFERS, getCheckoutOffer } from './checkout-offers.js?v=20261120-paused';

(() => {
  const byId = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const formatPrice = (cents) => money.format(cents / 100);
  const cartKey = 'torquebox-cart-usd-one-pack-v1';
  const bottlePhoto = 'assets/images/qifor-wind-shield-pro.jpg';
  const bundles = Array.from(document.querySelectorAll('.bundle-card'), (card) => {
    const radio = card.querySelector('input[name="bundle_selection"]');
    return {
      id: radio.value,
      title: card.dataset.title,
      bottles: Number(card.dataset.bottles),
      price: CHECKOUT_OFFERS[radio.value].subtotalCents,
      shipping: card.dataset.shipping,
      card,
      radio,
    };
  });

  let selectedBundle = bundles.find((bundle) => bundle.radio.checked) ?? bundles[0];

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey));
      if (!getCheckoutOffer(saved)) return {};
      const [id] = Object.keys(saved);
      return { [id]: 1 };
    } catch {
      return {};
    }
  }

  let cart = readCart();

  function shippingFor(subtotal, includedBundles) {
    if (subtotal === 0) return { cost: 0, label: '' };
    const shippingCents = CHECKOUT_OFFERS[includedBundles[0].id].shippingCents;
    return { cost: shippingCents, label: shippingCents ? formatPrice(shippingCents) : 'Free US shipping' };
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
    const price = selectedBundle.price;
    const shipping = shippingFor(price, [selectedBundle]);
    for (const bundle of bundles) {
      const active = bundle === selectedBundle;
      for (const className of ['ring-2', 'ring-secondary-container', 'shadow-md', 'border-secondary-container']) {
        bundle.card.classList.toggle(className, active);
      }
      bundle.card.classList.toggle('shadow-sm', !active);
      bundle.card.classList.toggle('border-outline-variant/30', !active);
    }
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
    byId('checkout-button').disabled = !CHECKOUT_ENABLED || !getCheckoutOffer(cart);
    byId('checkout-button').textContent = CHECKOUT_ENABLED ? 'Continue to secure payment' : 'Checkout temporarily unavailable';
    byId('checkout-status').textContent = CHECKOUT_ENABLED
      ? 'Continue to secure payment in this tab.' : CHECKOUT_UNAVAILABLE_MESSAGE;
    byId('payment-availability').hidden = CHECKOUT_ENABLED;
    byId('payment-availability').textContent = CHECKOUT_ENABLED ? '' : CHECKOUT_UNAVAILABLE_MESSAGE;
  }

  function setCartQuantity(id, newQuantity) {
    cart = newQuantity > 0 ? { [id]: 1 } : {};
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

    const remove = row.querySelector('[data-cart-action="remove"]');
    remove.setAttribute('aria-label', `Remove ${bundle.title} from cart`);
    remove.addEventListener('click', () => {
      setCartQuantity(bundle.id, 0);
      byId('cart-modal').querySelector('button[data-close-modal]').focus();
    });
    byId('cart-items').append(row);
  }

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

  let toastTimer;
  function addToCart(event) {
    const { id, title } = selectedBundle;
    setCartQuantity(id, 1);
    const toast = byId('toast');
    byId('toast-msg').textContent = `${title} (1 pack)`;
    toast.classList.remove('opacity-0', 'translate-y-[-10px]');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-[-10px]'), 3000);
    openModal('cart-modal', event.currentTarget);
  }

  byId('main-atc-btn').addEventListener('click', addToCart);
  byId('sticky-atc-btn').addEventListener('click', addToCart);
  byId('checkout-button').addEventListener('click', () => {
    if (!CHECKOUT_ENABLED) {
      byId('checkout-status').textContent = CHECKOUT_UNAVAILABLE_MESSAGE;
      return;
    }
    const offer = getCheckoutOffer(cart);
    if (!offer) {
      byId('checkout-status').textContent = 'Choose one pack to continue.';
      return;
    }
    window.location.assign(offer.url);
  });
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
