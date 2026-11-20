import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../assets/torquebox.js', import.meta.url), 'utf8');

test('storefront offers restore the established USD prices and contain no BRL labels', () => {
  assert.match(html, /lang="en-US"/);
  const offers = [...html.matchAll(/data-bottles="(\d)"[^>]+data-price="([\d.]+)"/g)]
    .map(([, bottles, price]) => [Number(bottles), Number(price)]);
  assert.deepEqual(offers, [[1, 19.95], [2, 29.95], [3, 38.95]]);
  assert.match(html, /Total \(USD\)/);
  assert.doesNotMatch(html + script, /R\$|\bBRL\b|pt-BR/);
});

test('USD storefront cannot initiate the legacy BRL payment flow', () => {
  assert.match(html, /id="checkout-button"[^>]+disabled/);
  assert.doesNotMatch(html, /id="pix-modal"|open-pix-checkout|pix-customer-form/);
  assert.doesNotMatch(script, /\/api\/pix\/|pixApi|pix-generate/);
  assert.match(script, /currency: 'USD'/);
});
