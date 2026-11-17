# Ketaon Fair — GIS Event Tenant Booking MVP

Date: 17 November 2026  
Status: Proposed implementation specification, not a record of completed features  
Technical companion: [Tech stack and architecture](./architecture.md)  
Background: [Original project conversation](./gis-event-tenant-booking-conversation-2026-11-17.md)

## 1. Product objective

Enable an event organizer to prepare and adjust a geographic booth layout, generate slots and prices, publish available inventory, and monitor bookings. Enable a customer to choose one or several slots through a slot view or map view, review the exact price, and pay through Midtrans.

The MVP must demonstrate both the admin operation and the customer transaction. A static map with decorative slots is insufficient. The distinctive capability is changing sellable frontage while preserving entrances and other access gaps.

## 2. Requirements and proposed defaults

### Confirmed requirements

- An admin dashboard with slot adjustment, price generation, individual slot prices, basic analytics, and monitoring.
- Most slots share a price, while specific slots may have different prices.
- A customer portal with a slot view, map view, multiple-slot selection, and checkout.
- `/` is the event landing page. `/booking` is the customer booking entry point and the focus of the upcoming portal implementation.
- `/admin` is the authenticated admin dashboard entry point for slot management, pricing, analytics, and monitoring.
- Routes and permitted frontage vary between events, with explicit gaps around unavailable areas.
- Configurable frontage length, including 1.2 m, 1.5 m, and 2 m.
- Preferred application stack of React, TanStack Start, and TypeScript, with Neon and Midtrans.
- A working prototype for demonstration before a live sales launch.

### Proposed defaults for the first implementation

These choices make the draft actionable. They are not previously confirmed business policies.

| Topic               | Proposed MVP default                                          | Consequence                                                                         |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Organizer scope     | One organizer, with one event in the initial demo             | Keep event IDs in the model; defer a multi-organization platform.                   |
| Rental period       | A slot is booked for the entire event                         | No daily, hourly, or session inventory.                                             |
| Customer identity   | Guest checkout with a private browser session                 | No customer account requirement; losing that session requires organizer assistance. |
| Admin identity      | Authenticated organizer admin                                 | Customer access never grants admin privileges.                                      |
| Multiple selection  | Any available slots within the same event                     | Do not imply separated slots form one continuous booth.                             |
| Slot size           | One frontage length and depth per approved stretch            | Use another stretch for a different size; customers buy generated slots.            |
| Price unit          | A fixed IDR amount per slot for the event                     | No automatic multiplication by length, demand pricing, or discounts.                |
| Hold timing         | One configurable server deadline shared with the payment flow | Exact duration and enabled methods must be chosen and tested in Sandbox.            |
| Layout lifecycle    | Geometry becomes fixed after the first reservation            | Admin can still change eligible prices and block available slots.                   |
| Fees and taxes      | No additional line items in the demo                          | Live fees, taxes, and customer disclosures remain undecided.                        |
| Payment environment | Midtrans Sandbox only                                         | Any simulated payment is visibly identified as a test.                              |
| Interface language  | Indonesian proposed for the demo audience                     | Documentation is English; product language remains a decision.                      |

## 3. Users, tasks, and success criteria

| User                      | Primary task                                   | Information needed first                                                 | Intended result                          |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Admin preparing inventory | Adjust frontage, exclusions, slots, and prices | Draft/published status, dimensions, conflicts, and access gaps           | Publish a valid, priced layout.          |
| Admin monitoring sales    | Identify sales progress and exceptions         | Confirmed sales, held inventory, pending payments, and unresolved errors | Understand what needs attention.         |
| Customer                  | Find suitable space and complete a booking     | Slot identity, location, dimensions, availability, and individual price  | Receive a verified booking confirmation. |

Acceptance priorities, in order:

1. Generated slots never bridge an access gap or overlap another sellable footprint.
2. Admin can set a common price efficiently and make selected slots different.
3. Slot and map views represent the same inventory and preserve one selection.
4. Concurrent checkout cannot allocate the same slot twice.
5. Payment and monitoring states reflect server records, including failures and uncertainty.

## 4. Inventory model

