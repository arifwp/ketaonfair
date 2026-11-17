# Ketaon Fair — GIS Event Tenant Booking MVP

Date: 17 November 2026  
Status: Proposed implementation specification, not a record of completed features  
Technical companion: [Tech stack and architecture](./architecture.md)  
Background: [Original project conversation](./gis-event-tenant-booking-conversation-2026-11-17.md)

Implementation record: [Progress tracker and prioritized plan](./progress.md).

## 1. Product objective

Prioritize the customer booking flow and admin dashboard for the prototype. Enable a customer to choose one or several slots through slot/map views, review individual dimensions and prices, enter contact details, and create a persisted reservation. Enable the organizer to adjust and publish inventory, manage prices, and monitor those reservations.

Payment integration is deferred. Prototype checkout ends with a booking reference and a clear "Reservation recorded — no payment collected" result. Midtrans remains the intended later payment provider, but neither Sandbox nor production integration is a prototype acceptance requirement.

The MVP must demonstrate both the customer reservation and the admin operation. A static map with decorative slots is insufficient. The distinctive capability is changing sellable frontage while preserving entrances and other access gaps.

## 2. Requirements and proposed defaults

### Confirmed requirements

- An admin dashboard with slot adjustment, price generation, individual slot prices, basic analytics, and monitoring.
- Most slots share a price and size, while individual slots can have different prices and dimensions. Frontage examples include 1.2 m and 2.1 m.
- A customer portal with a slot view, map view, multiple-slot selection, and checkout.
- The application serves one fixed event. Multiple-event creation, switching, and management are outside scope. A database configuration record does not imply a dynamic event catalog.
- Booking opening and closing dates/times are dynamic settings editable in the admin dashboard. Evaluate the saved schedule in the event timezone; accept new reservations at or after opening and strictly before closing. Closing bookings does not cancel existing reservations.
- Customers can check out and book slots without signing in or creating an account. Guest checkout is confirmed; admin access still requires authentication.
- The map must offer satellite imagery, preserve slot overlays across basemaps, and support close zoom for inspecting available slots and adjusting the draft layout.
- `/` is the event landing page. `/booking` is the customer booking entry point and the focus of the upcoming portal implementation.
- `/booking` is a full-viewport map with satellite as the default background, floating cart and slot-code search. Do not show event information, page headers, route/availability filters or price bounds here. Slot footprints support hover details and direct click-to-add/remove. Keep an accessible search/list overlay without replacing the map with a separate catalog view.
- Customer booking is mobile-first, including the 375 × 667 iPhone SE viewport. The cart starts as a compact bar and opens only on request in a bottom sheet with a visible **Tutup** button, internal item scrolling and persistent close/footer controls. Closing it keeps selected slots.
- Customer booking copy is confirmed in casual Bahasa Indonesia with a Gen Z tone. Keep status, dimensions, prices and incomplete reservation/payment state precise; accessibility labels and errors use the same language.
- The starter street runs from Pasar Cepit / Pasar Ketaon baru to Bengkel Purnama Fauzan. Additional routes within this fixed event, including toward Makam Mbah Budo, can have their own generated slots; their geometry and frontage approvals are still required.
- `/admin` is the authenticated admin dashboard entry point for slot management, pricing, analytics, and monitoring.
- Routes and permitted frontage are defined for the fixed event, with explicit gaps around unavailable areas.
- Configurable frontage length per slot, including 1.2 m, 1.5 m, 2 m, and 2.1 m; do not restrict input to a fixed preset list.
- Preferred application stack of React, TanStack Start, and TypeScript with Neon. Midtrans is planned for a later phase.
- Build customer booking and the admin dashboard first. Defer payment integration and provider-specific monitoring.
- A working prototype for demonstration before a live sales launch.

### Proposed defaults for the first implementation

These choices make the draft actionable. They are not previously confirmed business policies.

