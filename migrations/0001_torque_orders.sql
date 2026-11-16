-- Execute once in Cloudflare D1 before enabling checkout.
CREATE TABLE IF NOT EXISTS torque_orders (
  id TEXT PRIMARY KEY,
  access_token_hash TEXT NOT NULL,
  pixou_tx_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'creating',
  items_json TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  shipping_address_json TEXT NOT NULL,
  usd_subtotal_cents INTEGER NOT NULL,
  usd_shipping_cents INTEGER NOT NULL,
  usd_total_cents INTEGER NOT NULL,
  brl_total_cents INTEGER NOT NULL,
  fx_rate REAL NOT NULL,
  fx_date TEXT NOT NULL,
  pix_code TEXT,
  qr_base64 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_torque_orders_status ON torque_orders(status, created_at);
