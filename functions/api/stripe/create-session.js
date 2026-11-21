import {
  configuredStripeMode, json, priceUsdCart, readCartRequest, sameOrigin, stripeApi,
} from '../../_lib/stripe.js';

export async function onRequestPost({ request, env }) {
  const mode = configuredStripeMode(env, request);
  if (!mode) return json({ error: 'Checkout is not configured.' }, 503);
  let orderId;
  let stage = 'validate_cart';
  try {
    const origin = sameOrigin(request);
    const input = await readCartRequest(request);
    const cart = priceUsdCart(input.cart);
    orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    stage = 'insert_order';
    await env.TORQUEBOX_DB.prepare(`INSERT INTO stripe_orders
      (id, status, items_json, usd_subtotal_cents, usd_shipping_cents,
       usd_total_cents, created_at, updated_at)
      VALUES (?, 'creating', ?, ?, ?, ?, ?, ?)`).bind(
      orderId, JSON.stringify(cart.items), cart.subtotal, cart.shipping, cart.total, now, now,
    ).run();

    const params = new URLSearchParams({
      mode: 'payment',
      ui_mode: 'embedded',
      locale: 'en',
      customer_creation: 'always',
      'shipping_address_collection[allowed_countries][0]': 'US',
      'metadata[order_id]': orderId,
      'payment_intent_data[metadata][order_id]': orderId,
      return_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      redirect_on_completion: 'always',
    });
    cart.items.forEach((item, i) => {
      params.set(`line_items[${i}][price_data][currency]`, 'usd');
      params.set(`line_items[${i}][price_data][unit_amount]`, String(item.unitAmount));
      params.set(`line_items[${i}][price_data][product_data][name]`, item.name);
      params.set(`line_items[${i}][quantity]`, String(item.quantity));
    });
    params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(cart.shipping));
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
    params.set('shipping_options[0][shipping_rate_data][display_name]',
      cart.shipping ? 'US shipping (10–15 business days)' : 'Free US shipping (10–15 business days)');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '10');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
    params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '15');

    stage = 'create_stripe_session';
    const session = await stripeApi(env, 'checkout/sessions', {
      body: params.toString(), idempotencyKey: `torquebox-${orderId}`,
    });
    stage = 'validate_stripe_session';
    if (!new RegExp(`^cs_${mode}_[A-Za-z0-9_]+$`).test(session.id || '')
      || !session.client_secret || session.currency !== 'usd'
      || session.livemode !== (mode === 'live')) {
      throw new Error('Stripe returned an invalid checkout session.');
    }
    stage = 'save_stripe_session';
    await env.TORQUEBOX_DB.prepare(`UPDATE stripe_orders SET status = 'pending',
      stripe_session_id = ?, updated_at = ? WHERE id = ?`).bind(
      session.id, new Date().toISOString(), orderId,
    ).run();
    return json({ clientSecret: session.client_secret, orderId, totalUsdCents: cart.total }, 201);
  } catch (error) {
    console.error(JSON.stringify({ action: 'stripe_session_failed', orderId, message: String(error) }));
    if (orderId) {
      try {
        await env.TORQUEBOX_DB.prepare(`UPDATE stripe_orders SET status = 'error', updated_at = ?
          WHERE id = ? AND status = 'creating'`).bind(new Date().toISOString(), orderId).run();
      } catch { /* A failed database is already logged above. */ }
    }
    const inputError = error instanceof SyntaxError
      || /^(Invalid|Select|Maximum|Expected|Request is too large)/.test(error.message);
    // Only test previews expose a safe failure stage; live errors remain generic.
    const stripeDetail = error?.stripeDiagnostic;
    const stripeClass = stripeDetail
      ? ` / Stripe ${stripeDetail.status} ${stripeDetail.code || stripeDetail.type}${stripeDetail.param ? ` (${stripeDetail.param})` : ''}`
      : '';
    const publicMessage = inputError ? 'Please check your cart and try again.'
      : 'Checkout is unavailable. Please try again later.';
    return json({ error: mode === 'test'
      ? `${publicMessage} [Test diagnostic: ${stage}${stripeClass}]` : publicMessage },
      inputError ? 400 : 503);
  }
}
