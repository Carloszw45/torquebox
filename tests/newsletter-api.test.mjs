import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost, onRequestGet } from '../functions/api/newsletter.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  return {
    sqlite,
    prepare(sql) {
      return {
        run: async () => sqlite.prepare(sql).run(),
        bind: (...args) => ({ run: async () => sqlite.prepare(sql).run(...args) }),
      };
    },
  };
}

function request(data, origin = 'https://torque-box.com') {
  return new Request('https://torque-box.com/api/newsletter', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  });
}

test('saves an opted-in address in real SQLite and treats duplicates consistently', async () => {
  const db = database();
  for (const email of ['  Test@Example.com ', 'test@example.com']) {
    const response = await onRequestPost({ request: request({ email, consent: true, website: '' }), env: { TORQUEBOX_DB: db } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
  }
  const row = db.sqlite.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.equal(row.email, 'test@example.com');
  assert.equal(row.consent_version, '2026-11-24');
  assert.equal(row.source, 'storefront');
  assert.ok(Number.isFinite(Date.parse(row.created_at)));
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM newsletter_subscribers').get().n, 1);
  db.sqlite.close();
});

test('invalid addresses and missing consent never create a subscriber table', async () => {
  const db = database();
  for (const data of [{ email: 'wrong', consent: true }, { email: 'test@example.com', consent: false }, { email: '<x>@example.com', consent: true }]) {
    const response = await onRequestPost({ request: request(data), env: { TORQUEBOX_DB: db } });
    assert.equal(response.status, 400);
  }
  assert.equal(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'newsletter_subscribers'").get(), undefined);
  db.sqlite.close();
});

test('rejects cross-origin requests, malformed JSON and oversized bodies', async () => {
  const valid = { email: 'test@example.com', consent: true };
  assert.equal((await onRequestPost({ request: request(valid, 'https://other.example'), env: {} })).status, 403);
  assert.equal((await onRequestPost({ request: request('{'), env: {} })).status, 400);
  assert.equal((await onRequestPost({ request: request('x'.repeat(5000)), env: {} })).status, 413);
});

test('does not claim a subscription was saved when storage is unavailable', async () => {
  const response = await onRequestPost({ request: request({ email: 'test@example.com', consent: true }), env: {} });
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error);
});

test('honeypot submissions do not write data; GET does not expose subscribers', async () => {
  const db = database();
  const response = await onRequestPost({ request: request({ email: 'bot@example.com', consent: true, website: 'spam' }), env: { TORQUEBOX_DB: db } });
  assert.equal(response.status, 200);
  assert.equal(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'newsletter_subscribers'").get(), undefined);
  assert.equal(onRequestGet().status, 405);
  db.sqlite.close();
});
