import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { priceUsdCart, verifyStripeSignature } from '../functions/_lib/stripe.js';
import { onRequestPost as createSession } from '../functions/api/stripe/create-session.js';
import { onRequestPost as receiveWebhook } from '../functions/api/stripe/webhook.js';
import { onRequestGet as getStatus } from '../functions/api/stripe/status.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function dbAdapter(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...args) {
          return {
            async run() { statement.run(...args); return { success: true }; },
            async first() { return statement.get(...args) || null; },
          };
        },
      };
    },
  };
}

const siteOrigin = 'https://integracao-stripe.torquebox.pages.dev';

function post(path, body, origin = siteOrigin) {
  return new Request(`${siteOrigin}/api/stripe/${path}`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function signedWebhook(body, secret) {
  const timestamp = String(Math.trunc(Date.now() / 1000));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode(`${timestamp}.${body}`)));
  const sig = Array.from(digest, (v) => v.toString(16).padStart(2, '0')).join('');
  return new Request(`${siteOrigin}/api/stripe/webhook`, {
    method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${sig}` }, body,
  });
}

test('US bundle prices and shipping cannot be changed by the browser', () => {
  assert.deepEqual(priceUsdCart({ '1_bottle': 1 }), {
    items: [{ id: '1_bottle', name: 'QIFOR Wind Shield Pro — 1 bottle (120 mL)', quantity: 1, unitAmount: 1995 }],
    subtotal: 1995, shipping: 499, total: 2494,
  });
  assert.equal(priceUsdCart({ '2_bottles': 1 }).total, 2995);
  assert.equal(priceUsdCart({ '3_bottles': 1 }).total, 3895);
  assert.equal(priceUsdCart({ '1_bottle': 2 }).total, 4489);
  assert.equal(priceUsdCart({ '1_bottle': 3 }).total, 5985);
  assert.throws(() => priceUsdCart({ '2_bottles': -1 }), /quantity/);
  assert.throws(() => priceUsdCart({ fake: 1 }), /quantity/);
  assert.throws(() => priceUsdCart({ '1_bottle': 21 }), /quantity/);
});

test('test-only embedded checkout sessions, webhook signature, and verified paid status', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../migrations/0002_stripe_orders.sql', import.meta.url), 'utf8'));
  const env = { STRIPE_SECRET_KEY: 'sk_test_fake_only', STRIPE_PUBLISHABLE_KEY: 'pk_test_fake_only',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret', TORQUEBOX_DB: dbAdapter(db) };
  const originalFetch = globalThis.fetch;
  let createdOrderId;
  let amount;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.authorization, 'Bearer sk_test_fake_only');
      if (String(url).endsWith('/checkout/sessions')) {
        const data = new URLSearchParams(options.body);
        createdOrderId = data.get('metadata[order_id]');
        assert.equal(data.get('ui_mode'), 'embedded');
        assert.equal(data.get('shipping_address_collection[allowed_countries][0]'), 'US');
        assert.equal(data.get('line_items[0][price_data][unit_amount]'), '1995');
        assert.equal(data.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '499');
        assert.equal(data.get('return_url'), `${siteOrigin}/?session_id={CHECKOUT_SESSION_ID}`);
        amount = 2494;
        return Response.json({ id: 'cs_test_abcdefghijklmnopqrstuvwxyz',
          client_secret: 'cs_test_secret_example', livemode: false, currency: 'usd' });
      }
      if (String(url).includes('checkout/sessions/cs_test_abcdefghijklmnopqrstuvwxyz')) {
        return Response.json({ id: 'cs_test_abcdefghijklmnopqrstuvwxyz', currency: 'usd', amount_total: amount,
          livemode: false, payment_status: 'paid', metadata: { order_id: createdOrderId } });
      }
      throw new Error(`Unexpected Stripe request ${url}`);
    };

    const noLive = await createSession({ request: post('create-session', { cart: { '1_bottle': 1 } }),
      env: { ...env, STRIPE_SECRET_KEY: 'sk_live_not_allowed' } });
    assert.equal(noLive.status, 503);

    const wrongOrigin = await createSession({ request: post('create-session', { cart: { '1_bottle': 1 } }, 'https://evil.example'), env });
    assert.equal(wrongOrigin.status, 400);

    const response = await createSession({ request: post('create-session', { cart: { '1_bottle': 1 }, fakePrice: 1 }), env });
    assert.equal(response.status, 201);
    const session = await response.json();
    assert.equal(session.totalUsdCents, 2494);
    assert.equal(session.clientSecret, 'cs_test_secret_example');
    const row = db.prepare('SELECT * FROM stripe_orders WHERE id = ?').get(session.orderId);
    assert.equal(row.usd_total_cents, 2494);
    assert.equal(row.status, 'pending');

    const event = JSON.stringify({ livemode: false, id: 'evt_test_ok', type: 'checkout.session.completed',
      data: { object: { id: row.stripe_session_id, livemode: false, metadata: { order_id: row.id },
        amount_total: 2494, currency: 'usd', payment_status: 'paid',
        customer_details: { email: 'buyer@example.com' }, shipping_details: { name: 'Buyer' } } } });
    assert.equal((await receiveWebhook({ request: post('webhook', JSON.parse(event)), env })).status, 400);
    assert.equal((await receiveWebhook({ request: await signedWebhook(event, env.STRIPE_WEBHOOK_SECRET), env })).status, 200);
    assert.equal(db.prepare('SELECT status FROM stripe_orders WHERE id = ?').get(row.id).status, 'paid');
    assert.equal((await receiveWebhook({ request: await signedWebhook(event, env.STRIPE_WEBHOOK_SECRET), env })).status, 200);
    const status = await getStatus({ request: new Request(`${siteOrigin}/api/stripe/status?session_id=${row.stripe_session_id}`), env });
    assert.deepEqual(await status.json(), { status: 'paid' });
    assert.equal(await verifyStripeSignature(event, 't=1000000000,v1=' + 'a'.repeat(64), env.STRIPE_WEBHOOK_SECRET), false);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});

test('production requires an explicit live opt-in, exact store host and matching live keys', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../migrations/0002_stripe_orders.sql', import.meta.url), 'utf8'));
  const origin = 'https://torque-box.com';
  const env = { STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_fake_only',
    STRIPE_PUBLISHABLE_KEY: 'pk_live_fake_only', STRIPE_WEBHOOK_SECRET: 'whsec_live_secret',
    TORQUEBOX_DB: dbAdapter(db) };
  const originalFetch = globalThis.fetch;
  let createdOrderId;
  try {
    const liveRequest = () => new Request(`${origin}/api/stripe/create-session`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: { '1_bottle': 1 } }),
    });
    assert.equal((await createSession({ request: liveRequest(), env: { ...env, STRIPE_MODE: undefined } })).status, 503);
    assert.equal((await createSession({ request: liveRequest(), env: { ...env, STRIPE_SECRET_KEY: 'sk_test_bad' } })).status, 503);
    assert.equal((await createSession({ request: post('create-session', { cart: { '1_bottle': 1 } }), env })).status, 503);
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.authorization, 'Bearer sk_live_fake_only');
      if (String(url).endsWith('/checkout/sessions')) {
        const form = new URLSearchParams(options.body);
        createdOrderId = form.get('metadata[order_id]');
        assert.equal(form.get('ui_mode'), 'embedded');
        assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1995');
        return Response.json({ id: 'cs_live_abcdefghijklmnopqrstuvwxyz', client_secret: 'cs_live_secret_example',
          currency: 'usd', livemode: true });
      }
      return Response.json({ id: 'cs_live_abcdefghijklmnopqrstuvwxyz', currency: 'usd',
        amount_total: 2494, payment_status: 'paid', livemode: true, metadata: { order_id: createdOrderId } });
    };
    const created = await createSession({ request: liveRequest(), env });
    assert.equal(created.status, 201);
    const result = await created.json();
    assert.equal(result.totalUsdCents, 2494);
    const event = JSON.stringify({ livemode: true, id: 'evt_live_ok', type: 'checkout.session.completed',
      data: { object: { id: 'cs_live_abcdefghijklmnopqrstuvwxyz', livemode: true, currency: 'usd',
        amount_total: 2494, payment_status: 'paid', metadata: { order_id: createdOrderId } } } });
    const signed = await signedWebhook(event, env.STRIPE_WEBHOOK_SECRET);
    const liveSigned = new Request(`${origin}/api/stripe/webhook`, { method: 'POST',
      headers: signed.headers, body: event });
    assert.equal((await receiveWebhook({ request: liveSigned, env })).status, 200);
    assert.equal((await getStatus({ request: new Request(`${origin}/api/stripe/status?session_id=cs_live_abcdefghijklmnopqrstuvwxyz`), env })).status, 200);
    assert.equal(db.prepare('SELECT status FROM stripe_orders WHERE id = ?').get(createdOrderId).status, 'paid');
    const testEvent = JSON.stringify({ ...JSON.parse(event), livemode: false });
    const testSigned = await signedWebhook(testEvent, env.STRIPE_WEBHOOK_SECRET);
    const liveTest = new Request(`${origin}/api/stripe/webhook`, { method: 'POST',
      headers: testSigned.headers, body: testEvent });
    assert.equal((await receiveWebhook({ request: liveTest, env })).status, 400);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});