```text
Event
└── Layout version
    ├── Route / location group
    │   └── Booth row with stable start-to-end direction
    │       ├── Approved stretch with frontage length and depth
    │       │   └── Generated slots
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
- Open or close sales independently of viewing the published layout.
- Closing sales prevents new reservations. Existing payment attempts remain governed by their recorded deadline and status.

### 5.2 Layout editor and slot adjustment

1. Add a route/location group and draw a booth row.
2. Choose the row direction and which side of the frontage receives the booth depth.
3. Define approved intervals and exclusions using distances from the row start, with map highlighting.
4. Set frontage length and depth for each approved stretch.
5. Generate a draft preview with slot codes, count, dimensions, price, and unused remainder.
6. Adjust row vertices, stretch boundaries, dimensions, and gaps, then regenerate the affected draft.
7. Inspect validation errors and publish only after they are resolved.

The editor must support saving and reopening a draft. Unsaved changes must be visible, and leaving the editor must warn about losing them.

Generation rules:

- Generate each uninterrupted approved stretch separately.
- Use whole slots only. Leave insufficient remainder unsold and show its length.
- Never cross a gap, use unapproved frontage, or silently remove an exclusion.
- Reject invalid polygons, collisions, and footprints extending outside the approved area.
- At sharp corners, require a split into separate stretches or manual boundary adjustment.
- Show the replacement preview before discarding a previous draft generation.
- Warn that regeneration replaces draft slots and their individual pricing adjustments.
- Treat the basemap as context, not proof of measured boundaries.

For the MVP, individual location correction is performed by editing the source row/stretch and regenerating its draft. An unrestricted CAD-style polygon editor is deferred.

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

All prices are positive whole IDR amounts. Admin actions must reject invalid values. A bulk preview identifies ineligible slots; applying the action rechecks eligibility and reports changed and skipped counts. Held and sold slots cannot be repriced. An expired and safely released slot can be repriced again.

An order stores its own price snapshot. Later price changes cannot alter an existing order. If a customer's locally selected price changes before reservation, show the revised amount and require review before payment.

Illustrative pricing example, not an actual event tariff: generate 20 slots at IDR 150,000, override A-001 to IDR 200,000, and override A-002 to IDR 175,000. The other 18 slots remain IDR 150,000.

### 5.4 Publishing and operational adjustments

- Publish only approved, valid, positively priced inventory with unique slot codes.
- Keep draft layouts private. The portal reads only the published layout.
- Before any reservation has existed, close sales to revise and republish geometry.
- After the first reservation, freeze the event's published geometry, slot identities, dimensions, numbering, and membership of the layout, even if that reservation later expires.
- Allow blocking or unblocking an available slot, with a reason and audit entry.
- Reject blocking, moving, deleting, renumbering, or regenerating a held or sold slot.
- Require a separate future layout-change workflow for physical changes after booking begins. Do not publish a replacement version over active sales in this MVP.

### 5.5 Orders and payment monitoring

- Search orders by booking reference, customer name, or business name.
- Filter by order state, payment state, route, and date.
- Show customer details, selected slots, item price snapshots, total, reservation deadline, payment reference, and latest status check.
- Show payment creation errors, overdue pending payments, and reconciliation exceptions in an attention list.
- Provide an authenticated, rate-limited payment status refresh action.
- Record the order/payment timeline and important admin changes.
- Do not offer a manual "mark paid" action or arbitrary release of pending paid-attempt inventory.

### 5.6 Basic analytics

Metrics are event-scoped and calculated from persisted records. Pending payments are not sales.

| Metric                            | Definition                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Published inventory               | Slots in the frozen/current published layout. Draft slots are excluded.                               |
| Available / held / sold / blocked | Mutually exclusive counts whose sum equals published inventory. Uncertain payment claims remain held. |
| Bookable capacity                 | Published inventory minus blocked slots.                                                              |
| Occupancy                         | Sold slots / bookable capacity. Show an empty value if capacity is zero.                              |
| Confirmed orders                  | Orders confirmed after verified successful payment and slot allocation.                               |
| Confirmed booking value           | Sum of price snapshots for confirmed orders. This is gross booking value, not profit or bank payout.  |
| Pending order value               | Total for awaiting-payment orders, shown separately from confirmed value.                             |
| Paid exceptions                   | Count and amount of verified successful payments awaiting allocation or other resolution.             |
| Sales trend                       | Confirmed order count and booking value by confirmation date.                                         |
| Route performance                 | Sold count, capacity, occupancy, and confirmed item value per route.                                  |

Show last refreshed time and refresh failure. Display event timezone explicitly. Proposed refresh cadence is 15 seconds while visible, plus refresh after relevant actions. The metrics are operational summaries, not an accounting ledger. A small sales chart and route table are enough for the MVP.

## 6. Customer portal

### Route ownership

The event landing page lives at `/`. The booking experience lives at `/booking`, which contains both the slot view and map view with one shared selection. The authenticated admin dashboard lives at `/admin`. Customers can open `/booking` directly; visiting the landing page first is optional.

Keep event promotion and general information on the landing page, with navigation into booking. Focus the upcoming portal work on `/booking` and its booking flow. Proposed follow-on routes are `/booking/checkout` for review/payment and `/booking/orders/$bookingOrderId` for private order status; these child paths are implementation proposals rather than separately confirmed requirements.

### 6.1 Event and inventory browser

Show event details, booking availability, slot dimensions, prices, and an illustrative-layout notice where applicable.

Provide two views:

- **Slot view:** a grouped, selectable grid/list with slot code, route/row, dimensions, individual price, and status. This remains usable when the map cannot load.
- **Map view:** geographic slot polygons with route labels, access gaps, status legend, zoom controls, and a slot details panel.

Both views use the same IDs, inventory response, filters, and selection. Switching views must preserve selected slots. Provide code search and route, availability, and price filters. At low zoom, use labels/details and the slot view instead of making tiny polygons the only selection control.

Statuses must be readable through text and icons as well as color. Unavailable slots can be inspected but cannot be added. Selected details show each slot's individual price; never infer a common price across a mixed selection.

### 6.2 Selection and checkout

1. Add or remove available slots in either view.
2. Review slot codes, locations, dimensions, individual prices, count, and total in one selection summary.
3. Continue to checkout and enter proposed minimum details: contact name, business name, email, and phone number.
4. Review the final server quote and submit a reservation request.
5. If every slot remains available and prices match the reviewed quote, reserve the entire selection atomically and prepare payment.
6. Open Midtrans Snap and display the server-recorded payment deadline.
7. Return to a status page that reads the server's order state until confirmation or another definitive result.

Opening checkout or selecting slots does not create a hold. Submitting the final reservation does. If any requested slot conflicts, reserve none and identify the unavailable items. Preserve the remaining selection for correction.

Checkout requirements:

- The server calculates totals; browser-submitted prices are not authoritative.
- A repeated reservation submission returns the existing result for that checkout request.
- An unchanged pending order resumes its existing payment attempt rather than creating another payable attempt.
- Closing Snap or closing a tab does not prove payment failure and does not release inventory.
- Changing the selection after reservation requires safely resolving/releasing the existing attempt before creating a replacement.
- A local countdown reaching zero shows "checking payment status" until the server resolves the attempt.

### 6.3 Order status

Display booking reference, contact/business name, event, exact slots and dimensions, item prices, total, payment state, and the next available action.

Distinguish confirmed, awaiting payment, failed, expired, cancelled, and needs-review outcomes. A browser payment callback cannot independently confirm a booking. A paid-but-unallocated exception must say that payment was received and the booking requires organizer review, rather than falsely showing success or asking for another payment.

Only the owning guest session or an authenticated admin can read private order details. A booking reference by itself is not authorization. Provide a copyable reference for contacting the organizer. Cross-device recovery and customer accounts are deferred.

## 7. Availability and payment rules

| Concept   | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| Available | Published, not blocked, and without an active claim.                 |
| Selected  | Available slot chosen locally; no exclusive ownership.               |
| Held      | Server claim exists for an order awaiting payment or reconciliation. |
| Sold      | A verified payment has confirmed the order and its claims.           |
| Blocked   | Organizer has removed otherwise unclaimed inventory from sale.       |

Reservation expiration and payment expiration must be coordinated. The system must not release a slot based solely on a browser timer or Snap page closure. Use server reconciliation, preserve uncertain claims, and expose unresolved cases to the admin. Provider-specific behavior and sources are documented in the [architecture](./architecture.md#7-payment-processing-and-reconciliation).

## 8. Required states and failure behavior

| Surface           | States to specify and demonstrate                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Admin access      | Signed out, authenticated admin, forbidden customer/guest.                                                            |
| Layout editor     | Empty, loading, saved draft, unsaved changes, generation running, invalid geometry, save conflict, published, frozen. |
| Pricing           | No selection, mixed prices, invalid value, bulk preview, applying, partial eligibility change, success, failure.      |
| Dashboard         | No sales, loading, data available, stale data, refresh failure, payment attention items.                              |
| Inventory browser | Loading, no inventory, no filter matches, available, held, sold, blocked, selected, stale availability.               |
| Map               | Loading, map/provider failure, unsupported rendering, tiny footprints; retain slot view access.                       |
| Checkout          | Missing details, quote changed, slot conflict, submitting, provider timeout, existing pending order.                  |
| Order status      | Awaiting payment, confirmed, failed, expired, cancelled, reconciliation pending, paid exception, access denied.       |

Customer selection and checkout must work at a 360 px viewport without horizontal page scrolling. Provide keyboard-operable controls, labeled form errors, visible focus, and an accessible slot list alternative to map interactions. The admin editor is desktop-first; the dashboard and order monitoring remain readable on mobile.

## 9. Out of scope

- Multi-organization billing, public organizer onboarding, or complex admin roles.
- Daily/session rentals, customer-defined frontage, or automatic booth merging.
- Demand-based pricing, vouchers, bidding, commissions, or tax calculation.
- Live production payments, automated refund initiation, or customer self-service cancellation.
- Automated emails, WhatsApp messaging, and cross-device guest recovery.
- Survey-grade mapping, routing/navigation, or automatic landowner approval.
- Unrestricted editing of already booked physical layouts.
- WebSocket infrastructure, a separate analytics platform, or accounting reports.

Refund/chargeback notifications still need an exception path even though initiating refunds is out of scope. A reversal must not automatically put a previously booked physical space back on sale.

## 10. Delivery sequence and acceptance

### Milestone 1 — Admin inventory and pricing

Deliver event setup, admin authentication, row/stretch/gap editing, slot generation, validation, bulk pricing, overrides, and publishing.

Acceptance:

- An illustrative 70 m row with sellable intervals 0–18 m, 22–40 m, and 46–70 m produces 12 + 12 + 16 = 40 slots at 1.5 m frontage.
- A 10 m approved interval produces 6 slots at 1.5 m and reports 1 m unused remainder.
- A default price, individual overrides, and bulk reset produce the documented final prices.
- Invalid/overlapping geometry and unpriced slots cannot be published.

### Milestone 2 — Customer discovery and selection

Deliver event page, slot view, map view, filters, and one shared selection summary.

Acceptance:

- Switching views preserves a mixed-price selection and its total.
- Nonadjacent slots remain explicitly identified; the UI makes no continuity claim.
- An unavailable map still permits selection through the slot view.

### Milestone 3 — Reservations and Sandbox payment

Deliver guest checkout, atomic claims, order snapshots, Midtrans integration, verified notifications, and reconciliation.

Acceptance:

- Two customers racing for the same slot produce at most one active owner.
- An overlapping multi-slot request fails entirely; it does not partially reserve inventory.
- A price change requires review before payment; an existing held order keeps its original price.
- Repeated checkout requests and repeated/out-of-order notifications do not duplicate allocation or sales.
- Payment creation timeouts and countdown expiry do not prematurely release inventory.
- Late verified payment after release creates an admin exception and never steals another customer's slot.
- Geometry changes are rejected after the first reservation, including after its eventual expiry.

### Milestone 4 — Monitoring and end-to-end demo

Deliver operational metrics, sales trend, route breakdown, orders, payment attention list, and audit timeline.

Acceptance:

- Available + held + sold + blocked equals published inventory.
- Pending and failed orders do not inflate confirmed booking value.
- Replaying a successful notification does not increase confirmed totals.
- An admin can trace a payment exception and refresh its provider status.
- Demo data and Sandbox payments are visibly identified and remain isolated from live sales.

Suggested demo size is 50–100 illustrative slots over two route groups with explicit gaps and several price overrides. This is a test fixture, not verified site capacity or a performance claim.

## 11. Decisions to resolve before implementation or live use

| Decision                                                       | Proposed direction                                                          | Needed by                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Rental period and adjacency                                    | Full event; allow separated slots                                           | Before database schema and selection rules.      |
| Guest versus customer accounts                                 | Guest for prototype; authenticated admin                                    | Before checkout and order access implementation. |
| Language and customer fields                                   | Indonesian; contact, business, email, phone                                 | Before portal forms.                             |
| Payment methods and hold duration                              | Restrict to Sandbox methods whose expiry behavior is verified               | Before payment implementation.                   |
| Demo hosting and scheduler                                     | Node-compatible HTTPS hosting with a reliable scheduled reconciliation task | Before shared payment demo.                      |
| Real dimensions, permission evidence, and physical numbering   | Field validation; illustrative geometry until then                          | Before any real sale.                            |
| Refund, cancellation, tax, fee, and organizer contact policies | Unresolved; do not invent customer promises                                 | Before live launch.                              |

## 12. Specification review

Evidence is the user's two project requests, the exported conversation, and the repository scaffold. No user research or usability test has been performed. Proposed defaults above are design judgments rather than validated operating policies.

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
