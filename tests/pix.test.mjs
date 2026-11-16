import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUsdBrlRate, priceCart, toBrlCents, validateCustomer } from '../functions/_lib/pix.js';
import { digestToken, makeOrderToken, saveVerifiedStatus, tokenMatches } from '../functions/_lib/orders.js';

test('one bottle includes $4.99 US shipping', () => {
  assert.deepEqual(priceCart({ '1_bottle': 1 }), {
    items: [{ id: '1_bottle', name: '1 Bottle (120 mL)', quantity: 1, unitUsdCents: 1995 }],
    kitCount: 1, bottleCount: 1, subtotalUsdCents: 1995,
    shippingUsdCents: 499, totalUsdCents: 2494,
  });
});

test('two and three bottle bundles include US shipping', () => {
  assert.equal(priceCart({ '2_bottles': 1 }).totalUsdCents, 2995);
  assert.equal(priceCart({ '3_bottles': 1 }).totalUsdCents, 3895);
  assert.equal(priceCart({ '1_bottle': 1, '2_bottles': 1 }).shippingUsdCents, 0);
  assert.equal(priceCart({ '1_bottle': 3 }).shippingUsdCents, 0);
});

test('the server rejects client-invented products and prices', () => {
  assert.throws(() => priceCart({ forged: 1 }), /Invalid product/);
  assert.throws(() => priceCart({ '1_bottle': 1.5 }), /Invalid product/);
  assert.throws(() => priceCart({ '1_bottle': 21 }), /Invalid product/);
  assert.throws(() => priceCart({ '1_bottle': 20, '2_bottles': 2 }), /maximum/);
  assert.throws(() => priceCart({}), /empty/);
});

test('USD cents convert to BRL cents without string rounding', () => {
  assert.equal(toBrlCents(2995, 5.4387), 16289);
  assert.equal(toBrlCents(2494, 5.4387), 13564);
});

test('exchange rate is read from the server, never a browser-supplied value', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const today = new Date().toISOString().slice(0, 10);
    globalThis.fetch = async (url) => {
      assert.match(url, /^https:\/\/api\.frankfurter\.dev\/v2\/rate\/usd\/brl/);
      return Response.json({ date: today, rate: 5.4387 });
    };
    assert.deepEqual(await getUsdBrlRate(), { rate: 5.4387, date: today, provider: 'BCB via Frankfurter' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('customer must supply a valid US delivery address', () => {
  const contact = {
    name: 'Alex Walker', email: 'alex@example.com', phone: '',
    address: { line1: '123 Main St', line2: '', city: 'Los Angeles', state: 'CA', postalCode: '90001', country: 'US' },
  };
  assert.equal(validateCustomer(contact).address.state, 'CA');
  assert.throws(() => validateCustomer({ ...contact, address: { ...contact.address, country: 'BR' } }), /valid US/);
  assert.throws(() => validateCustomer({ ...contact, address: { ...contact.address, postalCode: 'X' } }), /valid US/);
});

test('order status requires a matching private token and an authentic provider transaction', async () => {
  const token = makeOrderToken();
  const hashed = await digestToken(token);
  assert.equal(token.length, 64);
  assert.equal(await tokenMatches(token, hashed), true);
  assert.equal(await tokenMatches('a'.repeat(64), hashed), false);

  const writes = [];
  const db = { prepare(sql) { return { bind(...args) { return { async run() { writes.push({ sql, args }); } }; } }; } };
  const order = { id: 'o1', status: 'pending', pixou_tx_id: 't1', brl_total_cents: 13564 };
  assert.equal(await saveVerifiedStatus(db, order, { id: 't1', status: 'pending', payment_method: 'pix', total_amount: 13564 }), 'pending');
  assert.equal(writes.length, 0);
  await assert.rejects(saveVerifiedStatus(db, order, { id: 't1', status: 'paid', payment_method: 'pix', total_amount: 1 }), /mismatched/);
  assert.equal(writes.length, 0);
  assert.equal(await saveVerifiedStatus(db, order, { id: 't1', status: 'paid', payment_method: 'pix', total_amount: 13564 }), 'paid');
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /SET status = 'paid'/);
});
