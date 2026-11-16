export const catalog = Object.freeze({
  '1_bottle': { title: '1 Bottle (Trial Size - 120ml)', bottles: 1, price: 1995, shipping: 'paid' },
  '2_bottles': { title: '2 Bottles (Standard 2-Pack)', bottles: 2, price: 2995, shipping: 'standard' },
  '3_bottles': { title: '3 Bottles (Family & Fleet Pack)', bottles: 3, price: 3895, shipping: 'priority' },
});

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const formatPrice = (cents) => dollars.format(cents / 100);

export function shippingFor(subtotal, bundles) {
  if (subtotal === 0) return { cost: 0, label: '' };
  if (subtotal > 4000) return { cost: 0, label: 'Free 2-day priority US shipping' };
  if (bundles.some((bundle) => bundle.shipping === 'priority')) return { cost: 0, label: 'Free priority US shipping' };
  if (bundles.some((bundle) => bundle.shipping === 'standard')) return { cost: 0, label: 'Free standard US shipping' };
  return { cost: 499, label: formatPrice(499) };
}

export function quoteCart(items) {
  if (!items || typeof items !== 'object' || Array.isArray(items)) throw new TypeError('Invalid cart');
  for (const [id, quantity] of Object.entries(items)) {
    if (!Object.hasOwn(catalog, id) || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new TypeError('Invalid cart item');
    }
  }
  const lines = Object.entries(catalog).flatMap(([id, bundle]) => {
    if (!Object.hasOwn(items, id)) return [];
    const quantity = items[id];
    return [{ ...bundle, id, quantity, total: bundle.price * quantity }];
  });
  const subtotal = lines.reduce((amount, line) => amount + line.total, 0);
  if (!Number.isSafeInteger(subtotal)) throw new TypeError('Invalid cart total');
  const shipping = shippingFor(subtotal, lines);
  return { lines, subtotal, shipping, total: subtotal + shipping.cost };
}
