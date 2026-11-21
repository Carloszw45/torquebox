// US prices are authoritative on the server. Browser totals are display-only.
export const USD_BUNDLES = Object.freeze({
  '1_bottle': { name: 'QIFOR Wind Shield Pro — 1 bottle (120 mL)', unitAmount: 1995, bottles: 1 },
  '2_bottles': { name: 'QIFOR Wind Shield Pro — 2 bottles', unitAmount: 2995, bottles: 2 },
  '3_bottles': { name: 'QIFOR Wind Shield Pro — 3 bottles', unitAmount: 3895, bottles: 3 },
});

export function priceUsdCart(cart) {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) throw new Error('Invalid cart.');
  const entries = Object.entries(cart);
  if (!entries.length || entries.length > 3) throw new Error('Select a product to continue.');

  let kits = 0;
  let subtotal = 0;
  let includesFreeShippingPack = false;
  const items = entries.map(([id, quantity]) => {
    const bundle = USD_BUNDLES[id];
    if (!bundle || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error('Invalid product quantity.');
    }
    kits += quantity;
    subtotal += bundle.unitAmount * quantity;
    if (bundle.bottles > 1) includesFreeShippingPack = true;
    return { id, name: bundle.name, quantity, unitAmount: bundle.unitAmount };
  });
  if (kits > 20) throw new Error('Maximum of 20 kits per order.');
  const shipping = includesFreeShippingPack || subtotal > 4000 ? 0 : 499;
  return { items, subtotal, shipping, total: subtotal + shipping };
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Live payments require explicit opt-in and may run only on the production domain.
// A Preview deployment cannot charge real cards, even if given live credentials by mistake.
export function configuredStripeMode(env, request) {
  if (!request) return null;
  const url = new URL(request.url);
  const isStoreDomain = ['torque-box.com', 'www.torque-box.com'].includes(url.hostname);
  if (url.protocol !== 'https:') return null;
  const mode = env?.STRIPE_MODE === 'live' ? 'live'
    : (!env?.STRIPE_MODE || env.STRIPE_MODE === 'test') ? 'test' : null;
  if (!mode || (mode === 'live' && !isStoreDomain) || (mode === 'test' && isStoreDomain)) return null;
  if (typeof env?.STRIPE_SECRET_KEY !== 'string'
    || typeof env?.STRIPE_PUBLISHABLE_KEY !== 'string') return null;
  // Checkout Sessions: Write on a restricted key limits server API permissions.
  const secretPrefixes = [`sk_${mode}_`, `rk_${mode}_`];
  if (!secretPrefixes.some((prefix) => env.STRIPE_SECRET_KEY.startsWith(prefix))
    || !env.STRIPE_PUBLISHABLE_KEY.startsWith(`pk_${mode}_`)
    || /\s/.test(env.STRIPE_SECRET_KEY)
    || /\s/.test(env.STRIPE_PUBLISHABLE_KEY)
    || !env.TORQUEBOX_DB) return null;
  return mode;
}

export function sameOrigin(request) {
  const actualOrigin = new URL(request.url).origin;
  if (!actualOrigin.startsWith('https://') || request.headers.get('origin') !== actualOrigin) {
    throw new Error('Invalid request origin.');
  }
  return actualOrigin;
}

export async function readCartRequest(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('Expected JSON request.');
  }
  if (Number(request.headers.get('content-length') || 0) > 10_000) {
    throw new Error('Request is too large.');
  }
  const body = await request.text();
  if (body.length > 10_000) throw new Error('Request is too large.');
  return JSON.parse(body);
}

export async function stripeApi(env, path, options = {}) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: options.body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(options.body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
    },
    body: options.body,
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const diagnostic = {
      status: response.status,
      type: String(result.error?.type || 'unknown').slice(0, 80),
      code: String(result.error?.code || '').slice(0, 80),
      param: String(result.error?.param || '').slice(0, 120),
    };
    console.error(JSON.stringify({ action: 'stripe_api_error', ...diagnostic }));
    const error = new Error('Stripe API request failed.');
    error.stripeDiagnostic = diagnostic;
    throw error;
  }
  return result;
}

// Stripe signs the timestamp and the *unmodified* UTF-8 webhook body.
export async function verifyStripeSignature(body, header, secret, nowSeconds = Date.now() / 1000) {
  if (typeof header !== 'string' || !secret?.startsWith('whsec_')) return false;
  const fields = header.split(',').map((entry) => entry.trim().split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value || ''))
    .map(([, value]) => value.toLowerCase());
  if (!/^\d{10,}$/.test(timestamp || '') || !signatures.length
    || Math.abs(nowSeconds - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode(`${timestamp}.${body}`)));
  return signatures.some((hex) => {
    const expected = Uint8Array.from(hex.match(/.{2}/g), (h) => parseInt(h, 16));
    let mismatch = 0;
    for (let i = 0; i < digest.length; i++) mismatch |= digest[i] ^ expected[i];
    return mismatch === 0;
  });
}

export async function updateVerifiedSession(db, session, state, mode) {
  if (!['test', 'live'].includes(mode)
    || !new RegExp(`^cs_${mode}_[A-Za-z0-9_]+$`).test(session?.id || '')
    || session.livemode !== (mode === 'live') || session.currency !== 'usd'
    || !Number.isSafeInteger(session.amount_total) || !session.metadata?.order_id) return false;
  const row = await db.prepare(`SELECT id, usd_total_cents, status FROM stripe_orders
    WHERE id = ? AND stripe_session_id = ?`).bind(session.metadata.order_id, session.id).first();
  if (!row || row.usd_total_cents !== session.amount_total) return false;

  const now = new Date().toISOString();
  if (state === 'paid' && session.payment_status === 'paid') {
    await db.prepare(`UPDATE stripe_orders SET status = 'paid', paid_at = COALESCE(paid_at, ?),
      customer_email = COALESCE(customer_email, ?), shipping_details_json = COALESCE(shipping_details_json, ?),
      updated_at = ? WHERE id = ?`).bind(now, session.customer_details?.email || null,
      session.shipping_details ? JSON.stringify(session.shipping_details) : null, now, row.id).run();
  } else if (state === 'failed') {
    await db.prepare(`UPDATE stripe_orders SET status = 'failed', updated_at = ?
      WHERE id = ? AND status != 'paid'`).bind(now, row.id).run();
  }
  return true;
}
