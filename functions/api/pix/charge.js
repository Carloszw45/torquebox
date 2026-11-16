import {
  checkoutIsConfigured, errorResponse, getUsdBrlRate, pixouRequest,
  priceCart, readSmallJson, requireSameOrigin, responseJson, toBrlCents, validateCustomer,
} from '../../_lib/pix.js';
import { digestToken, makeOrderToken } from '../../_lib/orders.js';

const WEBHOOK_URL = 'https://torque-box.com/api/pix/webhook';

export async function onRequestPost({ request, env }) {
  if (!checkoutIsConfigured(env)) {
    return responseJson({ error: 'Pix checkout is being configured.' }, 503);
  }

  let orderId;
  try {
    requireSameOrigin(request);
    const input = await readSmallJson(request);
    const cart = priceCart(input.cart);
    const customer = validateCustomer(input.customer);
    const fx = await getUsdBrlRate();
    const brlCents = toBrlCents(cart.totalUsdCents, fx.rate);
    if (brlCents < 600 || brlCents > 300_000) {
      return responseJson({ error: 'Order exceeds the payment processor limits.' }, 400);
    }

    orderId = crypto.randomUUID();
    const accessToken = makeOrderToken();
    const tokenHash = await digestToken(accessToken);
    const now = new Date().toISOString();

    // Save delivery details before asking the processor to create a payable charge.
    await env.TORQUEBOX_DB.prepare(`INSERT INTO torque_orders
      (id, access_token_hash, status, items_json, customer_name, customer_email,
       customer_phone, shipping_address_json, usd_subtotal_cents, usd_shipping_cents,
       usd_total_cents, brl_total_cents, fx_rate, fx_date, created_at, updated_at)
      VALUES (?, ?, 'creating', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      orderId, tokenHash, JSON.stringify(cart.items), customer.name, customer.email,
      customer.phone, JSON.stringify(customer.address), cart.subtotalUsdCents,
      cart.shippingUsdCents, cart.totalUsdCents, brlCents, fx.rate, fx.date, now, now,
    ).run();

    const result = await pixouRequest(env, '/charge', {
      method: 'POST',
      body: JSON.stringify({
        external_id: orderId,
        payment_method: 'pix',
        amount: brlCents,
        buyer: { name: customer.name, email: customer.email },
        product: { name: 'TorqueBox QIFOR Wind Shield Pro' },
        offer: { name: 'TorqueBox windshield care', quantity: cart.bottleCount },
        postbackUrl: WEBHOOK_URL,
      }),
    });

    if (!result.id || result.payment_method !== 'pix' || result.status !== 'pending'
      || result.total_amount !== brlCents || !result.pix?.code || !result.pix?.qrcode_base64) {
      throw new Error('Payment provider returned an invalid charge.');
    }

    await env.TORQUEBOX_DB.prepare(`UPDATE torque_orders SET pixou_tx_id = ?,
      pix_code = ?, qr_base64 = ?, status = 'pending', updated_at = ? WHERE id = ?`).bind(
      result.id, result.pix.code, result.pix.qrcode_base64, new Date().toISOString(), orderId,
    ).run();

    return responseJson({
      orderId,
      accessToken,
      status: 'pending',
      currency: 'BRL',
      totalBrlCents: brlCents,
      totalUsdCents: cart.totalUsdCents,
      rate: fx.rate,
      rateDate: fx.date,
      pixCode: result.pix.code,
      qrCodeBase64: result.pix.qrcode_base64,
    }, 201);
  } catch (error) {
    console.error(JSON.stringify({ action: 'pix_charge_failed', orderId, message: String(error) }));
    if (orderId) {
      try {
        await env.TORQUEBOX_DB.prepare(`UPDATE torque_orders SET status = 'error',
          updated_at = ? WHERE id = ? AND status = 'creating'`).bind(new Date().toISOString(), orderId).run();
      } catch (dbError) {
        console.error(JSON.stringify({ action: 'pix_order_error_update_failed', orderId, message: String(dbError) }));
      }
    }
    if (error instanceof Error && /^Payment provider|^Exchange rate/.test(error.message)) {
      return responseJson({ error: 'Pix is temporarily unavailable. Please try again later.' }, 502);
    }
    return errorResponse(error, 400);
  }
}
