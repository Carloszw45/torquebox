// Customer reviews share the production D1 database already used by Stripe orders.
// Schema initialization is idempotent so an existing Pages deployment can enable
// reviews without changing its D1 binding or requiring a new storage service.
export async function ensureReviewsSchema(db) {
  const existing = await db.prepare(`SELECT COUNT(*) AS count FROM sqlite_master
    WHERE type = 'table' AND name IN ('product_reviews', 'product_review_images')`).first();
  if (existing?.count === 2) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS product_reviews (
    id TEXT PRIMARY KEY,
    stripe_order_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS product_review_images (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    image_bytes BLOB NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_product_reviews_visible
    ON product_reviews(is_visible, created_at DESC, id DESC)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_product_review_images_review
    ON product_review_images(review_id, position)`).run();
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function imageMime(bytes) {
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => bytes[index] === byte)) return 'image/png';
  return null;
}

// Enforce a real byte limit even when the sender omits Content-Length.
export async function boundedFormData(request, maxBytes = 800_000) {
  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) {
    throw new Error('Expected a multipart review form.');
  }
  if (Number(request.headers.get('content-length') || 0) > maxBytes) {
    throw new Error('Review upload is too large.');
  }
  if (!request.body) throw new Error('Missing review form.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Review upload is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) {
    body.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  const buffered = new Request(request.url, {
    method: 'POST', headers: { 'content-type': contentType }, body,
  });
  return buffered.formData();
}

export function presentReview(row) {
  return {
    id: row.id,
    name: row.name,
    rating: row.rating,
    body: row.body,
    category: row.category,
    createdAt: row.created_at,
    photos: row.photo_ids ? row.photo_ids.split(',').filter(Boolean)
      .map(id => `/api/reviews/image/${id}`) : [],
  };
}