| Topic                 | Proposed MVP default                                                                                               | Consequence                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Organizer scope       | One organizer                                                                                                      | A multi-organization platform is outside scope; the event is fixed as confirmed above.                                    |
| Rental period         | A slot is booked for the entire event                                                                              | No daily, hourly, or session inventory.                                                                                   |
| Admin identity        | Authenticated organizer admin                                                                                      | Customer access never grants admin privileges.                                                                            |
| Multiple selection    | Any available slots within the same event                                                                          | Do not imply separated slots form one continuous booth.                                                                   |
| Slot size             | Common generation dimensions per approved stretch, with individual slot overrides                                  | Different-sized slots can share a stretch; customers buy the published dimensions.                                        |
| Price unit            | A fixed IDR amount per slot for the event                                                                          | No automatic multiplication by length, demand pricing, or discounts.                                                      |
| Reservation lifecycle | Proposed: persist prototype reservations until explicit admin cancellation, without an automatic payment countdown | No provider, expiry worker, or payment scheduler is required; a later hold policy must be defined before adding payments. |
| Layout lifecycle      | Geometry becomes fixed after the first reservation                                                                 | Admin can still change eligible prices and block available slots.                                                         |
| Fees and taxes        | No additional line items in the demo                                                                               | Live fees, taxes, and customer disclosures remain undecided.                                                              |
| Payment integration   | Deferred, including Sandbox                                                                                        | Show "No payment collected"; no fake paid state, payment form, or provider credentials required.                          |

## 3. Users, tasks, and success criteria

| User                      | Primary task                                         | Information needed first                                                | Intended result                                                  |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Admin preparing inventory | Adjust frontage, exclusions, slots, and prices       | Draft/published status, dimensions, conflicts, and access gaps          | Publish a valid, priced layout.                                  |
| Admin monitoring bookings | Identify reservation progress and operational issues | Reserved/available inventory, booking details, and recent activity      | Understand what needs attention without implying paid sales.     |
| Customer                  | Find suitable space and reserve it                   | Slot identity, location, dimensions, availability, and individual price | Receive a saved reservation reference with no payment collected. |

Acceptance priorities, in order:

1. Customers complete the slot/map selection, review, and reservation flow with a saved reference.
2. Slot and map views share inventory and preserve mixed-size, mixed-price selection.
3. Concurrent reservation requests cannot allocate the same slot twice.
4. Admin can adjust valid draft layouts, preserve access gaps, and apply common defaults or per-slot size/price overrides.
5. Admin monitoring reflects persisted reservations, and every booking result clearly states that payment was not collected.

## 4. Inventory model

```text
Event
└── Layout version
    ├── Route / location group
    │   └── Booth row with stable start-to-end direction
    │       ├── Approved stretch with default frontage length and depth
    │       │   └── Generated slots with individual dimension/price overrides
    │       └── Exclusion interval / access gap
    └── Another route and its rows
```

A route groups inventory. A booth row follows permitted frontage rather than automatically offsetting the road centerline. Opposite road sides are independent rows. Approval belongs to a stretch, with a note or reference; unreviewed space is unavailable.

Each slot has a stable internal ID, customer-facing code, row, frontage interval, dimensions, geographic footprint, price, and availability. A selected slot is a local customer choice, not a reservation.

## 5. Admin dashboard

The admin dashboard lives at `/admin`. Its slot management, layout editing, pricing, analytics, and monitoring screens require authenticated admin access. Specific child routes remain implementation details.

### 5.1 Event setup

- Create or edit event name, dates, location, map center, and booking window.
- Set the default slot price and the default generation dimensions.
- Keep the event draft until layout and pricing checks pass.
- Open or close bookings independently of viewing the published layout.
- Closing bookings prevents new reservations. Existing reservations remain recorded; closure does not cancel them. Payment attempt handling belongs to the later integration phase.

### 5.2 Layout editor and slot adjustment

1. Add a route/location group and draw a booth row.
2. Choose the row direction and which side of the frontage receives the booth depth.
3. Define approved intervals and exclusions using distances from the row start, with map highlighting.
4. Set default frontage length and depth for each approved stretch.
5. Generate a draft preview with slot codes, count, dimensions, price, and unused remainder.
6. Override individual slot dimensions where needed, or adjust source rows, stretch boundaries, and gaps. Preview any reflow or full regeneration before saving.
7. Inspect validation errors and publish only after they are resolved.

The editor must support saving and reopening a draft. Unsaved changes must be visible, and leaving the editor must warn about losing them.

The editor provides street/satellite basemap switching, a scale indicator, zoom controls, and actions to fit the layout or focus a slot/stretch. Close zoom must allow the admin to distinguish small and mixed frontage sizes, including 1.2 m and 2.1 m, and edit source boundaries without changing the scale of the inventory itself. Proposed maximum display zoom is 24, subject to validation with the selected renderer and device. Published-layout editing restrictions still apply at every zoom level.

