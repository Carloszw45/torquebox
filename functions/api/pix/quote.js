import {
  checkoutIsConfigured, errorResponse, getUsdBrlRate, priceCart,
  readSmallJson, requireSameOrigin, responseJson, toBrlCents,
} from '../../_lib/pix.js';

export async function onRequestPost({ request, env }) {
  if (!checkoutIsConfigured(env)) {
    return responseJson({ error: 'Pix checkout is being configured.' }, 503);
  }
  try {
    requireSameOrigin(request);
    const { cart } = await readSmallJson(request);
    const order = priceCart(cart);
    const fx = await getUsdBrlRate();
    const totalBrlCents = toBrlCents(order.totalUsdCents, fx.rate);
    if (totalBrlCents < 600 || totalBrlCents > 300_000) {
      return responseJson({ error: 'Order exceeds the payment processor limits.' }, 400);
    }
    return responseJson({
      subtotalUsdCents: order.subtotalUsdCents,
      shippingUsdCents: order.shippingUsdCents,
      totalUsdCents: order.totalUsdCents,
      totalBrlCents,
      currency: 'BRL',
      rate: fx.rate,
      rateDate: fx.date,
      rateSource: fx.provider,
      note: 'The final BRL amount is fixed when the Pix QR Code is generated.',
    });
  } catch (error) {
    console.error(JSON.stringify({ action: 'pix_quote_failed', message: String(error) }));
    return errorResponse(error, 400);
  }
}
