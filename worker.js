import { quoteCart } from './assets/catalog.js';

const stripeApi = 'https://api.stripe.com/v1/checkout/sessions';
const stripeVersion = '2026-10-28.endive';
const storeId = 'torquebox';
const attemptPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const sessionPattern = /^cs_(?:test|live)_[A-Za-z0-9]{8,120}$/;

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function stripeConfiguration(env) {
  const publicKey = env.STRIPE_PUBLISHABLE_KEY ?? '';
  const secret = env.STRIPE_SECRET_KEY ?? '';
  const mode = /^pk_(test|live)_[A-Za-z0-9_]+$/.exec(publicKey)?.[1];
  if (!mode || !new RegExp(`^(?:sk|rk)_${mode}_[A-Za-z0-9_]+$`).test(secret)) return null;
  return { publicKey, secret, mode };
}

async function stripeRequest(config, path, params, idempotencyKey) {
  const headers = { Authorization: `Bearer ${config.secret}`, 'Stripe-Version': stripeVersion };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return fetch(`${stripeApi}${path}`, {
    method: params ? 'POST' : 'GET',
    body: params,
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
}

async function createSession(config, url, { items, attemptId }) {
  let order;
  try {
    order = quoteCart(items);
  } catch {
    return json({ error: 'Check the items in your cart.' }, 400);
  }
  if (!order.lines.length) return json({ error: 'Your cart is empty.' }, 400);

  const params = new URLSearchParams({
    mode: 'payment',
    ui_mode: 'embedded_page',
    redirect_on_completion: 'never',
    client_reference_id: attemptId,
    'metadata[store]': storeId,
    'payment_method_types[0]': 'card',
    'shipping_address_collection[allowed_countries][0]': 'US',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(order.shipping.cost),
    'shipping_options[0][shipping_rate_data][display_name]': order.shipping.cost ? 'Standard US shipping' : order.shipping.label,
    'adaptive_pricing[enabled]': 'false',
  });
  order.lines.forEach((line, index) => {
    const item = `line_items[${index}]`;
    params.set(`${item}[price_data][currency]`, 'usd');
    params.set(`${item}[price_data][unit_amount]`, String(line.price));
    params.set(`${item}[price_data][product_data][name]`, `QIFOR Wind Shield Pro · ${line.title}`);
    params.set(`${item}[price_data][product_data][metadata][kit]`, line.id);
    if (url.protocol === 'https:') {
      params.set(`${item}[price_data][product_data][images][0]`, `${url.origin}/assets/images/qifor-wind-shield-pro.jpg`);
    }
    params.set(`${item}[quantity]`, String(line.quantity));
  });

  const response = await stripeRequest(config, '', params, `${storeId}-${attemptId}`);
  if (!response.ok) return json({ error: 'Checkout is temporarily unavailable. Please try again.' }, 502);
  const session = await response.json();
  if (!sessionPattern.test(session.id) || typeof session.client_secret !== 'string' || !session.client_secret) {
    return json({ error: 'Checkout could not be opened. Please try again.' }, 502);
  }
  return json({ sessionId: session.id, clientSecret: session.client_secret });
}

async function sessionStatus(config, { sessionId, attemptId, expireOpen }) {
  if (typeof sessionId !== 'string' || !sessionPattern.test(sessionId) || !sessionId.startsWith(`cs_${config.mode}_`)) {
    return json({ error: 'Invalid checkout session.' }, 400);
  }
  const path = `/${sessionId}`;
  const response = await stripeRequest(config, path);
  if (!response.ok) return json({ error: 'Payment status could not be confirmed.' }, 502);
  let session = await response.json();
  if (session.client_reference_id !== attemptId || session.metadata?.store !== storeId) {
    return json({ error: 'Checkout session was not found.' }, 404);
  }

  if (expireOpen === true && session.status === 'open') {
    const expired = await stripeRequest(config, `${path}/expire`, new URLSearchParams());
    if (expired.ok) session = await expired.json();
    else {
      // Payment may have completed while the request to expire the session was in flight.
      const current = await stripeRequest(config, path);
      if (!current.ok) return json({ error: 'Payment status could not be confirmed.' }, 502);
      session = await current.json();
      if (session.status === 'open') return json({ error: 'The previous checkout is still open. Try again.' }, 409);
    }
  }

  if (session.status === 'complete') {
    return json({ state: session.payment_status === 'paid' ? 'paid' : 'processing' });
  }
  if (session.status === 'open' || session.status === 'expired') return json({ state: session.status });
  return json({ error: 'Payment status could not be confirmed.' }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/checkout/')) return env.ASSETS.fetch(request);

    const config = stripeConfiguration(env);
    if (request.method === 'GET' && url.pathname === '/api/checkout/config') {
      return json(config ? { publishableKey: config.publicKey, testMode: config.mode === 'test' } : { available: false });
    }
    if (!['/api/checkout/session', '/api/checkout/status'].includes(url.pathname)) return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (request.headers.get('Origin') !== url.origin) return json({ error: 'Invalid checkout origin.' }, 403);
    const mediaType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return json({ error: 'Expected a JSON request.' }, 415);
    }
    if (!config) return json({ error: 'Online checkout is currently unavailable.' }, 503);

    let payload;
    try {
      if (Number(request.headers.get('Content-Length')) > 4096) return json({ error: 'Request is too large.' }, 413);
      const text = await request.text();
      if (text.length > 4096) return json({ error: 'Request is too large.' }, 413);
      payload = JSON.parse(text);
      if (typeof payload?.attemptId !== 'string' || !attemptPattern.test(payload.attemptId)) {
        return json({ error: 'Invalid checkout request.' }, 400);
      }
    } catch {
      return json({ error: 'Invalid checkout request.' }, 400);
    }

    try {
      return url.pathname === '/api/checkout/session'
        ? await createSession(config, url, payload)
        : await sessionStatus(config, payload);
    } catch {
      return json({ error: 'The payment service is temporarily unavailable. Please try again.' }, 502);
    }
  },
};
