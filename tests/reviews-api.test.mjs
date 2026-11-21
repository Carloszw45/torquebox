import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { onRequestGet as listReviews, onRequestPost as publishReview } from '../functions/api/reviews.js';
import { onRequestGet as getPhoto } from '../functions/api/reviews/image/[id].js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function d1Adapter(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() { return statement.run(...args); },
        async first() { return statement.get(...args) || null; },
        async all() { return { results: statement.all(...args) }; },
      };
    },
    async batch(statements) {
      db.exec('BEGIN TRANSACTION');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

const origin = 'https://torque-box.com';
const sessionId = 'cs_live_' + 'A'.repeat(48);
function reviewRequest(session = sessionId, overrides = {}) {
  const form = new FormData();
  form.set('sessionId', session);
  form.set('name', 'Alex Walker');
  form.set('rating', '5');
  form.set('body', 'Cleaned my windshield well after several weeks of oily road residue.');
  form.set('category', 'oil');
  form.set('publishConsent', 'yes');
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return new Request(origin + '/api/reviews', { method: 'POST', headers: { origin }, body: form });
}

test('review API allows only a verified paid Stripe order and publishes photos safely', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(await readFile(new URL('../migrations/0002_stripe_orders.sql', import.meta.url), 'utf8'));
  const env = { TORQUEBOX_DB: d1Adapter(sqlite) };

  const empty = await listReviews({ request: new Request(origin + '/api/reviews'), env });
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { reviews: [], total: 0, nextCursor: null });

  const beforePayment = await publishReview({ request: reviewRequest(), env });
  assert.equal(beforePayment.status, 403);
  const pendingId = '818ff887-d40d-4a6e-b99c-066e150e349a';
  sqlite.prepare(`INSERT INTO stripe_orders (id, stripe_session_id, status, items_json,
    usd_subtotal_cents, usd_shipping_cents, usd_total_cents, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(pendingId, sessionId, 'pending', '[]', 1995, 499, 2494,
      new Date().toISOString(), new Date().toISOString());
  const stillPending = await publishReview({ request: reviewRequest(), env });
  assert.equal(stillPending.status, 403);
  sqlite.prepare(`UPDATE stripe_orders SET status = 'paid' WHERE id = ?`).run(pendingId);

  const form = new FormData();
  form.set('sessionId', sessionId);
  form.set('name', 'Alex Walker');
  form.set('rating', '4');
  form.set('body', 'The product worked well on my windscreen during a rainy commute.');
  form.set('category', 'night');
  form.set('publishConsent', 'yes');
  // The image API validates signatures. These small test buffers are header fixtures.
  form.append('photos', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
    'windshield.png', { type: 'image/png' }));
  const added = await publishReview({ request: new Request(origin + '/api/reviews', {
    method: 'POST', headers: { origin }, body: form,
  }), env });
  assert.equal(added.status, 201);
  const saved = (await added.json()).review;
  assert.equal(saved.name, 'Alex Walker');
  assert.equal(saved.rating, 4);
  assert.equal(saved.photos.length, 1);
  assert.ok(saved.photos[0].startsWith('/api/reviews/image/'));

  const duplicate = await publishReview({ request: reviewRequest(), env });
  assert.equal(duplicate.status, 409);

  const secondSession = 'cs_live_' + 'B'.repeat(48);
  const secondId = '918ff887-d40d-4a6e-b99c-066e150e349b';
  sqlite.prepare(`INSERT INTO stripe_orders (id, stripe_session_id, status, items_json,
    usd_subtotal_cents, usd_shipping_cents, usd_total_cents, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(secondId, secondSession, 'paid', '[]', 2995, 0, 2995,
      new Date().toISOString(), new Date().toISOString());
  const textOnly = await publishReview({ request: reviewRequest(secondSession, {
    name: 'Morgan L.', rating: '3', category: 'general',
  }), env });
  assert.equal(textOnly.status, 201);
  assert.deepEqual((await textOnly.json()).review.photos, []);

  const list = await listReviews({ request: new Request(origin + '/api/reviews'), env });
  const payload = await list.json();
  assert.equal(payload.total, 2);
  assert.equal(payload.reviews.length, 2);
  assert.ok(!JSON.stringify(payload).includes(sessionId), 'Checkout token must remain private');

  const firstPage = await listReviews({ request: new Request(origin + '/api/reviews?limit=1'), env });
  const page = await firstPage.json();
  assert.equal(page.reviews.length, 1);
  assert.ok(page.nextCursor);
  const secondPage = await listReviews({ request: new Request(origin + '/api/reviews?limit=1&before='
    + encodeURIComponent(page.nextCursor)), env });
  assert.equal((await secondPage.json()).reviews.length, 1);

  const photoId = saved.photos[0].split('/').pop();
  const image = await getPhoto({ params: { id: photoId }, env });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal((await image.arrayBuffer()).byteLength, 9);
  assert.equal((await getPhoto({ params: { id: 'not-a-uuid' }, env })).status, 404);
  sqlite.close();
});