Generation rules:

- Generate each uninterrupted approved stretch separately.
- Use whole slots only. Leave insufficient remainder unsold and show its length.
- Never cross a gap, use unapproved frontage, or silently remove an exclusion.
- Reject invalid polygons, collisions, and footprints extending outside the approved area.
- At sharp corners, require a split into separate stretches or manual boundary adjustment.
- Show the replacement preview before discarding a previous draft generation.
- Warn that full regeneration replaces draft slots and their individual size/price adjustments. Show the affected inventory before applying it.
- Treat the basemap as context, not proof of measured boundaries.

For the MVP, individual location correction uses source row/stretch editing or the dimension-override workflow below. An unrestricted CAD-style polygon editor is deferred.

#### Individual slot sizes

- Generate the common size first, then let the admin set a different frontage for a particular draft slot, such as 2.1 m beside a 1.2 m slot. Depth can also be overridden when needed; the examples in the brief refer to frontage, not area.
- Store positive dimensions at millimeter precision. Accept decimal meters in the form and normalize exactly, so 2.1 m becomes 2100 mm and 1.2 m becomes 1200 mm. Reject unsupported precision instead of silently rounding.
- Generated slots keep their base dimensions. Editing a stretch/event default affects future generation only; clearing an individual override returns to that slot's stored base dimensions after layout validation.
- A frontage change preserves slot order and recalculates the changed slot's end and subsequent slot intervals within the same uninterrupted stretch. Rebuild affected footprints and preview the changes before saving.
- Reflow must not cross an access gap, move slots into another stretch, or create overlaps. If the resized sequence does not fit, reject the change and let the admin adjust the size or explicitly remove draft inventory. Never silently drop or shrink another slot.
- A targeted size change preserves affected slot IDs, codes, and price overrides. It does not automatically reprice the resized slot. Validate a depth-only change against the approved footprint and neighboring slots as well.
- Apply dimension changes and affected geometry atomically with a draft revision check. The published-layout freeze still applies after the first reservation; customers cannot request arbitrary resizing during checkout.

Illustrative example: a 10 m stretch contains six default 1.5 m slots. Set the first to 2.1 m and the second to 1.2 m; the four remaining slots stay 1.5 m. Total used frontage becomes 9.3 m with 0.7 m unsold. Prices remain individually configured rather than being inferred from those widths.

### 5.3 Pricing and price generation

The common operation should be entering one default price and generating many equally priced slots. The exception should be selecting particular slots and overriding their prices.

| Action                         | Behavior                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Set event default              | Defines the template for future generated slots.                                 |
| Generate slots                 | Each new slot receives a stored base price copied from the event default.        |
| Change one slot price          | Sets an explicit price override on that slot.                                    |
| Bulk set price                 | Sets the same override on selected eligible slots or a filtered group.           |
| Clear override                 | Returns selected eligible slots to their stored base price.                      |
| Reset to current event default | Copies the current default into eligible base prices and clears their overrides. |
| Change the event default later | Does not silently reprice existing slots; use the explicit bulk reset.           |

`Effective slot price = individual override, when present; otherwise stored base price.`

The pricing table supports code search, route/row filters, availability filters, selection, and a preview of affected slots. It shows base price, override, and effective price. Bulk actions explicitly state whether they target selected rows or the entire filtered result.

Display each slot's actual frontage and depth beside its price so exceptions are visible. Size and price are independent: two different-sized slots may share a price, and equal-sized slots may have different prices. A size edit does not imply an automatic price change.

All prices are positive whole IDR amounts. Admin actions must reject invalid values. A bulk preview identifies ineligible slots; applying the action rechecks eligibility and reports changed and skipped counts. Reserved slots cannot be repriced. A slot safely released by explicit cancellation can be repriced again; earlier booking snapshots remain unchanged.

An order stores its own price snapshot. Later price changes cannot alter an existing order. If a customer's locally selected price changes before reservation, show the revised amount and require review before submitting the reservation.

Illustrative pricing example, not an actual event tariff: generate 20 slots at IDR 150,000, override A-001 to IDR 200,000, and override A-002 to IDR 175,000. The other 18 slots remain IDR 150,000.

### 5.4 Publishing and operational adjustments

