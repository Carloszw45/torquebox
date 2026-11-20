import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHECKOUT_OFFERS, getCheckoutOffer } from '../assets/checkout-offers.js';

test('each pack selects its verified USD checkout and complete order total', () => {
  const expected = [
    ['1_bottle', 1, 1995, 499, 2494, 'torquebox-1-bottle-usd'],
    ['2_bottles', 2, 2995, 0, 2995, 'torquebox-2-bottles-usd'],
    ['3_bottles', 3, 3895, 0, 3895, 'torquebox-3-bottles-usd'],
  ];
  for (const [id, bottles, subtotal, shipping, total, slug] of expected) {
    const offer = getCheckoutOffer({ [id]: 1 });
    assert.equal(offer.currency, 'USD');
    assert.equal(offer.bottles, bottles);
    assert.equal(offer.subtotalCents, subtotal);
    assert.equal(offer.shippingCents, shipping);
    assert.equal(offer.totalCents, total);
    assert.equal(offer.subtotalCents + offer.shippingCents, total);
    assert.equal(offer.url, `https://pagseguropix.org/c/${slug}`);
  }
});

test('empty carts, extra packs, unknown products and invalid quantities cannot select a checkout', () => {
  for (const cart of [null, undefined, [], '1_bottle', {}, { '1_bottle': 2 },
    { '2_bottles': 0 }, { '3_bottles': -1 }, { '2_bottles': '1' },
    { '1_bottle': 1, '2_bottles': 1 }, { forged: 1 }, { constructor: 1 }]) {
    assert.equal(getCheckoutOffer(cart), null);
  }
});

test('displayed pack prices agree with the checkout subtotals', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const cards = [...html.matchAll(/data-bottles="(\d)"[^>]*data-price="([\d.]+)"[^>]*>[\s\S]*?<input[^>]*value="([^"]+)"/g)];
  assert.equal(cards.length, 3);
  for (const [, bottles, price, id] of cards) {
    assert.equal(Number(bottles), CHECKOUT_OFFERS[id].bottles);
    assert.equal(Math.round(Number(price) * 100), CHECKOUT_OFFERS[id].subtotalCents);
  }
});
