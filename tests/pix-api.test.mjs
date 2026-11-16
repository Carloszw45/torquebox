import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as createCharge } from '../functions/api/pix/charge.js';
import { onRequestPost as getStatus } from '../functions/api/pix/status.js';
import { onRequestPost as receiveWebhook } from '../functions/api/pix/webhook.js';

function request(path, body) {
  return new Request(`https://torque-box.com/api/pix/${path}`, {
    method: 'POST',
    headers: { Origin: 'https://torque-box.com', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('Pix checkout stores USD/BRL amounts and confirms only authenticated provider-paid transactions', async () => {
  const db = new DatabaseSync(':memory:');
  const migration = await readFile(new URL('../migrations/0001_torque_orders.sql', import.meta.url), 'utf8');
  db.exec(migration);
  const d1 = {
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
  const env = { PIXOU_SECRET_TOKEN: 'test-only-private-token', TORQUEBOX_DB: d1 };
  const originalFetch = globalThis.fetch;
  let providerStatus = 'pending';
  let recordedAmount;
  try {
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('frankfurter.dev')) {
        return Response.json({ date: new Date().toISOString().slice(0, 10), rate: 5.4387 });
      }
      assert.equal(options.headers.Authorization, 'Bearer test-only-private-token');
      if (String(url).endsWith('/charge')) {
        const charge = JSON.parse(options.body);
        assert.equal(charge.payment_method, 'pix');
        assert.equal(charge.amount, 16289);
        assert.equal(charge.postbackUrl, 'https://torque-box.com/api/pix/webhook');
        recordedAmount = charge.amount;
        return Response.json({ data: {
          id: '11111111-1111-4111-8111-111111111111',
          status: 'pending', payment_method: 'pix', total_amount: recordedAmount,
          pix: { code: 'test-pix-code', qrcode_base64: 'ZmFrZQ==' },
        } });
      }
      if (String(url).includes('/transaction?id=')) {
        return Response.json({ data: {
          id: '11111111-1111-4111-8111-111111111111',
          status: providerStatus, payment_method: 'pix', total_amount: recordedAmount,
        } });
      }
      throw new Error(`Unexpected URL ${url}`);
    };

    const customer = {
      name: 'Alex Walker', email: 'alex@example.com', phone: '',
      address: { line1: '123 Main St', line2: '', city: 'Los Angeles', state: 'CA', postalCode: '90001', country: 'US' },
    };
    const createdResponse = await createCharge({
      request: request('charge', { cart: { '2_bottles': 1 }, customer }), env,
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.totalUsdCents, 2995);
    assert.equal(created.totalBrlCents, 16289);
    assert.ok(created.accessToken);
    const row = db.prepare('SELECT * FROM torque_orders WHERE id = ?').get(created.orderId);
    assert.equal(row.usd_total_cents, 2995);
    assert.equal(row.brl_total_cents, 16289);
    assert.equal(row.status, 'pending');
    assert.equal(row.access_token_hash.length, 64);
    assert.equal(row.access_token_hash.includes(created.accessToken), false);

    // A forged 'paid' webhook must not mark the order paid if the PIXOU API disagrees.
    const fakeWebhook = await receiveWebhook({ request: request('webhook', {
      event: 'transaction.processed', data: { id: row.pixou_tx_id, status: 'paid' },
    }), env });
    assert.equal(fakeWebhook.status, 200);
    assert.equal(db.prepare('SELECT status FROM torque_orders WHERE id = ?').get(row.id).status, 'pending');

    providerStatus = 'paid';
    const verified = await getStatus({ request: request('status', {
      orderId: created.orderId, accessToken: created.accessToken,
    }), env });
    assert.deepEqual(await verified.json(), { orderId: created.orderId, status: 'paid' });
    assert.ok(db.prepare('SELECT paid_at FROM torque_orders WHERE id = ?').get(row.id).paid_at);

    const invalid = await getStatus({ request: request('status', {
      orderId: created.orderId, accessToken: '0'.repeat(64),
    }), env });
    assert.equal(invalid.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});
