// Public, merchant-configured offers. Card details are collected by BravoPay.
export const CHECKOUT_OFFERS = Object.freeze({
  '1_bottle': Object.freeze({
    bottles: 1, currency: 'USD', subtotalCents: 1995, shippingCents: 499, totalCents: 2494,
    url: 'https://pagseguropix.org/c/torquebox-1-bottle-usd',
  }),
  '2_bottles': Object.freeze({
    bottles: 2, currency: 'USD', subtotalCents: 2995, shippingCents: 0, totalCents: 2995,
    url: 'https://pagseguropix.org/c/torquebox-2-bottles-usd',
  }),
  '3_bottles': Object.freeze({
    bottles: 3, currency: 'USD', subtotalCents: 3895, shippingCents: 0, totalCents: 3895,
    url: 'https://pagseguropix.org/c/torquebox-3-bottles-usd',
  }),
});

export function getCheckoutOffer(cart) {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return null;
  const entries = Object.entries(cart);
  if (entries.length !== 1) return null;
  const [[id, quantity]] = entries;
  return quantity === 1 && Object.hasOwn(CHECKOUT_OFFERS, id) ? CHECKOUT_OFFERS[id] : null;
}
