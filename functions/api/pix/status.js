import {
  checkoutIsConfigured, errorResponse, pixouRequest, readSmallJson,
  requireSameOrigin, responseJson,
} from '../../_lib/pix.js';
import { saveVerifiedStatus, tokenMatches } from '../../_lib/orders.js';

export async function onRequestPost({ request, env }) {
  if (!checkoutIsConfigured(env)) return responseJson({ error: 'Checkout is unavailable.' }, 503);
  try {
    requireSameOrigin(request);
    const { orderId, accessToken } = await readSmallJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(orderId ?? '')) {
      return responseJson({ error: 'Order not found.' }, 404);
    }
    const order = await env.TORQUEBOX_DB.prepare(`SELECT id, status, access_token_hash,
      pixou_tx_id, brl_total_cents FROM torque_orders WHERE id = ?`).bind(orderId).first();
    if (!order || !await tokenMatches(accessToken, order.access_token_hash)) {
      return responseJson({ error: 'Order not found.' }, 404);
    }

    let status = order.status;
    if (status === 'pending' && order.pixou_tx_id) {
      try {
        const data = await pixouRequest(env, `/transaction?id=${encodeURIComponent(order.pixou_tx_id)}`);
        status = await saveVerifiedStatus(env.TORQUEBOX_DB, order, data);
      } catch (error) {
        console.error(JSON.stringify({ action: 'pix_status_refresh_failed', orderId, message: String(error) }));
        // A transient provider outage must never be interpreted as a completed payment.
      }
    }
    return responseJson({ orderId, status });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