- Publish only approved, valid, positively priced inventory with unique slot codes.
- Keep draft layouts private. The portal reads only the published layout.
- Before any reservation has existed, close bookings to revise and republish geometry.
- After the first reservation, freeze the event's published geometry, slot identities, dimensions, numbering, and membership of the layout, even if that reservation is later cancelled.
- Allow blocking or unblocking an available slot, with a reason and audit entry.
- Reject blocking, moving, deleting, renumbering, or regenerating a reserved slot. The same protection extends to held/sold inventory when payments are added.
- Require a separate future layout-change workflow for physical changes after booking begins. Do not publish a replacement version over active reservations in this MVP.

### 5.5 Booking monitoring

- Search bookings by reference, customer name, or business name.
- Filter by reservation state, route, and date.
- Show customer details, exact slots/dimensions, item price snapshots, quoted total, creation time, and reservation state.
- Show recent booking activity, inventory changes, failed saves, and refresh failures where relevant.
- Proposed prototype control: an authenticated admin can cancel an unpaid prototype reservation with a reason. Atomically release its claims, preserve the booking history, and record the actor and reason. There is no customer self-service cancellation in this scope.
- Never offer a manual "mark paid" action or imply the reservation has been financially settled.
- Payment status refresh, provider references, overdue payment alerts, and reconciliation monitoring are deferred.

### 5.6 Basic analytics

Metrics are event-scoped and calculated from persisted records. Prices remain useful for reviewing the reservation even while payment is deferred.

| Metric                         | Prototype definition                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Published inventory            | Slots in the current/frozen published layout; exclude drafts.                                             |
| Available / reserved / blocked | Mutually exclusive counts whose sum equals published inventory.                                           |
| Bookable capacity              | Published inventory minus blocked slots.                                                                  |
| Reservation occupancy          | Reserved slots / bookable capacity. Show an empty value if capacity is zero.                              |
| Active bookings                | Saved, uncancelled reservations.                                                                          |
| Quoted reservation value       | Sum of immutable totals for active bookings. This is not revenue, collected money, or a payout.           |
| Cancelled bookings             | Count of explicitly cancelled bookings, separate from active inventory.                                   |
| Booking trend                  | Reservation count and quoted value by reservation date; cancelled records remain identifiable in history. |
| Route performance              | Reserved count, capacity, reservation occupancy, and active quoted item value per route.                  |

Show last refreshed time and refresh failure. Display event timezone explicitly. Proposed refresh cadence is 15 seconds while visible, plus refresh after relevant actions. A small booking chart and route table are enough. Paid sales, pending payment value, paid exceptions, and provider settlement metrics are deferred.

## 6. Customer portal

### Route ownership

The event landing page lives at `/`. The booking experience lives at `/booking`, with a full-viewport map, accessible search/list overlay and one floating cart. The authenticated admin dashboard lives at `/admin`. Customers can open `/booking` directly; visiting the landing page first is optional.

Keep event promotion and general information on the landing page, with navigation into booking. Focus the upcoming portal work on `/booking` and its booking flow. Proposed follow-on routes are `/booking/checkout` for contact details, quote review, and reservation submission and `/booking/orders/$bookingOrderId` for private order status; these child paths are implementation proposals rather than separately confirmed requirements.

### 6.1 Event and inventory browser

Keep event information on `/`. `/booking` uses the entire viewport as the map canvas. Its search, cart and map controls float above the map. Show dimensions, prices and availability in hover/click details, search results and cart items, plus a concise illustrative-inventory notice where applicable.

Provide the map and an accessible list overlay:

- **Map:** geographic slot polygons over satellite imagery by default. Available slots add to the floating cart when clicked; clicking selected slots removes them. Hover highlights the footprint and shows code, dimensions, price and status. Unavailable slots remain inspectable without being added.
- **Search/list overlay:** search slot codes and use labeled keyboard controls to add/remove or locate a slot. The overlay remains usable when the map cannot load; it does not become a separate booking page or full-page slot view.

Map, search results and floating cart use the same IDs, inventory response and selection. Slot-code search is the only customer inventory filter; route, availability and minimum/maximum price filters were explicitly removed by the user. Changing search/background or opening the cart must preserve selection. At low zoom, use search/results instead of making tiny polygons the only selection control.

