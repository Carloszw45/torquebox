-- Product reviews are linked to paid Stripe orders: one published review per order.
-- Photos are small, metadata-stripped browser-resized images stored in separate
-- D1 BLOB rows. Pages Functions also initialize this schema idempotently.
CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  stripe_order_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS product_review_images (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  image_bytes BLOB NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_visible
  ON product_reviews(is_visible, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_product_review_images_review
  ON product_review_images(review_id, position);
