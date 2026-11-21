-- Apply to the preview D1 database before testing Stripe Checkout.
-- Keep Pix orders in the existing torque_orders table; Stripe orders are separate.
CREATE TABLE IF NOT EXISTS stripe_orders (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'creating',
  items_json TEXT NOT NULL,
  usd_subtotal_cents INTEGER NOT NULL,
  usd_shipping_cents INTEGER NOT NULL,
  usd_total_cents INTEGER NOT NULL,
  customer_email TEXT,
  shipping_details_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_status ON stripe_orders(status, created_at);