The street-side identity is relative to each row's saved start-to-end direction, never the camera bearing. The current illustrative starter follows OpenStreetMap road context near the supplied endpoints, with separate left/right rows, proposed 3 m offsets, mixed-size slots, and synthetic access gaps. These are demonstration allocations, not confirmed homeowner permissions or measured frontage. Adding more routes belongs to the A03/A04 authoring workflow; do not create a separate event for each street.

Statuses must be readable through text and icons as well as color. Unavailable slots can be inspected but cannot be added. Selected details show each slot's individual price; never infer a common price across a mixed selection.

#### Basemap and zoom behavior

- Satellite is the default background. A floating Street/Satellite control changes the background while the map remains the booking surface. There is no primary Slot/Map page-view toggle.
- Draw the same slot footprints and access-gap overlays above both map backgrounds. Preserve selected IDs, prices, filters, current viewport, and any unsaved editor work when switching basemaps.
- Provide zoom in/out, a scale indicator, **Fit available slots**, and **Zoom to slot**. Fit available slots uses the current filters and viewport padding; when none match, show an empty result rather than jumping to an unrelated location.
- Start with available inventory fitted around the floating controls/cart. Derive the minimum zoom from that fit; zooming out must stop there rather than revealing the whole world. Bound panning to the fitted local region as well. If no slots are available, retain published-layout context. Recalculate the local navigation limits for viewport size changes; code search and availability polling do not widen them. Allow manual close zoom up to 24 and focus up to 22.
- Do not automatically reset the viewport when availability refreshes. A slot chosen from the slot view can be located through an explicit action that opens the map and focuses that slot.
- Keep outlines, selection, and status labels legible over photography. Increasing zoom must not enlarge the geographic slot dimensions or imply a more accurate survey.
- Satellite imagery can become blurry beyond its native detail. Keep vector slots usable at close zoom and describe imagery as geographic context, not a measurement source.
- If satellite loading fails, preserve the selection and offer the street background or slot view with a retry. A style change must not silently remove inventory or reset the editor.

### 6.2 Selection and checkout

1. Add or remove available slots in either view.
2. Review slot codes, locations, actual dimensions, individual prices, count, and total in one selection summary.
3. Continue to checkout and enter proposed minimum details: contact name, business name, email, and phone number.
4. Review the final server quote and submit **Reserve selected slots**.
5. If every slot remains available and the reviewed quote is current, save the entire selection in one reservation transaction.
6. Show a private booking status page with the reference and **Reservation recorded — no payment collected**.

Opening checkout or selecting slots does not reserve inventory. Submitting the final reservation does. If any requested slot conflicts, reserve none, identify unavailable items, and retain the remaining selection for correction.

Checkout requirements:

- Do not require customer sign-in or registration. Establish a private guest session automatically to authorize submission and later booking access.
- The server calculates totals; browser-submitted prices are not authoritative.
- A repeated submission returns the same booking for that checkout idempotency key. Reusing a key with a changed selection is a conflict.
- If the request times out, retry with the same key to recover its result rather than creating another booking. Do not report success until persistence is verified.
- Recheck dimensions, revisions, prices, and availability before committing. Changed quotes require review and resubmission.
- Closing the page does not cancel a saved reservation. Customer changes after submission are outside this prototype's self-service flow.
- No payment method selector, card/bank details, Snap page, payment countdown, or fake payment-success action is included.

### 6.3 Booking status

Display the booking reference, contact/business name, event, exact slots and dimensions, item price snapshots, quoted total, reservation state, and creation time.

Distinguish **Reserved** from **Cancelled**, submission errors, and access denied. Always state that payment is not integrated and no payment was collected. Do not label a reservation as paid, sold, or financially confirmed.

Only the owning guest session or an authenticated admin can read private booking details. A reference by itself is not authorization. Provide a copyable reference for contacting the organizer. Losing the private browser session requires organizer assistance. Cross-device recovery and customer accounts are deferred.

## 7. Availability and reservation rules

| Concept           | Prototype meaning                                                                       |
| ----------------- | --------------------------------------------------------------------------------------- |
| Available         | Published, not blocked, and without an active claim.                                    |
| Selected          | Local customer choice; no exclusive ownership.                                          |
| Reserved          | Persisted server claim linked to a saved booking; no payment collected.                 |
| Blocked           | Organizer has removed otherwise unclaimed inventory from booking.                       |
| Cancelled booking | Historical booking whose claims were explicitly released; no longer consumes inventory. |

