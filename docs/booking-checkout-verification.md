# Checkout, reservation and private recovery verification

Verified locally on 18 November 2026, Asia/Jakarta. Scope: B05/B06/B07. This is a prototype reservation flow with no payment integration, admin UI or deployed-environment certification.

## Product and interaction decisions

Observed sources: the user's checkout/mobile/copy corrections, [MVP](./mvp.md), [architecture](./architecture.md) and [design direction](../DESIGN.md). No comparable-product research or user study was performed.

- Confirmed fields are name, free-text **Mau jualan apa?**, email, **Nomor WhatsApp** normalized to `+62`, and optional **Catatan**. No business-name field or category enum. Contact fields are required; the note is not.
- **Lanjut isi data** enters `/booking/checkout`; **Pesan N slot** creates a real reservation and replaces checkout with `/booking/orders/$bookingOrderId` after a committed result.
- The route description, separated-slot disclaimer and extra checkout footer copy were removed at the user's request. The standalone “Harga dan slot belum bisa dicek” card was removed. Initial-read failure changes the main action to **Coba cek lagi**, retaining the form.
- A connection failure is not an allocation race. Ownership, all-or-none allocation, quote validation and duplicate recovery are enforced on the server/database. Button disabling is only interaction feedback.
- Confirmed final editing policy: available slots may change both price and size after sales opens. Reserved slots keep their price, dimensions, identity and footprint. The temporary opening-freeze proposal was reversed before any such migration was applied. Admin edit/reflow controls are still future work.

Decision receipt: a separate checkout page was selected over extending the cart sheet. The map stays focused on selection and a longer form can use natural scrolling/keyboard flow. The trade-off is one page transition. Mobile-first one-column form and existing semantic controls follow the project direction; the desktop quote sits beside it. This is a design judgment with no reference-screen evidence. Success criteria were correct fields/totals, retained data, explicit server outcomes, useful exits and no 360 px overflow.

## Implemented boundaries and invariants

- [Customer/quote contracts](../src/features/booking-checkout/booking-checkout.schema.ts) bound input, normalize common `08`/`8`/`62`/`+62` formats and reject malformed/foreign phone formats. Format validation does not prove WhatsApp ownership. Names/selling descriptions allow 200 characters, email 254, raw phone 40 and optional note 1,000 as technical input bounds.
- [Reservation service](../src/server/services/reserve-booking-slots.server.ts) uses one transaction, event → guest → sorted-slot locking, current schedule/layout/revisions, independent IDR prices, immutable order/items and all claims. An overlapping selection either commits completely or creates no booking. The unique active-claim index remains the final database guard.
- One guest/key identifies one order. A duplicate returns that order before checking current availability/window or attempt limits. A changed committed payload conflicts. Reservation attempts are limited per guest in PostgreSQL; idempotent recovery remains available.
- Database lock/statement limits are 5/15 seconds; the client reservation deadline is 20 seconds. A transport error retains the immutable request for same-key recovery instead of assuming no commit.
- [Guest sessions](../src/server/auth/booking-guest-session.server.ts) use random 256-bit tokens, hashed at rest, and HttpOnly/SameSite cookies with Secure in production. Thirty-day guest access expiry does not expire or release reservations. Every private read/recovery checks the active owning guest.
- [Private result/recovery](../src/server/services/private-booking-order.server.ts) returns only owner-authorized snapshots. RPC and SSR responses use `private, no-store`. A booking ID, public reference or submission key alone is not access.
- Session storage contains only the opaque idempotency UUID. Contact/quote data stays in memory and POST bodies. Reload can recover a committed booking by that key plus the HttpOnly guest session. Storage-blocked clients retain in-memory retry but cannot promise reload recovery. The key clears after successful recovery/navigation.
- [Migration 0004](../db/migrations/0004_checkout-customer-details.sql) adds selling description/note without rewriting historical business-name snapshots. [Migration 0005](../db/migrations/0005_reserved-slot-inventory-guards.sql) protects actively claimed inventory; immutable order triggers preserve historical snapshots after cancellation. Available-slot edits remain allowed.
- The implemented demo lifecycle persists reservations until explicit cancellation, with `not_integrated` payment state and no expiry job/provider call. Live operating policy and A07 admin cancellation remain separate decisions/work.

## Verification evidence

Production Node build and real PostgreSQL were used on the separate disposable integration branch `br-broad-shape-b3uilbrj`. Reviewed migrations were tested there before explicit application to the isolated app branch `br-tiny-lake-b34l5y7d`. No shared/live data reset or migration was performed. Browser fixture reservations were cancelled/released with an explicit test reason, retaining history. No application inventory was mutated for browser regression tests.

| Check                       | Evidence                                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests                  | `npm test`: 18 pass, including phone formats, optional/free text, limits, exact quote agreement and changed dimensions/revisions/prices.                                                                          |
| PostgreSQL                  | `npm run test:integration`: 16 pass, including the existing allocation/spatial/snapshot foundation and real reservation-service checks.                                                                           |
| Concurrency                 | Two guests request overlapping two-slot selections concurrently. Exactly one complete booking exists; the losing guest has no order or partial claims. Concurrent same-key duplicates return one order.           |
| Quote/window conflicts      | Real database price/revision/block/window changes are rechecked by the backend; stale client agreement or unavailable inventory cannot commit a partial booking.                                                  |
| Available vs reserved edits | A valid price and metric footprint/depth change succeeds on an available slot after opening. After booking, valid repricing/resizing/blocking attempts are rejected, while immutable saved values remain correct. |
| Private ownership           | Wrong/missing/expired guests are rejected. Owner-only submission-key recovery and cancelled snapshots are checked.                                                                                                |
| Lint/types/build            | `npm run lint`, `npm exec tsc -- --noEmit`, `npm run build` pass. Existing upstream directive/large map chunk warnings remain. No check/configuration was weakened.                                               |
| Migration review            | `npm exec drizzle-kit -- check` passes. Applied migrations 0000–0003 are unchanged; 0004/0005 are reviewable additions.                                                                                           |
| Source/artifacts            | Scoped Prettier, `git diff --check` and local documentation links pass. Public JavaScript was searched for server database/token-hashing internals; none were found.                                              |

