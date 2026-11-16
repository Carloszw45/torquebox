import {
  checkoutIsConfigured, errorResponse, priceCart,
  readSmallJson, requireSameOrigin, responseJson,
} from '../../_lib/pix.js';

export async function onRequestPost({ request, env }) {
  if (!checkoutIsConfigured(env)) {
    return responseJson({ error: 'O pagamento Pix está sendo configurado.' }, 503);
  }
  try {
    requireSameOrigin(request);
    const { cart } = await readSmallJson(request);
    const order = priceCart(cart);
    const totalBrlCents = order.totalBrlCents;
    if (totalBrlCents < 600 || totalBrlCents > 300_000) {
      return responseJson({ error: 'O valor excede os limites da operadora de pagamentos.' }, 400);
    }
    return responseJson({
      subtotalBrlCents: order.subtotalBrlCents,
      shippingBrlCents: order.shippingBrlCents,
      totalBrlCents,
      currency: 'BRL',
      note: 'O valor do Pix é cobrado em reais conforme o total do pedido.',
    });
  } catch (error) {
    console.error(JSON.stringify({ action: 'pix_quote_failed', message: String(error) }));
    return errorResponse(error, 400);
  }
}
