# TorqueBox reference layout — 24 November 2026

The supplied AutoPro image defines the composition and order: announcement,
dark navigation, three photographic hero slides, six categories in one row,
four featured products in one row, a wide campaign image, four benefits,
three attributed product reviews, newsletter and dark footer.

The TorqueBox palette is black, white and orange. New raster assets and their
generation prompts are recorded in `REFERENCE_LAYOUT_IMAGES.json`.

`shop.html` contains four featured tools. `collection.html` contains QIFOR and
the fifteen preview products, with search, category filters, sorting and local
favorites. Product grids keep four columns on mobile as explicitly requested.
Short visible titles preserve room in those dense mobile cards; accessible
link names contain the complete product names.

Product pages retain six distinct gallery photographs, application guides and
existing researched copy. New products have no prices or purchase actions.
External reviews remain identified as reviews of reference products; initials
are used instead of invented customer portraits. No new discounts, sales
counts, delivery promises or customer testimonials were created.

The newsletter form stores explicit opt-ins in an isolated D1 table using
the existing `TORQUEBOX_DB` binding. It does not send email. Invalid origins,
invalid consent, malformed requests and unavailable storage produce errors.
The subscriber list has no public read endpoint. Privacy copy describes the
opt-in, support-based unsubscribe and browser favorites.

## Verification

- Browser review at desktop, 375px and 320px content widths.
- Six categories share one row; four product cards share one row. Neither
  tested mobile width has horizontal document overflow.
- Hero next/previous controls change the active slide.
- Favorites save, filter and remove items, including the empty state.
- Product search returns the correct product; opening and returning from its
  page preserves the query and filtered results.
- Category dropdown filters the full collection. The four wheel-care products
  appear for the wheels category.
- Gallery controls advance from 01 / 06 to 02 / 06 and select 06 / 06.
- New newsletter API tests use actual in-memory SQLite, covering opt-ins,
  duplicates, consent, origin, payload size, unavailable storage and honeypots.

The original QIFOR landing page, its CSS/JavaScript, payment functions and
reviews API are unchanged.