## Browser journeys

Playwright CLI exercised the production build against the isolated PostgreSQL test branch with synthetic customer details.

- The cart still starts compact with explicit **Lihat/Tutup**. Its new checkout link uses white-on-primary text. At 667 × 375 the footer actions share a row, leaving about 81 px of item scrolling space rather than 25 px. Portrait height remains capped at 65dvh, short-height layouts at 85dvh.
- Empty direct checkout offers the map. Invalid submission focuses the first field with associated errors. Common local numbers become `+6281234567890`; optional notes and free-text selling descriptions work.
- L-001/R-003 produced exactly Rp575.000. Form data survived a map round trip and network failure. Route text and requested extra copy were absent.
- Delayed/aborted submission disabled fields/actions and rejected duplicate form submissions. An uncertain result kept the exact request locked; retry created/recovered one saved order.
- A second touch-enabled context allowed the server to **commit** before aborting its response. Full checkout reload recovered the existing private order without another reservation request, using only the stored UUID and guest cookie. The UUID was then cleared.
- Saved results showed actual immutable slots, contact details and normalized WhatsApp number. Copy reference worked through the real clipboard. Reload retained the order. Another browser context could not view private details through the same URL.
- A forged cross-origin POST returned **403**. The production guest cookie was observed as HttpOnly, Secure and SameSite=Lax. SSR receipt response was observed as `private, no-store`.
- A reasoned cancellation fixture released claims; refreshing the private page showed **Pesanan dibatalkan** with the original Rp575.000 total. This is status-reader evidence, not an implemented A07 cancellation API.
- Failed initial quote reads used the main retry button and retained the note, without restoring the removed error card. Private read/retry states were inspected separately.

| Viewport   | Checkout                                        | Private result                   |
| ---------- | ----------------------------------------------- | -------------------------------- |
| 375 × 667  | Native form, no horizontal overflow             | Saved/recovered/cancelled result |
| 360 × 640  | No horizontal overflow                          | No horizontal overflow           |
| 667 × 375  | Natural vertical scroll, no horizontal overflow | No horizontal overflow           |
| 1440 × 900 | Two-column form/quote                           | Centered readable result         |

Touch was emulated in Chromium; physical iPhone/Safari and on-screen keyboard behavior were not certified. Screenshots were rendered and inspected. Local ignored artifacts include `reservation-checkout-375.png`, `reservation-cart-375.png`, `reservation-cart-landscape.png`, `reservation-saved-375.png`, `reservation-recovered-touch-375.png` and the viewport-specific `reservation-checkout-final-*`/`reservation-cancelled-*` captures. Earlier read-only review/price-change images are superseded by the final persisted-reservation flow.

## View × state coverage

| Surface        | Loading                                | Empty/conflict                                              | Error/recovery                          | Saved outcome                                |
| -------------- | -------------------------------------- | ----------------------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| Form/quote     | Inventory, quote and guest preparation | Empty selection, field errors, closed/unavailable inventory | Main-button read retry, retained draft  | Backend-validated exact selection            |
| Reservation    | Locked form, pending action            | Stale quote or slot conflict allocates none                 | Immutable same-key retry; reload lookup | Committed booking and private navigation     |
| Private result | Pending owner-checked read             | Non-disclosing denied/missing result                        | Read retry without creating orders      | Reserved/cancelled snapshots, copy reference |

## RYUX delivery gate

| Area          | Result                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Product       | PASS · Confirmed fields/mobile/copy and editing policy; local task evidence, not tested with users.                                           |
| UX            | PASS · One booking action, explicit exits/corrections and backend-confirmed outcomes.                                                         |
| UI            | PASS · Task UI using existing type/surfaces/green primary, without route/extra footer text.                                                   |
| Design system | PASS · Existing Button and semantic tokens; no new dependency.                                                                                |
| Accessibility | PASS within scope · Labels/errors, first-invalid focus, keyboard entry and 44+ px controls checked; not a complete WCAG audit.                |
| Responsive    | PASS · Four sizes and touch-enabled Chromium; no hardware certification.                                                                      |
| Edge cases    | PASS within the matrix · Real conflicts, lost response, private denial, read retry and cancellation refresh.                                  |
| Code quality  | PASS · Focused domain/PostgreSQL checks, strict types, lint/build and formatting.                                                             |
| Visual QA     | PASS · Playwright screenshots at the listed widths and filled/empty/saved/cancelled states.                                                   |
| Anti-slop     | PASS · No invented fee, timer, category taxonomy, paid state or marketing metric. Synthetic data stays isolated and recorded as illustrative. |
| Final         | PASS for locally verified B05–B07 prototype scope.                                                                                            |

Next: A01 persistent admin authentication/shell, then A02 booking-window controls and safe available-slot authoring/pricing. Hosting, admin operations and integrated demo verification remain outstanding.
