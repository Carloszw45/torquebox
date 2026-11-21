import { boundedFormData, ensureReviewsSchema, imageMime, jsonResponse, presentReview } from '../_lib/reviews.js';
import { sameOrigin } from '../_lib/stripe.js';

const MAX_PHOTO_BYTES = 260_000;
const MAX_PHOTOS = 2;
const CATEGORIES = new Set(['general', 'night', 'oil', 'day', 'cold', 'bundle']);

export async function onRequestGet({ request, env }) {
  if (!env?.TORQUEBOX_DB) return jsonResponse({ error: 'Reviews are temporarily unavailable.' }, 503);
  try {
    await ensureReviewsSchema(env.TORQUEBOX_DB);
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit') || 30);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 30;
    const before = url.searchParams.get('before');
    let statement;
    if (before) {
      const separator = before.indexOf('|');
      const timestamp = before.slice(0, separator);
      const id = before.slice(separator + 1);
      if (separator < 1 || !/^\d{4}-\d\d-\d\dT/.test(timestamp)
        || !/^[a-f0-9-]{36}$/i.test(id)) return jsonResponse({ error: 'Invalid page cursor.' }, 400);
      statement = env.TORQUEBOX_DB.prepare(`SELECT r.id, r.name, r.rating, r.body, r.category, r.created_at,
        (SELECT GROUP_CONCAT(i.id, ',') FROM product_review_images i WHERE i.review_id = r.id ORDER BY i.position) AS photo_ids
        FROM product_reviews r WHERE r.is_visible = 1
        AND (r.created_at < ? OR (r.created_at = ? AND r.id < ?))
        ORDER BY r.created_at DESC, r.id DESC LIMIT ?`).bind(timestamp, timestamp, id, limit + 1);
    } else {
      statement = env.TORQUEBOX_DB.prepare(`SELECT r.id, r.name, r.rating, r.body, r.category, r.created_at,
        (SELECT GROUP_CONCAT(i.id, ',') FROM product_review_images i WHERE i.review_id = r.id ORDER BY i.position) AS photo_ids
        FROM product_reviews r WHERE r.is_visible = 1
        ORDER BY r.created_at DESC, r.id DESC LIMIT ?`).bind(limit + 1);
    }
    const [rows, total] = await Promise.all([
      statement.all(),
      env.TORQUEBOX_DB.prepare('SELECT COUNT(*) AS total FROM product_reviews WHERE is_visible = 1').first(),
    ]);
    const page = (rows.results || []).slice(0, limit);
    const last = page[page.length - 1];
    return jsonResponse({
      reviews: page.map(presentReview), total: total?.total || 0,
      nextCursor: (rows.results || []).length > limit && last ? `${last.created_at}|${last.id}` : null,
    });
  } catch (error) {
    console.error(JSON.stringify({ action: 'reviews_list_failed', reason: String(error) }));
    return jsonResponse({ error: 'Could not load customer reviews.' }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env?.TORQUEBOX_DB) return jsonResponse({ error: 'Reviews are temporarily unavailable.' }, 503);
  try {
    sameOrigin(request);
  } catch {
    return jsonResponse({ error: 'Invalid review request origin.' }, 403);
  }
  let form;
  try {
    form = await boundedFormData(request);
  } catch (error) {
    return jsonResponse({ error: error.message }, 413);
  }
  const sessionId = String(form.get('sessionId') || '').trim();
  const name = String(form.get('name') || '').trim().replace(/\s+/g, ' ');
  const body = String(form.get('body') || '').trim();
  const rating = Number(form.get('rating'));
  const category = String(form.get('category') || 'general');
  const consent = form.get('publishConsent') === 'yes';
  if (!/^cs_live_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    return jsonResponse({ error: 'A verified TorqueBox purchase is required to post a review.' }, 403);
  }
  if (!consent || name.length < 2 || name.length > 50 || /[<>\x00-\x1F]/.test(name)
    || body.length < 20 || body.length > 1200 || /\x00/.test(body)
    || !Number.isInteger(rating) || rating < 1 || rating > 5 || !CATEGORIES.has(category)) {
    return jsonResponse({ error: 'Please complete the review, rating and publication consent.' }, 400);
  }
  const uploaded = form.getAll('photos').filter(file => file && typeof file.size === 'number' && file.size > 0);
  if (uploaded.length > MAX_PHOTOS) return jsonResponse({ error: 'Attach no more than two photos.' }, 400);
  const photos = [];
  for (const file of uploaded) {
    if (file.size > MAX_PHOTO_BYTES) return jsonResponse({ error: 'Each photo must be 260 KB or smaller.' }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = imageMime(bytes);
    if (!mime || mime !== file.type) return jsonResponse({ error: 'Only safe WebP, JPEG or PNG photos are supported.' }, 400);
    photos.push({ mime, bytes });
  }

  try {
    await ensureReviewsSchema(env.TORQUEBOX_DB);
    // The browser-supplied session ID is an unguessable lookup token, never proof by itself.
    // Stripe's verified webhook/status handler must have already marked this order paid in D1.
    const order = await env.TORQUEBOX_DB.prepare(`SELECT id FROM stripe_orders
      WHERE stripe_session_id = ? AND status = 'paid'`).bind(sessionId).first();
    if (!order) return jsonResponse({ error: 'Purchase not verified. Submit after your payment is confirmed.' }, 403);
    const alreadyReviewed = await env.TORQUEBOX_DB.prepare(`SELECT id FROM product_reviews
      WHERE stripe_order_id = ?`).bind(order.id).first();
    if (alreadyReviewed) return jsonResponse({ error: 'This order already has a review. Thank you!' }, 409);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const imageIds = photos.map(() => crypto.randomUUID());
    const operations = [env.TORQUEBOX_DB.prepare(`INSERT INTO product_reviews
      (id, stripe_order_id, name, rating, body, category, is_visible, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)`).bind(id, order.id, name, rating, body, category, now)];
    for (let i = 0; i < photos.length; i++) {
      operations.push(env.TORQUEBOX_DB.prepare(`INSERT INTO product_review_images
        (id, review_id, position, mime_type, image_bytes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(imageIds[i], id, i, photos[i].mime, photos[i].bytes, now));
    }
    await env.TORQUEBOX_DB.batch(operations);
    return jsonResponse({ review: presentReview({ id, name, rating, body, category, created_at: now,
      photo_ids: imageIds.join(',') }) }, 201);
  } catch (error) {
    const message = String(error);
    if (/UNIQUE constraint failed|constraint failed/i.test(message)) {
      return jsonResponse({ error: 'This order already has a review. Thank you!' }, 409);
    }
    console.error(JSON.stringify({ action: 'review_submit_failed', reason: message.slice(0, 200) }));
    return jsonResponse({ error: 'Your review could not be saved. Please try again.' }, 503);
  }
}
