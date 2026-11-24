-- Aggregate storefront events only; confirmed orders remain in stripe_orders.
CREATE TABLE IF NOT EXISTS store_event_counts (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, country, device)
);
