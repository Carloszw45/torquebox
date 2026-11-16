// Server-only checkout rules. Never trust product prices or totals from the browser.
const BUNDLES = Object.freeze({
  '1_bottle': { name: '1 frasco (120 mL)', bottles: 1, brlCents: 3990 },
  '2_bottles': { name: '2 frascos (240 mL)', bottles: 2, brlCents: 6990 },
  '3_bottles': { name: '3 frascos (360 mL)', bottles: 3, brlCents: 9490 },
});

const FX_URL = 'https://api.frankfurter.dev/v2/rate/usd/brl?providers=bcb';
export const PIXOU_URL = 'https://api.pixoupay.com';

export function responseJson(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function readSmallJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('Please send JSON.');
  }
  if (Number(request.headers.get('content-length') ?? 0) > 12_000) {
    throw new Error('Request is too large.');
  }
  const body = await request.text();
  if (body.length > 12_000) throw new Error('Request is too large.');
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid request data.');
  }
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new Error('Cross-origin checkout is not permitted.');
  }
}

export function priceCart(cart) {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
    throw new Error('Carrinho inválido.');
  }
  const entries = Object.entries(cart);
  if (!entries.length || entries.length > 3) throw new Error('Seu carrinho está vazio ou inválido.');

  let subtotalBrlCents = 0;
  let kitCount = 0;
  let bottleCount = 0;
  const items = entries.map(([id, quantity]) => {
    const bundle = BUNDLES[id];
    if (!bundle || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error('Produto ou quantidade inválidos.');
    }
    subtotalBrlCents += bundle.brlCents * quantity;
    kitCount += quantity;
    bottleCount += bundle.bottles * quantity;
    return { id, name: bundle.name, quantity, unitBrlCents: bundle.brlCents };
  });
  if (kitCount > 20) throw new Error('O limite é de 20 kits por pedido.');

  const freeShipping = subtotalBrlCents >= 7990 || entries.some(([id]) => id !== '1_bottle');
  const shippingBrlCents = freeShipping ? 0 : 990;
  return {
    items,
    kitCount,
    bottleCount,
    subtotalBrlCents,
    shippingBrlCents,
    totalBrlCents: subtotalBrlCents + shippingBrlCents,
  };
}

export async function getUsdBrlRate() {
  const response = await fetch(FX_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
    cf: { cacheEverything: true, cacheTtl: 900 },
  });
  if (!response.ok) throw new Error('Exchange rate is unavailable.');
  const data = await response.json();
  const rate = Number(data.rate);
  const date = String(data.date ?? '');
  const rateDay = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(rate) || rate < 1 || rate > 25 || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(rateDay) || Date.now() - rateDay > 8 * 86_400_000
    || rateDay > Date.now() + 86_400_000) {
    throw new Error('A valid, recent exchange rate was not available.');
  }
  return { rate, date, provider: 'BCB via Frankfurter' };
}

export function toBrlCents(usdCents, rate) {
  return Math.round(usdCents * rate);
}

export function validateCustomer(value) {
  if (!value || typeof value !== 'object') throw new Error('Enter your contact details.');
  const name = String(value.name ?? '').trim();
  const email = String(value.email ?? '').trim().toLowerCase();
  const phone = String(value.phone ?? '').trim();
  const address = value.address;
  if (name.length < 3 || name.length > 100) throw new Error('Informe seu nome completo.');
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (phone.length > 30) throw new Error('Número de telefone inválido.');
  if (!address || typeof address !== 'object') throw new Error('Informe o endereço de entrega.');

  const line1 = String(address.line1 ?? '').trim();
  const line2 = String(address.line2 ?? '').trim();
  const city = String(address.city ?? '').trim();
  const state = String(address.state ?? '').trim().toUpperCase();
  const postalCode = String(address.postalCode ?? '').trim();
  const country = String(address.country ?? '').trim().toUpperCase();

  if (!line1 || line1.length > 160 || line2.length > 160) throw new Error('Informe rua e número.');
  if (!city || city.length > 80 || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(state)) throw new Error('Informe sua cidade e a sigla do estado (UF).');
  if (!/^\d{5}-?\d{3}$/.test(postalCode) || country !== 'BR') {
    throw new Error('Informe um CEP válido do Brasil.');
  }
  return { name, email, phone, address: { line1, line2, city, state, postalCode, country } };
}

export async function pixouRequest(env, pathname, options = {}) {
  if (!env.PIXOU_SECRET_TOKEN) throw new Error('Payment processor not configured.');
  const response = await fetch(`${PIXOU_URL}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.PIXOU_SECRET_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data) {
    // Never echo raw payment-provider errors, tokens, or customer information to visitors.
    throw new Error(`Payment provider request failed (${response.status}).`);
  }
  return result.data;
}

export function checkoutIsConfigured(env) {
  return Boolean(env.TORQUEBOX_DB && env.PIXOU_SECRET_TOKEN);
}

export function errorResponse(error, status = 400) {
  const message = error instanceof Error ? error.message : 'Request failed.';
  return responseJson({ error: message }, status);
}
