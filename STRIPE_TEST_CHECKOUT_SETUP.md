# TorqueBox — Stripe embedded checkout TEST preview

This code lives on the `integracao/stripe-usd-teste` branch. **Do not merge it into `main` or send real money before completing every test.** The live website on `main` keeps its current checkout.

## USD prices (server authoritative)

- 1 × 120 mL bottle: **$19.95** + **$4.99** US shipping = **$24.94**.
- 2-bottle bundle: **$29.95** with free US shipping.
- 3-bottle bundle: **$38.95** with free US shipping.
- A cart containing a 2- or 3-bottle bundle ships free. Other carts with product subtotals **over $40** ship free.
- Shipping estimates: **10–15 business days** in the United States. Only US shipping addresses are allowed.

## Preview Cloudflare Pages configuration

1. Check the Pages project connected to `Carloszw45/torquebox`. Find the **preview deployment** of this branch and its actual URL. Do **not** select production.
2. In **Settings → Bindings**, bind a **preview-only D1 database** as `TORQUEBOX_DB`. Do not run tests against production order data. Apply `migrations/0002_stripe_orders.sql` to that database. `0001_torque_orders.sql` is still used by the legacy Pix checkout only.
3. In **Settings → Variables and Secrets**, set these in **Preview**, not Production:
   - `STRIPE_SECRET_KEY` — Stripe **test secret** (`sk_test_...`), mark as **secret**.
   - `STRIPE_PUBLISHABLE_KEY` — Stripe test publishable (`pk_test_...`), safe to expose in the browser.
   - `STRIPE_WEBHOOK_SECRET` — signing secret (`whsec_...`) from the Stripe **test-mode** webhook endpoint, mark as **secret**.
4. Create a Stripe **test-mode webhook endpoint** with the precise preview URL `/api/stripe/webhook`. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Redeploy the **preview branch** after setting secrets/bindings. Check `GET /api/stripe/config` on the preview: it should show `mode: test` and a `pk_test_` publishable key, never a secret key.

**Never paste `sk_test`, `sk_live`, or `whsec` values into GitHub, source code, screenshots, or chat.** Stripe's webhook signing secret is different from the API secret key.

## Test checklist

1. Select each bundle and verify USD price, shipping, cart quantities, and English copy.
2. Select **Secure Checkout**: an embedded Stripe form should open **inside the TorqueBox preview** and collect name, email, and an **American shipping address**. Payment methods depend on customer device and Stripe eligibility.
3. Use [Stripe's official test cards](https://docs.stripe.com/testing) only (no real card or live payment). Test success, declined payment, and revisiting after cancellation.
4. Confirm the test charge appears under **Stripe test payments**, and the corresponding `stripe_orders` row becomes `paid` only after the signed webhook or a Stripe API verification. A fake webhook must not mark a row paid.
5. Inspect Cloudflare deployment logs for errors, especially Checkout Session creation, webhook verification, and D1 migration/binding.
6. Test smartphone layout and Apple/Google Pay on eligible real browsers; wallet presence depends on Stripe/browser/device.

## Before changing production

This preview does **not** enable live charging, inventory reservation, automated shipping/confirmation email, abandoned-cart email sequences, automated sales tax, or a fulfillment dashboard. The application deliberately accepts **only Stripe test keys** and **test sessions**. A separately reviewed production release is required to switch to live payments, configure a live webhook, and verify taxes, fulfillment, policies, PCI requirements, and dispute handling.

## Code boundaries

- `functions/_lib/stripe.js`: fixed USD pricing, Stripe calls and cryptographic signature checks.
- `functions/api/stripe/create-session.js`: same-origin POST, D1 provisional order, server-created Stripe session.
- `functions/api/stripe/webhook.js`: checks raw-body `Stripe-Signature`; updates D1 when verified and amount/currency match.
- `functions/api/stripe/status.js`: server-verified return-page payment status; only `paid` clears the cart.
- `migrations/0002_stripe_orders.sql`: separate Stripe order table; preserves existing Pix data.
- `tests/stripe-api.test.mjs`: price, auth, test session, signature and idempotency tests.

Run `node --test tests/stripe-api.test.mjs` with Node 22+ for the Stripe backend test suite.