Proposed prototype lifecycle: reservations persist without automatic expiry until explicit admin cancellation with a reason. This avoids making an unconfirmed payment deadline part of the first demo. Closing a tab, refresh, or a browser timer cannot release them. The cancellation operation must be idempotent and reject ineligible bookings.

Held, paid, sold, payment-pending, and payment-expiry states belong to the later payment phase. Define its migration and hold policy before integrating Midtrans; never silently convert existing prototype reservations into paid orders. The [future payment design](./architecture.md#7-payment-processing-and-reconciliation) is retained as planning context, not a prototype implementation requirement.

## 8. Required states and failure behavior

| Surface           | States to specify and demonstrate                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Admin access      | Signed out, authenticated admin, forbidden customer/guest.                                                                 |
| Layout editor     | Empty, loading, saved draft, unsaved changes, generation running, invalid geometry, save conflict, published, frozen.      |
| Pricing           | No selection, mixed prices, invalid value, bulk preview, applying, partial eligibility change, success, failure.           |
| Dashboard         | No bookings, loading, available data, stale data, refresh failure, recent reservation activity.                            |
| Inventory browser | Loading, no inventory, no filter matches, available, reserved, blocked, selected, stale availability.                      |
| Map               | Loading, map/provider failure, unsupported rendering, tiny footprints; retain slot view access.                            |
| Checkout          | Missing details, quote changed, slot conflict, submitting, request timeout, recovered existing booking, saved reservation. |
| Booking status    | Reserved, cancelled, loading, read failure, access denied; no payment collected is always explicit.                        |

Customer selection and checkout must work at a 360 px viewport without horizontal page scrolling. Provide keyboard-operable controls, labeled form errors, visible focus, and an accessible slot list alternative to map interactions. The admin editor is desktop-first; the dashboard and order monitoring remain readable on mobile.

The booking cart remains compact while customers explore/select slots. Open contents in a sheet capped at 65% of a portrait dynamic viewport; short-height layouts can use 85% to retain usable header/footer controls. Item content scrolls internally. Closing via **Tutup**, Escape or backdrop must retain the cart and restore focus to the launcher. Use 44 px touch targets, safe-area spacing and 16 px search text. The map controls move into thumb reach on mobile; satellite, overlay, search, cart and navigation bounds must continue to work together.

## 9. Out of scope

- Multi-organization billing, public organizer onboarding, or complex admin roles.
- Daily/session rentals, customer-defined frontage, or automatic booth merging.
- Demand-based pricing, vouchers, bidding, commissions, or tax calculation.
- All payment implementation, including Midtrans Sandbox, credentials, token creation, payment UI, webhooks, expiry/reconciliation jobs, refunds, and payment monitoring.
- Customer self-service cancellation.
- Automated emails, WhatsApp messaging, and cross-device guest recovery.
- Survey-grade mapping, routing/navigation, or automatic landowner approval.
- Unrestricted editing of already booked physical layouts.
- WebSocket infrastructure, a separate analytics platform, or accounting reports.

Later payment integration must add verified provider outcomes and reversal/exception handling as a separate milestone. No provider-specific schema, webhook route, or scheduler is needed to complete this prototype.

## 10. Delivery sequence and acceptance

### Milestone 1 — Customer booking flow first

Start with a clearly illustrative, published database fixture so portal work can proceed before the editor is complete. Deliver `/booking` as a full-viewport satellite map with floating cart, slot-code search/list overlay, hover/click interaction, local navigation bounds, shared mixed-size/price selection, checkout review, atomic reservation submission, and a private booking result.

Acceptance:

- Switching presentation or basemap preserves selection, viewport, visible overlays, and total.
- Each slot's actual dimensions and individual price appear in selection and checkout; separated slots do not imply continuous frontage.
- Fit/focus actions and close zoom work with 1.2 m and 2.1 m slots on desktop/mobile; an unavailable map still permits slot-view selection.
- A successful submission persists the booking and claims, returns a reference, and clearly states that no payment was collected.
- Two customers racing for the same slot produce one active owner. An overlapping multi-slot request reserves none.
- Repeated submission/timeout recovery returns the same booking. Quote changes require review before reservation.
- A guest cannot read another guest's booking through a guessed ID or reference.

### Milestone 2 — Admin dashboard and inventory management

Deliver `/admin`, persistent admin authentication, reservation monitoring, event setup, row/stretch/gap editing, generation, validation, size overrides/reflow, bulk and individual pricing, publishing, blocking, proposed admin cancellation, and audit history.

Acceptance:

- A 70 m row with sellable intervals 0–18 m, 22–40 m, and 46–70 m produces 40 slots at 1.5 m, without bridging the gaps.
- A 10 m interval produces six 1.5 m slots and reports 1 m remainder.
- Changing the first two widths to 2.1 m and 1.2 m uses 9.3 m and leaves 0.7 m. Targeted resize preserves IDs/codes and price overrides.
- Overflow, overlap, unapproved footprints, and invalid prices prevent saving/publishing.
- Common prices, individual overrides, and bulk reset produce the specified amounts without modifying reservation snapshots.
- The editor supports satellite switching and close zoom without losing unsaved work.
- After the first reservation, geometry remains frozen, including after that booking is cancelled. Reserved prices cannot change.
- An authorized cancellation atomically releases all claims, records a reason, and preserves history; repeat cancellation has no extra effect.

### Milestone 3 — Prototype monitoring and end-to-end verification

Deliver reservation metrics, booking trend, route breakdown, refresh status, and a complete customer/admin demo.

Acceptance:

- Available + reserved + blocked equals published inventory.
- Active quoted value matches uncancelled reservation snapshots and is never labelled collected revenue.
- Cancelled bookings release capacity and leave an auditable history.
- Reservation retries never inflate counts or quoted value.
- Customer/admin flows work without Midtrans keys, payment tables/endpoints, or a reconciliation scheduler.
- Illustrative data and the absence of collected payment are visible; private details and admin controls remain protected.

### Later milestone — Payment integration

After the booking and admin prototype is working, define the reservation-to-payment policy and integrate Midtrans Sandbox, verified notifications, safe payment expiry, reconciliation, reversals, and payment analytics. Reassess current provider documentation during that implementation. A live payment launch is a separate readiness decision.

Suggested demo size is 50–100 illustrative slots over two route groups with access gaps, mixed sizes, and price overrides. This is a fixture, not verified site capacity or a performance claim. Work on the `/` event landing page is separate from the booking/admin priority.

## 11. Decisions to resolve before implementation or live use

| Decision                                                       | Proposed direction                                                           | Needed by                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Rental period and adjacency                                    | Full event; allow separated slots                                            | Before schema/selection rules.                                    |
| Prototype reservation release                                  | Persist until explicit admin cancellation with a reason; no automatic expiry | Before reservation lifecycle implementation.                      |
| Language and customer fields                                   | Indonesian; contact, business, email, phone                                  | Before portal forms.                                              |
| Demo hosting                                                   | Node-compatible HTTPS hosting and isolated Neon demo branch                  | Before shared prototype; payment scheduler is not a prerequisite. |
| Payment methods, hold duration, and existing-booking migration | Deferred with Midtrans integration                                           | Before the later payment milestone.                               |
| Real dimensions, permissions, and physical numbering           | Field validation; illustrative geometry until then                           | Before real allocation/sales.                                     |
| Live refund, cancellation, tax, fee, and contact policies      | Unresolved; prototype cancellation is not a live operating policy            | Before live launch.                                               |

## 12. Specification review

Evidence is the user's project requests and subsequent scope clarifications, the exported conversation, and the repository scaffold. No user research or usability test has been performed. Proposed defaults above are design judgments rather than validated operating policies.

| Review area                | Result for this documentation task                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Product                    | PASS — required admin and customer capabilities are traceable to the brief; defaults are labeled.       |
| UX                         | PASS for specification — both flows, primary tasks, and actions are defined; usability is unverified.   |
| UI / design system         | N/A — no screens, visual direction, or components were designed.                                        |
| Accessibility / responsive | NOT VERIFIED — requirements are specified; implementation has not been tested.                          |
| Edge cases                 | PASS for specification — the view/state matrix and transaction failure cases are included.              |
| Code quality               | N/A — no application logic is changed by this document.                                                 |
| Visual QA                  | N/A — no visual artifact is delivered.                                                                  |
| Anti-slop                  | PASS for specification — no invented traction, real prices, capacity, or completed-feature claims.      |
| Final                      | NOT VERIFIED as a product — documentation is complete; working behavior remains to be built and tested. |
