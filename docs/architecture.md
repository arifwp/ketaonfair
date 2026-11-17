# Ketaon Fair — Tech Stack and System Architecture

Date: 17 November 2026  
Status: Proposed architecture for the [MVP](./mvp.md), not an implementation report

## 1. Architecture decision

Use one full-stack TanStack Start application containing the customer portal, authenticated admin dashboard, application services, and HTTP endpoints. Store geographic inventory and transactions in Neon Postgres with PostGIS. Use Midtrans Snap Sandbox for payment.

This is a modular monolith. A separate backend service, map server, Redis deployment, and realtime service are unnecessary for the initial demo. Database transactions own allocation correctness; periodic refresh only improves how current the UI appears.

## 2. Existing repository versus planned stack

Repository observations on 17 November 2026:

- `package.json` already includes React 19, TanStack Start/Router/Query/Table, TypeScript, Vite, Nitro, Tailwind CSS, Better Auth, Zustand, and the Neon serverless driver.
- `components.json` contains shadcn configuration. This does not establish a complete component library.
- `src/db.ts` contains a Neon HTTP query helper. It does not implement booking transactions.
- `src/lib/auth.ts` enables Better Auth email/password and TanStack cookies, but has no persistent database adapter or admin authorization configuration.
- `db/init.sql` is a todo demo schema. There is no booking schema in that file.
- `vite.config.ts` uses Nitro. No hosting provider or deployed runtime has been verified for this architecture.

Installed packages and scaffold files are not proof of working integrations. Keep the repository lockfile as the version reference; check compatibility when adding the planned packages.

| Layer                            | Technology / decision                                                  | Current position and purpose                                                             |
| -------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Application                      | React + TypeScript + TanStack Start                                    | Existing scaffold; shared customer/admin application.                                    |
| Routing                          | TanStack Router                                                        | Existing; portal, admin, auth, webhook, and job routes.                                  |
| Server operations                | TanStack Start server functions and server routes                      | Existing framework; implement authenticated services and integration endpoints.          |
| Server-state cache               | TanStack Query                                                         | Existing; availability, orders, metrics, invalidation, and polling.                      |
| Client selection                 | Zustand                                                                | Existing; shared selected IDs and view state, never authoritative availability.          |
| Styling and components           | Tailwind CSS + shadcn/ui + Lucide                                      | Existing packages/config; create reusable form, table, status, and dialog components.    |
| Admin tables                     | TanStack Table                                                         | Existing; pricing, inventory, and order filtering.                                       |
| Map renderer                     | MapLibre GL JS + `react-map-gl/maplibre`                               | Add; clickable GeoJSON inventory and geographic context.                                 |
| Basemap                          | MapTiler streets; optional satellite layer                             | Proposed provider; key, local coverage, attribution, and usage limits need verification. |
| Layout drawing                   | Terra Draw + `terra-draw-maplibre-gl-adapter`                          | Add; edit source rows and approved-area geometry.                                        |
| Geometry preview                 | Focused Turf.js modules                                                | Add; row slicing, distances, and draft generation helpers.                               |
| Authoritative spatial validation | PostGIS                                                                | Enable in the chosen database; validate footprints and approved areas.                   |
| Database                         | Neon managed PostgreSQL                                                | User-selected; one store for inventory, orders, auth, and audit records.                 |
| Schema and migrations            | Drizzle ORM + Drizzle Kit                                              | Add; typed relational queries and committed migrations, with SQL for spatial operations. |
| Transaction driver               | Neon serverless `Pool`/`Client` with Drizzle's Neon serverless adapter | Driver installed; add interactive transaction path for checkout and admin mutations.     |
| Authentication                   | Existing Better Auth, persisted in Neon                                | Complete adapter, migrations, sessions, and server-assigned admin role.                  |
| Input validation                 | Zod                                                                    | Add; server-validated IDs, quotes, money, dimensions, and geometry payload limits.       |
| Payment                          | Midtrans Snap Sandbox via server-side HTTPS API calls                  | Add; token creation and status/expiry reconciliation.                                    |
| Runtime                          | Node-compatible Nitro deployment                                       | Preserve current build approach; hosting provider remains open.                          |
| Scheduled work                   | Host scheduler calling an authenticated reconciliation route           | Required for the shared demo; no dependency on browser timers.                           |
| Analytics                        | PostgreSQL aggregate queries; simple React/SVG chart                   | Build in app; no separate analytics service.                                             |
| Verification                     | Vitest + real test-branch PostgreSQL checks + Playwright               | Planned development tools for geometry, allocation, payment, and end-to-end flows.       |

