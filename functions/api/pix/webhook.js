import { checkoutIsConfigured, pixouRequest, readSmallJson, responseJson } from '../../_lib/pix.js';
import { saveVerifiedStatus } from '../../_lib/orders.js';

export async function onRequestPost({ request, env }) {
  if (!checkoutIsConfigured(env)) return responseJson({ error: 'Not configured.' }, 503);
  try {
    const payload = await readSmallJson(request);
    if (!['transaction.created', 'transaction.processed'].includes(payload?.event)
      || !/^[a-f0-9-]{36}$/i.test(payload?.data?.id ?? '')) {
      return responseJson({ received: true });
    }
    const order = await env.TORQUEBOX_DB.prepare(`SELECT id, pixou_tx_id, status,
      brl_total_cents FROM torque_orders WHERE pixou_tx_id = ?`).bind(payload.data.id).first();
    if (!order) {
      // The callback may race the response that saves the transaction ID; request a retry.
      return responseJson({ error: 'Order not ready.' }, 503);
    }
    // Pixou's documentation does not specify a webhook signature. Never trust
    // the callback body as proof of payment: verify with the authenticated API.
    const providerTransaction = await pixouRequest(env, `/transaction?id=${encodeURIComponent(order.pixou_tx_id)}`);
    await saveVerifiedStatus(env.TORQUEBOX_DB, order, providerTransaction);
    return responseJson({ received: true });
  } catch (error) {
    console.error(JSON.stringify({ action: 'pix_webhook_failed', message: String(error) }));
    return responseJson({ error: 'Temporary processing failure.' }, 503);
  }
}
