import { ensureReviewsSchema } from '../../../_lib/reviews.js';

export async function onRequestGet({ params, env }) {
  const id = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(id || '')) return new Response('Not found', { status: 404 });
  if (!env?.TORQUEBOX_DB) return new Response('Unavailable', { status: 503 });
  try {
    await ensureReviewsSchema(env.TORQUEBOX_DB);
    const row = await env.TORQUEBOX_DB.prepare(`SELECT i.mime_type, i.image_bytes FROM product_review_images i
      JOIN product_reviews r ON r.id = i.review_id WHERE i.id = ? AND r.is_visible = 1`).bind(id).first();
    if (!row) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(row.image_bytes || []);
    return new Response(bytes, { headers: {
      'content-type': row.mime_type,
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
      'content-disposition': 'inline',
    } });
  } catch (error) {
    console.error(JSON.stringify({ action: 'review_photo_failed', reason: String(error) }));
    return new Response('Image unavailable', { status: 503 });
  }
}
