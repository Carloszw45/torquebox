import { configuredStripeMode, json, updateVerifiedSession, verifyStripeSignature } from '../../_lib/stripe.js';

export async function onRequestPost({ request, env }) {
  const mode = configuredStripeMode(env, request);
  if (!mode || !env?.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
    return json({ error: 'Webhook is not configured.' }, 503);
  }
  const body = await request.text();
  if (body.length > 1_000_000) return json({ error: 'Webhook too large.' }, 413);
  if (!await verifyStripeSignature(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: 'Invalid webhook signature.' }, 400);
  }
  let event;
  try { event = JSON.parse(body); } catch { return json({ error: 'Invalid webhook payload.' }, 400); }
  if (event.livemode !== (mode === 'live')) return json({ error: 'Incorrect payment mode.' }, 400);
  const status = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
    ? 'paid' : event.type === 'checkout.session.async_payment_failed' ? 'failed' : null;
  if (!status) return json({ received: true });
  try {
    const matched = await updateVerifiedSession(env.TORQUEBOX_DB, event.data?.object, status, mode);
    if (!matched) {
      console.error(JSON.stringify({ action: 'stripe_webhook_mismatched_session', eventId: event.id }));
      return json({ error: 'Unknown or mismatched session.' }, 400);
    }
    return json({ received: true });
  } catch (error) {
    console.error(JSON.stringify({ action: 'stripe_webhook_failed', eventId: event.id, message: String(error) }));
    return json({ error: 'Webhook handling failed.' }, 500);
  }
}
