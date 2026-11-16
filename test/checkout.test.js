import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteCart } from '../assets/catalog.js';
import worker from '../worker.js';

const origin = 'https://torquebox.example';
const attemptId = 'dd880311-7150-4a43-a2a2-cdf600d6ec85';
const sessionId = 'cs_test_TorqueBoxSession';
const env = { STRIPE_PUBLISHABLE_KEY: 'pk_test_fixture', STRIPE_SECRET_KEY: 'sk_test_fixture' };

function post(path, body, requestOrigin = origin, bindings = env) {
  return worker.fetch(new Request(`${origin}/api/checkout/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
    body: JSON.stringify({ ...body, attemptId }),
  }), bindings);
}

test('cart and checkout share USD prices and shipping rules', () => {
  for (const [items, shipping, total] of [
    [{ '1_bottle': 1 }, 499, 2494],
    [{ '1_bottle': 2 }, 499, 4489],
    [{ '1_bottle': 3 }, 0, 5985],
    [{ '2_bottles': 1 }, 0, 2995],
    [{ '3_bottles': 1 }, 0, 3895],
    [{ '1_bottle': 1, '2_bottles': 1, '3_bottles': 1 }, 0, 8885],
  ]) {
    const order = quoteCart(items);
    assert.equal(order.shipping.cost, shipping);
    assert.equal(order.total, total);
  }
  assert.throws(() => quoteCart({ '1_bottle': -1 }), /Invalid cart item/);
  assert.throws(() => quoteCart({ unknown: 1 }), /Invalid cart item/);
});

test('session uses trusted amounts, an embedded card form, and an idempotency key', async (t) => {
  const stripe = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(init.headers['Idempotency-Key'], `torquebox-${attemptId}`);
    const fields = Object.fromEntries(init.body);
    assert.equal(fields.ui_mode, 'embedded_page');
    assert.equal(fields.redirect_on_completion, 'never');
    assert.equal(fields['payment_method_types[0]'], 'card');
    assert.equal(fields['shipping_address_collection[allowed_countries][0]'], 'US');
    assert.equal(fields['line_items[0][price_data][currency]'], 'usd');
    assert.equal(fields['line_items[0][price_data][unit_amount]'], '1995');
    assert.equal(fields['line_items[0][quantity]'], '2');
    assert.equal(fields['shipping_options[0][shipping_rate_data][fixed_amount][amount]'], '499');
    assert.equal(fields['adaptive_pricing[enabled]'], 'false');
    assert.equal(fields.return_url, undefined);
    return Response.json({ id: sessionId, client_secret: 'client-secret-fixture', secret: 'server-only' });
  });
  const response = await post('session', { items: { '1_bottle': 2 }, price: 1, shipping: 0 });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { sessionId, clientSecret: 'client-secret-fixture' });
  assert.equal(stripe.mock.callCount(), 1);
});

test('bad cart, cross-origin POST, and missing keys never call Stripe', async (t) => {
  const stripe = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected Stripe request'); });
  assert.equal((await post('session', { items: { '1_bottle': 1.5 } })).status, 400);
  assert.equal((await post('session', { items: { '2_bottles': 1 } }, 'https://other.example')).status, 403);
  assert.equal((await post('session', { items: { '2_bottles': 1 } }, origin, {})).status, 503);
  assert.equal(stripe.mock.callCount(), 0);
  const request = new Request(`${origin}/api/checkout/config`);
  assert.deepEqual(await (await worker.fetch(request, {})).json(), { available: false });
  assert.deepEqual(await (await worker.fetch(request, env)).json(), { publishableKey: env.STRIPE_PUBLISHABLE_KEY, testMode: true });
});

test('payment is confirmed only for a matching paid session', async (t) => {
  let saved = { status: 'complete', payment_status: 'unpaid', client_reference_id: attemptId, metadata: { store: 'torquebox' } };
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...saved, customer_details: { email: 'private@example.invalid' } }));
  assert.deepEqual(await (await post('status', { sessionId })).json(), { state: 'processing' });
  saved.payment_status = 'paid';
  assert.deepEqual(await (await post('status', { sessionId })).json(), { state: 'paid' });
  saved.client_reference_id = 'different';
  assert.equal((await post('status', { sessionId })).status, 404);
});

test('cart changes expire open sessions and check if payment won the race', async (t) => {
  const base = { status: 'open', payment_status: 'unpaid', client_reference_id: attemptId, metadata: { store: 'torquebox' } };
  let race = false;
  let lookupCount = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/expire')) {
      assert.equal(init.method, 'POST');
      return race ? new Response(null, { status: 409 }) : Response.json({ ...base, status: 'expired' });
    }
    assert.equal(init.method, 'GET');
    lookupCount += 1;
    return Response.json(race && lookupCount > 1 ? { ...base, status: 'complete', payment_status: 'paid' } : base);
  });
  assert.deepEqual(await (await post('status', { sessionId, expireOpen: true })).json(), { state: 'expired' });
  race = true;
  lookupCount = 0;
  assert.deepEqual(await (await post('status', { sessionId, expireOpen: true })).json(), { state: 'paid' });
});
