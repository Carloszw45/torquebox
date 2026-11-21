import { configuredForTests, json, stripeApi, updateVerifiedSession } from '../../_lib/stripe.js';

export async function onRequestGet({ request, env }) {
  if (!configuredForTests(env)) return json({ error: 'Test checkout is not configured.' }, 503);
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!/^cs_test_[A-Za-z0-9_]{10,200}$/.test(sessionId || '')) return json({ error: 'Invalid session.' }, 400);

  try {
    const order = await env.TORQUEBOX_DB.prepare(`SELECT status FROM stripe_orders
      WHERE stripe_session_id = ?`).bind(sessionId).first();
    if (!order) return json({ error: 'Order not found.' }, 404);
    if (order.status === 'paid') return json({ status: 'paid' });
    // Webhooks are authoritative for fulfillment; this authenticated provider check handles delayed webhooks.
    const session = await stripeApi(env, `checkout/sessions/${encodeURIComponent(sessionId)}`);
    const matched = await updateVerifiedSession(env.TORQUEBOX_DB, session,
      session.payment_status === 'paid' && session.livemode === false ? 'paid' : 'pending');
    if (!matched) return json({ error: 'Payment verification failed.' }, 502);
    return json({ status: session.payment_status === 'paid' ? 'paid' : 'pending' });
  } catch (error) {
    console.error(JSON.stringify({ action: 'stripe_status_failed', message: String(error) }));
    return json({ error: 'Could not check payment status.' }, 503);
  }
}