MapLibre documents polygon click interactions, and Terra Draw lists its MapLibre adapter. These are rendering/drawing tools; the application still owns booth rules. [MapLibre example](https://maplibre.org/maplibre-gl-js/docs/examples/show-polygon-information-on-click/), [Terra Draw repository](https://github.com/JamesLMilner/terra-draw).

Neon supports the PostGIS extension. The proposed schema therefore does not require a separate GIS database. [Neon PostGIS documentation](https://neon.com/docs/extensions/postgis).

## 3. System boundaries

```mermaid
flowchart TB
    Customer[Customer browser: slot view, map, checkout]
    Admin[Admin browser: editor, pricing, monitoring]
    Maps[MapTiler tiles and styles]
    Scheduler[Hosting scheduler]
    Midtrans[Midtrans Sandbox]
    subgraph App[One TanStack Start / Nitro application]
        Views[React routes and shared components]
        Boundary[Server functions and HTTP routes]
        Auth[Authentication and authorization]
        Services[Layout, pricing, reservation, payment, reporting services]
    end
    DB[(Neon Postgres + PostGIS)]
    Customer --> Views
    Admin --> Views
    Customer --> Maps
    Admin --> Maps
    Views --> Boundary
    Boundary --> Auth
    Auth --> Services
    Services --> DB
    Services -->|Create payment / get status| Midtrans
    Customer -->|Snap checkout| Midtrans
    Midtrans -->|Verified webhook| Boundary
    Scheduler -->|Authenticated reconciliation call| Boundary
```

TanStack server functions handle app-internal operations. Server routes handle external HTTP entry points such as the payment webhook and scheduled jobs. Both call the same services and enforce their own authorization boundary. [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).

### Proposed code organization

Follow the repository [engineering instructions](../AGENTS.md) for naming, module boundaries, and TanStack directory-based routing. The route tree there preserves `/` for the event landing page, `/booking` for customer booking, and `/admin` for the dashboard. Create proposed child pages only when their features are implemented.

```text
src/
  routes/                  TanStack directory routes with thin page/layout modules
  components/ui/           Shared controls and status patterns
  features/
    event-landing/         Event landing page content
    event-management/      Event setup and sales lifecycle
    event-layout/          Map editor, stretches, gaps, generation
    slot-inventory/        Slot browser, map layers, feature-owned selection store
    slot-pricing/          Bulk pricing and individual overrides
    booking-checkout/      Guest details, quote review, reservation UI
    booking-orders/        Status page and admin order monitoring
    sales-analytics/       Metrics, route breakdown, sales chart
  server/
    auth/                  Session checks and admin permissions
    db/                    Drizzle schema, database clients, migrations integration
    services/              Authoritative application operations
    payments/              Midtrans API adapter and status mapping
    jobs/                  Bounded reconciliation work
  shared/                  Schemas, DTOs, money and geometry types
db/
  migrations/              Application and auth migrations
  seeds/                   Explicitly illustrative demo fixture
```

This tree is a proposed destination. Do not treat it as files already present. Server modules must not be imported into browser bundles.

## 4. GIS and layout architecture

### Data and coordinate conventions

- Exchange map geometry as GeoJSON in WGS84 longitude/latitude order.
- Store rows as PostGIS lines and approved footprints/slots as PostGIS polygons with SRID 4326.
- Store frontage start/end distances and dimensions separately as exact integer millimeters. Convert to meters for display and geometry routines.
- Record whether dimensions are illustrative or field-measured. Coordinates alone cannot establish measurement accuracy.
- Give each row a fixed direction and an explicit footprint side. Map rotation never changes numbering or depth direction.
- Use a suitable local metric projection for footprint construction and area operations; choose it after confirming the event location. Use geography/geodesic measurement where appropriate. Never interpret longitude/latitude differences as meters.

### Draft generation pipeline

1. Admin edits source rows, approved intervals, footprint boundaries, dimensions, and exclusions.
2. Client previews valid uninterrupted intervals with Turf; `lineSliceAlong` is suitable for extracting distance-based row segments. [Turf reference](https://turfjs.org/docs/api/lineSliceAlong).
3. Subtract exclusion intervals before allocating slot frontage. Use integer lengths for whole-slot count and remainder to avoid floating-point count errors.
4. Construct each slot footprint from its frontage segment and depth. Split difficult corners into separate stretches rather than allowing self-intersections.
5. Send source parameters and expected draft revision to the server. The server recomputes canonical slot geometry and price defaults; it does not trust client polygons or totals.
6. Validate positive dimensions, interval bounds, approval, exclusion avoidance, polygon validity, containment, and overlap. Shared boundaries are allowed; positive-area interior overlap is not.
7. Save a complete generation atomically. Reject stale revisions instead of overwriting another admin edit.
8. Publish only after validation. Draft regeneration retires/replaces draft slot records and warns about discarded overrides.

Use PostGIS validity, coverage, and spatial-intersection operations through parameterized SQL. Apply an explicit metric tolerance chosen and tested for the local layout; do not silently tolerate overlapping space. Add GiST indexes to spatial columns used in validation.

### Publication and identity

Allow one active published layout per event. Publishing locks the event record and checks there has been no reservation. Checkout takes the same event lock before checking layout revision and setting `booking_started_at`.

Once `booking_started_at` is set, all geometry, codes, dimensions, slot membership, and layout replacement are frozen for that event. This intentionally limits post-sale editing in the MVP and prevents duplicated inventory across layout versions. Draft versions remain useful before sales and for future events, not for bypassing the freeze.

Blocking and pricing remain independent operations on unclaimed inventory. Event default pricing is a generation template; generated base prices and per-slot overrides follow the [MVP pricing rules](./mvp.md#53-pricing-and-price-generation).

## 5. Conceptual database schema

| Record                | Important fields and responsibility                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth tables    | Persisted user, session, account, and verification records managed through reviewed migrations.                                                                  |
| Admin role assignment | Server-provisioned role tied to the auth user; no public admin signup or client-editable role.                                                                   |
| `events`              | ID, slug, name, dates, timezone, booking window, sales state, default price/dimensions, active layout ID, `booking_started_at`.                                  |
| `layout_versions`     | Event ID, version, draft/published/retired state, revision, approval metadata, published time.                                                                   |
| `routes`              | Layout ID, name, display order; organizational grouping.                                                                                                         |
| `booth_rows`          | Route ID, line geometry, fixed direction, footprint side, label.                                                                                                 |
| `approved_stretches`  | Row ID, start/end mm, frontage/depth mm, approved polygon, approval state and note.                                                                              |
| `exclusions`          | Row ID, start/end mm, reason, optional polygon for physical obstruction checks.                                                                                  |
| `slots`               | Stable ID, event/layout/stretch IDs, code, interval, dimensions, polygon, base price, nullable override, blocked flag/reason, revision.                          |
| `guest_sessions`      | Hashed private token, expiry, session metadata; authorizes guest order access.                                                                                   |
| `orders`              | Event ID, guest session ID, reference, customer snapshot, state, total IDR, checkout idempotency key, confirmed time.                                            |
| `order_items`         | Order/slot IDs plus immutable code, route, dimensions, footprint, and unit price snapshots.                                                                      |
| `reservations`        | Order ID, server deadline, reconciliation state, finalized/released timestamps.                                                                                  |
| `slot_claims`         | Reservation/slot IDs, held/sold state, nullable release time; durable exclusive ownership.                                                                       |
| `payment_attempts`    | Order ID, unique provider order ID, provider transaction ID, creation state, raw provider status, normalized status, token reference, deadline, next check time. |
| `payment_events`      | Attempt ID, deduplication key, received time, sanitized event/status evidence, processing result.                                                                |
| `audit_logs`          | Actor, event/entity IDs, operation, previous/new values, timestamp, request correlation ID.                                                                      |

### Database invariants

- All slot codes are unique within a layout; all provider order IDs are unique.
- One logical checkout idempotency key per guest session yields one order. Reusing it with a different payload is a conflict.
- A partial unique index on `slot_claims(slot_id)` where `released_at IS NULL` prevents more than one active claim, including sold claims.
- Released claims remain as history. Sold claims are not released by ordinary expiry cleanup.
- Positive price and dimension checks are enforced in the database as well as the server.
- Store whole IDR amounts as integers, never floating-point currency. Enforce a supported upper bound so API number serialization remains exact.
- Store timestamps as `timestamptz`; render using the event timezone, proposed `Asia/Jakarta` for the demo.
- Foreign keys and event/layout consistency checks prevent cross-event orders or references to another event's slots. Use composite keys where necessary, not UI filters alone.
- Availability is derived from publication, blocking, and active claims. Do not maintain a second independently writable `slots.status` cache.

An available slot is published, not blocked, and has no active claim. A held slot has a held claim, including unresolved payment cases. A sold slot has a sold claim. Block mutations require no active claim, so the four displayed states remain mutually exclusive.

## 6. Reservation and pricing transactions

### Database transport

Use an interactive transaction for operations that lock rows, inspect results, and conditionally write related records. The existing HTTP helper cannot be used as unrelated HTTP `BEGIN`, query, and `COMMIT` requests. Neon documents HTTP for single/non-interactive transactions and `Pool`/`Client` over WebSockets for interactive transactions. [Neon driver documentation](https://neon.com/docs/serverless/serverless-driver).

Use Drizzle's Neon serverless integration for this transaction path, with parameterized SQL for PostGIS and locking where needed. Scope connection acquisition/release to the hosting runtime and avoid keeping transactions open across network calls. [Drizzle Neon integration](https://orm.drizzle.team/docs/get-started/neon-new).

### Reservation flow

1. Validate the guest session, unique slot IDs, one-event constraint, contact fields, and request idempotency key.
2. Begin a short database transaction. Lock the event first, then selected slots in stable ID order. Related mutations use the same lock ordering.
3. Check event sales/booking window, published layout/revision, blocked flags, and existing claims. An overdue claim is still owned until safely reconciled.
4. Resolve effective prices and compare slot revisions/prices with the quote the customer reviewed. Return a quote conflict without creating an order if they changed.
5. Insert the order, immutable items, reservation, held claims, and a payment-attempt intent with a unique provider order ID. Set `booking_started_at`.
6. Commit everything together. Any unavailable slot or constraint conflict rolls back the whole selection.
7. Create the Midtrans transaction outside the database transaction. Persist the token/result separately while ownership remains held.

The database uniqueness rule is the final guard even if another application path fails to lock correctly. Retry only bounded, safe deadlock/serialization conflicts with the same idempotency key.

### Pricing and blocking flow

Lock the event and target slots in the same order. Recheck claims and revisions inside the transaction. Update only eligible slots and record audit entries. Bulk application returns precise changed/skipped IDs and reasons; a preview does not guarantee later eligibility.

Price snapshots are set when the reservation is created. A change to the event template never updates existing slot bases automatically. Held/sold slots reject base/override changes, and all earlier order snapshots remain unchanged after release or sale.

## 7. Payment processing and reconciliation

### Integration boundary

The server creates a Snap transaction with the recorded amount, stable item snapshots, unique provider order ID, allowed methods, and agreed expiry configuration. The browser receives only the scoped Snap token/redirect information. Keep the server key private. Snap creation and notification URLs must use the same Sandbox environment. [Midtrans integration guide](https://docs.midtrans.com/docs/snap-snap-integration-guide).

### Webhook handler

1. Validate the incoming payload and apply request size limits.
2. Verify the standard Snap notification signature using the exact supplied `order_id`, `status_code`, and `gross_amount` strings plus the private server key. Compare the SHA-512 digest safely.
3. Query provider status for authoritative processing, then compare the attempt, amount, currency, and environment with stored expectations.
4. Persist evidence and apply the transition in a short transaction using the common lock order. Confirm only if the order still owns every required claim.
5. Deduplicate processing and never regress a confirmed order to pending because of a delayed notification. Acknowledge only after processing or durable recording; failed work remains retryable.

Signature verification, provider status verification, and handling delayed notifications are covered by [Midtrans webhook documentation](https://docs.midtrans.com/docs/https-notification-webhooks). Browser callbacks only trigger a server refresh.

### Internal state mapping

Keep raw provider status, normalized payment state, order state, and claim state separate.

| Provider outcome                                         | Proposed application treatment                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pending`                                                | Payment pending; order awaits payment; claims remain held.                                                                            |
| `settlement`, or accepted card `capture`                 | Verified successful payment; confirm the order and convert all its claims to sold atomically. Honor fraud-status checks when present. |
| Definitive `deny`, `cancel`, or `expire`                 | Record the terminal failed/cancelled/expired result; release claims only after the attempt is safely terminal.                        |
| Unknown, challenged, inconsistent, or unavailable status | Needs review; retain claims and schedule another check.                                                                               |
| Refund, partial refund, chargeback, or other reversal    | Record the event and flag review; do not automatically resell the physical space.                                                     |

Releasing claims requires establishing that the complete checkout session and all related payment instruments can no longer accept payment. A failed method that still permits another attempt within Snap is insufficient. A verified rejection before any payable session was created can release its claims; ambiguous creation results cannot.

Provider statuses can change beyond initial success, so keep transition rules explicit rather than assigning a simplistic numeric status rank. [Midtrans transaction status cycle](https://docs.midtrans.com/docs/transaction-status-cycle).

### Expiry and uncertain creation

Snap page expiration is distinct from payment-method expiration. Configure the intended page/payment deadline, verify the chosen methods in Sandbox, and never release inventory merely because the page countdown elapsed. [Midtrans expiry reference](https://docs.midtrans.com/reference/expire-a-snap-session).

If token creation times out, the result is unknown: an external transaction may exist even if the application received no response. Keep the same provider order ID and claims, record `creation_unknown`, and reconcile. Do not blindly create another payable attempt.

A missing status response alone is not proof that no Snap session or payable instrument can exist. Retain uncertain claims until a documented, tested recovery path establishes the old session/attempt cannot accept payment. This deliberately favors inventory safety over rapid release; the admin attention list exposes the operational cost.

### Scheduled reconciliation

- Proposed cadence: every minute, process a bounded batch of due/uncertain attempts with retry backoff.
- Claim work with a database lease so overlapping job calls do not both process the same attempt.
- Make provider calls outside database locks, then re-lock and revalidate before applying results.
- Recheck pending orders, expired-looking holds, unknown creation results, and unprocessed durable payment events.
- Release only after a definitive safe outcome. Retain and flag uncertainty instead of guessing.
- Reuse the same reconciliation service for the admin refresh action and server-side order refresh.
- Record job heartbeat, last provider check, next retry, and actionable error details.

The job uses the authenticated server-to-server status endpoint. [Midtrans status API](https://docs.midtrans.com/reference/get-transaction-status).

### Late success after release

If a verified payment arrives after its original claims were released, create a paid exception and notify the admin through the attention list. Do not take slots from a newer order, automatically allocate alternatives, or count the original booking as confirmed. Resolution requires an explicit organizer policy outside this MVP.

## 8. Proposed application interfaces

### Page routes

| Path                              | Responsibility                                                                                        | Decision status                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/`                               | Event landing page with event information and entry into booking.                                     | Confirmed by the user.                                                      |
| `/booking`                        | Customer inventory browser containing slot and map views and shared selection. Supports direct entry. | Confirmed by the user; upcoming portal implementation starts here.          |
| `/booking/checkout`               | Customer details, quote review, reservation, and payment.                                             | Proposed child route.                                                       |
| `/booking/orders/$bookingOrderId` | Private guest-owned order/payment status. The path ID alone grants no access.                         | Proposed child route.                                                       |
| `/admin`                          | Authenticated organizer dashboard for slot management, pricing, analytics, and monitoring.            | Confirmed by the user; specific child routes remain implementation details. |

The `/booking` route owns the two inventory views; switching between them does not navigate to the event landing page or create a separate cart. Landing-page work and booking implementation have separate route ownership.

### Server boundaries

These are conceptual operations to implement, not existing endpoints.

| Boundary                     | Operations                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Public server functions      | Event details, published inventory, read-only quote.                                                                                      |
| Guest-owned server functions | Reserve selection, resume payment, read order, request bounded status refresh.                                                            |
| Admin server functions       | Event setup, save draft, generate, validate, publish, price update, block/unblock, metrics, order search/details, reconciliation request. |
| Existing auth route          | `/api/auth/*`, completed with persistence and role checks.                                                                                |
| External webhook             | Proposed `POST /api/payments/midtrans/notification`; provider-authenticated, not cookie-authenticated.                                    |
| Scheduled job                | Proposed `POST /api/jobs/reconcile-payments`; private scheduler credential.                                                               |

Every admin function checks the server session and role. Every guest-owned operation checks the guest token/session, not just a reference or guessed order ID. A webhook uses its provider verification path, not an admin session.

## 9. Frontend data flow

- The `/booking` route loads event identity and published layout metadata independently of `/`. Load map/editor code on the client to avoid browser-only map APIs during SSR.
- TanStack Query fetches inventory, orders, and metrics through server boundaries. Use event/layout/revision in query keys and invalidate after relevant mutations.
- Zustand stores only selected IDs, selected view, and editor-local state. Derive displayed prices and statuses from current query results.
- Slot view and map consume one inventory dataset and selection store. Never run independent carts for the two views.
- Proposed visible-page refresh: inventory and dashboard every 15 seconds, owned pending order every 5 seconds with backoff. Provider requests remain server-throttled; browser polling does not query Midtrans directly.
- Label stale data and show last refreshed time. Revalidate every checkout regardless of polling freshness.
- Use GeoJSON fill/line layers rather than one React DOM marker per slot. Highlight selected features and synchronize focus with the accessible list.
- On map failure, retain the slot browser. Map tiles and styles are display dependencies, not booking authorities.
- Cache static assets and approved geometry by revision where appropriate. Private orders, checkout, mutable inventory, and admin metrics must not be shared-cached across users or served as prerendered data.

## 10. Reporting and monitoring

Calculate metrics from the same event-scoped claim/order data used for checkout. Inventory cards use one consistent database snapshot. Route value uses order-item snapshots rather than today's slot prices. Daily sales use `confirmed_at` in the event timezone. Do not join payment attempts in a way that counts an order multiple times.

Use structured, redacted application logs with request, order, attempt, and job correlation IDs. The dashboard attention list covers stale pending attempts, unknown creation outcomes, paid exceptions, and failed reconciliation. Track the scheduler heartbeat; an absent job is a visible fault, not an implied successful cleanup.

Audit publishing, price changes, overrides, blocking, and admin reconciliation requests. Keep operational analytics separate from provider payouts, net revenue, and accounting.

## 11. Security and configuration

| Configuration                                          | Exposure                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `DATABASE_URL`                                         | Server only; pooled application connection.                           |
| Migration connection/configuration                     | Server/developer only; separate migration execution from app startup. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                | Secret is server only; origin configured per environment.             |
| `MIDTRANS_SERVER_KEY`, environment selector            | Server only. Sandbox in the demo.                                     |
| Midtrans client key, if required by selected Snap mode | Public key only; never substitute the server key.                     |
| MapTiler browser key                                   | Public by necessity; restrict permitted origins and usage.            |
| Reconciliation job credential                          | Server/hosting scheduler only.                                        |

Use secure, HttpOnly guest/admin cookies and appropriate SameSite settings. Store guest access tokens hashed at rest. Protect cookie-authenticated mutations against cross-site requests. Rate-limit checkout and payment-refresh operations. Limit slot counts and geometry payload sizes. Public inventory responses contain no customer contacts, auth details, reservation-owner identifiers, or payment tokens.

Parameterize SQL, including spatial SQL. Redact payment secrets and unnecessary personal information from logs and notification evidence. A payment reference or public booking code is not an authorization credential.

## 12. Environments and deployment

| Environment       | Database / payment                                              | Purpose                                                                            |
| ----------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Local development | Isolated development database branch, Sandbox                   | Build and test, including a public tunnel only when testing webhooks.              |
| Shared demo       | Dedicated demo database branch, Sandbox, illustrative inventory | Reviewer-accessible portal/admin and public webhook.                               |
| Live              | Separately configured live database/payment credentials         | Deferred until measurement, operating policy, and payment acceptance are resolved. |

Keep the existing Nitro Node build as the baseline. Choose a host that supports the installed runtime, HTTPS, webhook reachability, environment secrets, database connectivity, and reliable scheduled calls. Vercel remains an alternative from the original conversation, subject to its adapter and scheduler constraints; it is not a verified deployment decision.

Do not use an in-process timer as the only cleanup mechanism on a host that can restart or suspend. Do not run schema migrations or reset demo data automatically on ordinary requests. Review migrations on an isolated branch before applying them to a shared environment.

Basemap account setup, tile coverage at the actual site, provider attribution, hosting configuration, and scheduler setup remain unverified external dependencies. Exact costs and hosting limits are outside this architecture decision.

## 13. Decision records

Evidence for these choices is the user brief and local scaffold. No comparable product screens or user testing were used. These are engineering/product judgments with the following trade-offs.

| Decision             | Alternatives considered                                          | Choice, reason, and trade-off                                                                                        |
| -------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend boundary     | Separate API service / full-stack Start app                      | One app reduces integration work and fits the requested stack; UI and backend share deployment.                      |
| GIS stack            | Custom GIS editor / MapLibre with drawing and geometry libraries | Compose existing tools; the project must still implement frontage rules and validation.                              |
| Pricing model        | Rule engine / default plus explicit slot prices                  | Stored base plus optional override fits mostly uniform prices; default changes require an explicit bulk application. |
| Customer identity    | Mandatory account / guest session                                | Guest is proposed for demo speed; cross-device recovery is deferred and private session access must be implemented.  |
| Availability updates | Push realtime / periodic refresh                                 | Polling is enough for the initial demo; visible availability may lag, so reservation remains authoritative.          |
| Post-sale layout     | Migrate active versions / freeze geometry                        | Freeze after the first reservation; safer and simpler, but physical changes require a later workflow.                |
| Infrastructure       | Separate job worker and queue / bounded scheduled server work    | Use a scheduled service in the same app; unresolved work remains durable in Postgres.                                |

Confidence is high that one full-stack application fits this prototype. Confidence in site accuracy, actual payment expiry settings, and operating policies remains unverified until field/provider tests and organizer decisions.

## 14. Implementation verification plan

- Unit-check integer interval subtraction, slot counts/remainders, effective pricing, and state transition rules.
- Exercise PostGIS validity/containment/collision checks against representative corners and access gaps.
- Run concurrent allocation tests against real PostgreSQL on an isolated test branch; assert the active-claim unique constraint and all-or-nothing selection behavior.
- Race price/block/publish changes against reservation, including stale revisions and deterministic locking.
- Test duplicate checkout, provider creation timeouts, replayed and out-of-order notifications, incorrect signatures/amounts, missed webhooks, and overlapping reconciliation jobs.
- Use Sandbox end-to-end tests to establish actual expiry behavior for each enabled payment method and the release path for unused Snap sessions.
- Verify private order authorization, forbidden admin access, protected jobs, and absence of secrets/PII in public GeoJSON and logs.
- Verify both inventory views, mixed-price checkout, map failure fallback, mobile checkout, dashboard totals, and the illustrative-data labels.
- Run the repository build, lint, type checking, and focused tests once corresponding code exists. This documentation task does not establish that those implementation checks pass.
