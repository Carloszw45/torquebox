# TorqueBox — verified customer reviews

The product page now includes a review form, optional photos, live updates, a
"verified buyer" marker, and automatic placement in both the checkout review
carousel and the full Reviews section. The six existing reviews stay unchanged.

## How purchase verification works

1. A customer completes a **live Stripe Checkout** order.
2. Stripe's signed webhook (or the existing status endpoint) records the order
   as `paid` in `stripe_orders` in the existing `TORQUEBOX_DB` D1 database.
3. When the browser returns from Stripe, `assets/torquebox.js` saves the opaque
   Checkout Session ID in local storage for that browser (no card details).
4. After clicking **Write a Review**, the server accepts the review only if
   that session maps to a paid Stripe order. The database allows one review per
   order and never exposes the order or customer email in public API responses.

Existing orders made on another device or before this feature went live cannot
currently be matched automatically. Those customers should contact support.
Never attempt to verify a buyer using only a name or email address.

## Cloudflare deployment

No new secret, R2 bucket, database, or account integration is required. The
existing `TORQUEBOX_DB` D1 binding for Stripe is reused. The Pages Functions
initialize their two review tables and indexes if they do not exist. The same
schema is recorded in `migrations/0003_product_reviews.sql` for reproducibility.

Review images are optimized in the browser to at most 260 KB, then stored in
separate D1 BLOB rows (maximum two photos per review). Images are retrieved
through same-origin URLs `/api/reviews/image/:id`. In the future, if photo
traffic grows significantly, move image bytes into an R2 bucket while keeping
review metadata in D1.

To verify deployment without publishing an artificial customer review:

```text
GET https://torque-box.com/api/reviews
```

Expected: HTTP 200 JSON with `reviews`, `total`, and `nextCursor`.
An unauthenticated POST must fail; real posting is tied to a paid order.

## Safety and moderation

- New customer feedback is **published immediately** after paid-order
  verification, as requested. It does not enter an approval queue.
- Review text is rendered as plain text, not HTML; images must pass a strict
  byte-size, MIME, and magic-signature check. A review can contain two photos.
- The photo conversion strips original image metadata in the browser.
- The owner should monitor uploads and respond promptly to reports. To hide
  problematic content, set `is_visible = 0` on that row in Cloudflare D1:

  ```sql
  UPDATE product_reviews SET is_visible = 0 WHERE id = '<review-uuid>';
  ```

  Hidden reviews and their photos stop appearing through the public APIs.
- Customer consent is collected before publishing. Visitors can request
  removal via `suporte@torque-box.com`.

## Maintenance

- New reviews load on page opening and every 60 seconds while visible.
- The first 40 new reviews load immediately; **Load More Customer Reviews**
  retrieves older reviews in pages. Existing static reviews are preserved.
- Node tests: `node --test tests/reviews-api.test.mjs`.
