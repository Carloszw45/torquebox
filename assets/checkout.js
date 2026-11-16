import { catalog, quoteCart } from './catalog.js';

const attemptKey = 'torquebox-checkout';
const stripeScript = 'https://js.stripe.com/endive/stripe.js';
let stripeLoading;

function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  stripeLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = stripeScript;
    script.onload = () => {
      if (typeof window.Stripe === 'function') resolve(window.Stripe);
      else {
        script.remove();
        reject(new Error('Unable to initialize Stripe'));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Unable to load Stripe'));
    };
    document.head.append(script);
  }).catch((error) => {
    stripeLoading = undefined;
    throw error;
  });
  return stripeLoading;
}

async function request(path, body) {
  const response = await fetch(new URL(`api/checkout/${path}`, document.baseURI), {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Checkout is temporarily unavailable.');
  return result;
}

function readAttempt() {
  try {
    const attempt = JSON.parse(sessionStorage.getItem(attemptKey));
    if (typeof attempt?.id === 'string' && quoteCart(attempt.items).lines.length) return attempt;
  } catch {
    // An unavailable or invalid saved attempt starts a fresh checkout.
  }
  return null;
}

const cartSignature = (items) => JSON.stringify(Object.keys(catalog).map((id) => items[id] ?? 0));

export function setupCheckout({ getCart, onPaid, open, back }) {
  const payButton = document.getElementById('checkout-btn');
  const cartStatus = document.getElementById('checkout-status');
  const message = document.getElementById('payment-message');
  const retry = document.getElementById('checkout-retry');
  const mount = document.getElementById('stripe-checkout');
  let configuration;
  let attempt = readAttempt();
  let embedded;
  let processing = false;
  let generation = 0;

  function saveAttempt(value) {
    attempt = value;
    try {
      if (value) sessionStorage.setItem(attemptKey, JSON.stringify(value));
      else sessionStorage.removeItem(attemptKey);
    } catch {
      // Keep the attempt in memory if browser storage is unavailable.
    }
  }

  function setMessage(text, retryLabel = '') {
    message.textContent = text;
    message.classList.toggle('hidden', !text);
    retry.textContent = retryLabel;
    retry.classList.toggle('hidden', !retryLabel);
  }

  function finishPayment(paidAttempt, token) {
    if (attempt?.id === paidAttempt.id) {
      onPaid(paidAttempt.items, paidAttempt.sessionId);
      saveAttempt(null);
    }
    if (token === generation) setMessage('Payment confirmed. Your order has been received.');
  }

  async function createSession(current) {
    const session = await request('session', { items: current.items, attemptId: current.id });
    current.sessionId = session.sessionId;
    if (attempt?.id === current.id) saveAttempt(current);
    return session.clientSecret;
  }

  function status(current, expireOpen = false) {
    return request('status', { sessionId: current.sessionId, attemptId: current.id, expireOpen });
  }

  async function confirmPayment(current, token) {
    if (token === generation) {
      embedded?.destroy();
      embedded = undefined;
      setMessage('Confirming your payment…');
    }
    try {
      const result = await status(current);
      if (result.state === 'paid') finishPayment(current, token);
      else if (token === generation) setMessage('Payment confirmation is pending.', 'Check payment status');
    } catch {
      if (token === generation) setMessage('We could not confirm your payment yet.', 'Check payment status');
    }
  }

  async function start() {
    if (processing || !configuration?.publishableKey) return;
    processing = true;
    payButton.disabled = true;
    const token = ++generation;
    const items = getCart();
    setMessage('Loading checkout…');
    try {
      if (attempt) {
        const previous = attempt;
        if (!previous.sessionId) await createSession(previous);
        const changed = cartSignature(previous.items) !== cartSignature(items);
        const result = await status(previous, changed);
        if (result.state === 'paid') {
          finishPayment(previous, token);
          return;
        }
        if (result.state === 'processing') {
          if (token === generation) setMessage('Your payment is processing.', 'Check payment status');
          return;
        }
        if (result.state === 'expired') saveAttempt(null);
      }
      if (token !== generation) return;
      if (!quoteCart(items).lines.length) {
        setMessage('Your cart is empty.');
        return;
      }
      if (!attempt) saveAttempt({ id: crypto.randomUUID(), items });
      const current = attempt;
      const Stripe = await loadStripe();
      if (token !== generation) return;
      const checkout = await Stripe(configuration.publishableKey).createEmbeddedCheckoutPage({
        fetchClientSecret: () => createSession(current),
        onComplete: () => void confirmPayment(current, token),
      });
      if (token !== generation) {
        checkout.destroy();
        return;
      }
      embedded = checkout;
      checkout.mount(mount);
      setMessage('');
    } catch {
      if (token === generation) setMessage('Checkout could not be opened.', 'Try again');
    } finally {
      processing = false;
      payButton.disabled = false;
    }
  }

  payButton.addEventListener('click', () => {
    open();
    void start();
  });
  retry.addEventListener('click', () => void start());
  document.getElementById('checkout-back').addEventListener('click', back);

  request('config').then((config) => {
    if (!config.publishableKey) return;
    configuration = config;
    payButton.classList.remove('hidden');
    cartStatus.classList.add('hidden');
    document.getElementById('checkout-test-mode').classList.toggle('hidden', !config.testMode);
  }).catch(() => {
    // A static preview still supports the cart while the payment API is unavailable.
  });

  return () => {
    ++generation;
    embedded?.destroy();
    embedded = undefined;
    mount.replaceChildren();
  };
}
