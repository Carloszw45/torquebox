# QIFOR offer update — 2026-11-24

- One product sales page. No catalogue routes were reintroduced.
- Existing QIFOR bottle photograph is used as the first carousel image and repeated 1, 2 or 3 times in the corresponding pack option. Product illustrations and comparisons remain identified as illustrative.
- Pack choices sit beside the first carousel at desktop and mobile widths of 360px and above. Below 360px, the controls stack to keep them readable.
- Prices remain USD 19.95 / 29.95 / 38.95. Single-pack shipping is USD 4.99; free-shipping rules remain unchanged in the server allowlist.
- Bottle count, total concentrate volume, price per bottle, pack savings, and delivered price appear before adding to cart.
- Delivery remains an estimate of 10–15 business days. The existing issue-only refund policy remains in force.
- Unverified dilution quantities were removed. No prepared-fluid yield or new real-world performance claim was added. A verified demonstration video and manufacturer dilution instructions are still required before adding those claims.
- Checkout backend, payment currency, Stripe keys, webhook handling, and verified-review logic were preserved.
- First-party counter endpoint: POST /api/store-events. Allowlisted events: page_view, add_to_cart, begin_checkout, checkout_ready, checkout_error. Counts are grouped by UTC day, country and screen-size category in store_event_counts. No visitor ID, IP, email, order ID or payment details are stored by this counter. Counts are event totals, not unique visitors or deduplicated orders.
- The table is created automatically on first use using the existing TORQUEBOX_DB binding; the matching SQL migration is included. Counter failure is isolated from checkout.
- The client respects DNT and Global Privacy Control. The server also honors those request headers.
- Confirmed purchases must be read from verified stripe_orders records. Browser counter events must not be treated as confirmed orders.
- Useful query:
  SELECT day, country, device, event, event_count
  FROM store_event_counts ORDER BY day DESC, country, device, event;
