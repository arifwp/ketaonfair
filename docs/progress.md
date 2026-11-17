# Prototype Progress Tracker

Last reviewed: 17 November 2026, Asia/Jakarta  
Scope: Customer booking flow first, admin dashboard second, payment integration later  
Requirements: [MVP](./mvp.md) · [Architecture](./architecture.md) · [Engineering instructions](../AGENTS.md)

## Current record

**Total prototype completion: 14.00%.**

| Area                               | Share of prototype | Area completion | Contribution to total       |
| ---------------------------------- | ------------------ | --------------- | --------------------------- |
| Foundation and brand configuration | 5%                 | 100.00%         | 5.00 percentage points      |
| Customer booking flow              | 52%                | 17.31%          | 9.00 percentage points      |
| Admin dashboard and management     | 39%                | 0.00%           | 0.00 percentage points      |
| Integrated demo verification       | 4%                 | 0.00%           | 0.00 percentage points      |
| **Total prototype**                | **100%**           | **14.00%**      | **14.00 percentage points** |

Planning artifacts have been written: MVP, architecture, engineering instructions, primary-color direction, and this tracker. Documentation and installed dependencies do not count as completed booking/admin functionality.

Current evidence: F01 checks and B01 database foundation are verified. Reviewed Drizzle migrations, 60 published illustrative slots, typed inventory/quote reads, and PostgreSQL constraint/spatial/snapshot checks run on an isolated Neon branch. The todo helper/schema are removed. The source still contains the starter `/` page and auth HTTP handler, with no `/booking` or `/admin` page. Better Auth persistence/admin roles and map integration remain unimplemented. See [verification evidence](./booking-foundation-verification.md).

**Next task: B02 and B04 — implement the `/booking` slot browser and shared selection/filtering using the database inventory contract.** Configure an isolated application development target, preserve `/` as the landing page, and implement honest loading/empty/error states and mobile/keyboard behavior. B03 map configuration follows without blocking slot browsing. Payment integration stays deferred.

Confirmed customer access: checkout and slot booking require no customer login or account creation. Establish a private guest session automatically for booking ownership; admin authentication remains separate. This decision does not complete an implementation gate.

Confirmed event scope: one fixed event, with no event creation/switching UI. B01 retains the architecture's `events` storage for booking settings; a singleton settings relation is a possible simplification, not a prerequisite for the slot browser or evidence of multi-event product scope.

Confirmed booking controls: admins must be able to set/change booking opening and closing dates/times in the dashboard. B01 persists these settings and checks the schedule in quote reads. A02 admin UI/mutations and B06 reservation-time enforcement remain unimplemented; these confirmations add no completed gates.

## How percentages work

- Every feature below has four explicit acceptance gates. Each completed gate contributes 25% to that feature: `completion = completed gates / 4 × 100`.
- Check a gate only when its stated scope is implemented and supported by the named evidence. UI behavior needs a working flow, and critical invariants need meaningful checks. A package installation, a design proposal, or a claim that code should work is insufficient.
- Configuration-only gates can be verified by inspecting their owning files. That does not establish runtime behavior; broader runtime checks are separate gates.
- Weights are initial planning allocations, not measured hours or delivery-date estimates. They sum to 100. Change them only when scope changes, record why, and recalculate previous/current totals consistently.
- `Total completion = Σ(feature weight × feature completion) / 100`.
- `Area completion = Σ(area feature weight × feature completion) / Σ(area feature weight)`.
- Current calculation: `(4 × 100 + 1 × 100 + 9 × 100 + all remaining weights × 0) / 100 = 14.00%`.
- Deferred work has a displayed percentage for visibility but no weight in the prototype denominator. Completing the prototype does not imply payment readiness or production readiness.
- Status labels: **Not started**, **In progress**, **Blocked**, **Complete**, or **Deferred**. Do not call a feature complete before all four gates pass. Record blockers without inventing progress.

## Feature completion register

| ID        | Priority / area       | Feature                                                          | Weight   | Completed gates | Completion | Status          |
| --------- | --------------------- | ---------------------------------------------------------------- | -------- | --------------- | ---------- | --------------- |
| F01       | Foundation            | Framework, routing/query foundation, and development checks      | 4%       | 4/4             | 100%       | Complete        |
| F02       | Foundation            | Primary brand token configuration                                | 1%       | 4/4             | 100%       | Complete        |
| B01       | P1 — Booking          | Booking schema, migrations, and illustrative published inventory | 9%       | 4/4             | 100%       | Complete        |
| B02       | P1 — Booking          | `/booking` route and slot browser                                | 8%       | 0/4             | 0%         | Not started     |
| B03       | P1 — Booking          | Street/satellite map, slot overlays, zoom and focus              | 9%       | 0/4             | 0%         | Not started     |
| B04       | P1 — Booking          | Shared multi-slot selection, filters, and total                  | 6%       | 0/4             | 0%         | Not started     |
| B05       | P1 — Booking          | Checkout details and authoritative quote review                  | 6%       | 0/4             | 0%         | Not started     |
| B06       | P1 — Booking          | Atomic reservations, idempotency, and guest ownership            | 10%      | 0/4             | 0%         | Not started     |
| B07       | P1 — Booking          | Private booking result and lost-response recovery                | 4%       | 0/4             | 0%         | Not started     |
| A01       | P2 — Admin            | Persistent admin authentication and `/admin` shell               | 6%       | 0/4             | 0%         | Not started     |
| A02       | P2 — Admin            | Event setup and booking window controls                          | 4%       | 0/4             | 0%         | Not started     |
| A03       | P2 — Admin            | Draft map editor, approved stretches, and access gaps            | 7%       | 0/4             | 0%         | Not started     |
| A04       | P2 — Admin            | Slot generation, mixed sizes, and safe reflow                    | 6%       | 0/4             | 0%         | Not started     |
| A05       | P2 — Admin            | Default, bulk, and individual slot pricing                       | 5%       | 0/4             | 0%         | Not started     |
| A06       | P2 — Admin            | Publishing, layout freeze, and slot blocking                     | 4%       | 0/4             | 0%         | Not started     |
| A07       | P2 — Admin            | Booking monitoring, cancellation, and audit history              | 4%       | 0/4             | 0%         | Not started     |
| A08       | P2 — Admin            | Reservation analytics and operational refresh state              | 3%       | 0/4             | 0%         | Not started     |
| Q01       | P3 — Verification     | Integrated customer/admin demo and handoff                       | 4%       | 0/4             | 0%         | Not started     |
| **Total** | **Current prototype** | **Weighted completion**                                          | **100%** | **12/72**       | **14.00%** | **In progress** |

The unweighted gate count is shown for auditability, not used as the overall percentage. B01 is complete at the database-foundation level; B02–A08 remain at 0%. The 14% total does not imply a working booking journey or deployed prototype.

## Execution order

1. **Prepare the smallest booking foundation.** Finish essential F01 tooling as work requires it, implement B01, and provide a clearly illustrative mixed-size/mixed-price event fixture. Use confirmed guest checkout without customer login; record the reservation-lifecycle choice before implementing it. Keep credentials out of fixtures.
2. **Make `/booking` usable.** Implement B02 and B04, then B03: slot browser, shared selection/filtering, street/satellite map, overlay persistence, and close zoom. A map-provider dependency should not stop the accessible slot browser from progressing.
3. **Complete the persisted reservation journey.** Implement B05–B07, including atomic allocation, quote changes, duplicate/timeout recovery, guest ownership, and the explicit no-payment result. Add critical behavior checks with these features rather than postponing all testing.
4. **Build the admin shell and configuration.** Implement A01–A02. Keep sign-in outside any already-authenticated layout to avoid redirect loops.
5. **Build inventory authoring and pricing.** Implement A03–A06: draft editing, gaps, generation, individual size/price overrides, validation, publishing, and post-reservation restrictions.
6. **Complete admin operations.** Implement A07–A08 using the same persisted bookings as the portal. Use reservation/quoted-value terminology and the proposed audited cancellation workflow, not paid-sales states.
7. **Verify the whole prototype.** Complete Q01 with two-session allocation checks, mobile/keyboard flows, admin authorization, cancellation races, map failure fallback, and isolated demo setup. Only then revisit payment integration.

No delivery dates are assumed. Start the next dependent task once its prerequisites are met; dependencies below are implementation order, not evidence that work is already complete.

## Acceptance gates and evidence

### F01 — Framework and development foundation

- [x] React, TanStack Start, and strict TypeScript are configured. Evidence: [package.json](../package.json), [tsconfig.json](../tsconfig.json).
- [x] Router and SSR Query integration are wired with a new QueryClient created by the context factory. Evidence: [router.tsx](../src/router.tsx), [root-provider.tsx](../src/integrations/tanstack-query/root-provider.tsx). This is a source-level check, not a runtime isolation test.
- [x] Lint, typecheck, and build pass for the implementation baseline. Evidence: `npm run lint`, `npm exec tsc -- --noEmit`, and `npm run build` passed on 17 November 2026; upstream bundler warnings remain. See [verification](./booking-foundation-verification.md).
- [x] Focused test scripts/configuration and repeatable developer setup are implemented and demonstrated. Evidence: [package.json](../package.json), [README](../README.md), [Vitest config](../vitest.config.ts), [integration config](../vitest.integration.config.ts), and [CI checks](../.github/workflows/checks.yml). `npm test` passed 3 tests and `npm run test:integration` passed 10 tests. GitHub CI execution is not claimed.

### F02 — Primary brand token configuration

- [x] Canonical `--brand-primary` is `#047857`. Evidence: [styles.css](../src/styles.css).
- [x] Light/dark primary, sidebar-primary, and focus tokens consume the canonical token. Evidence: [styles.css](../src/styles.css).
- [x] White primary foreground passes the calculated 4.5:1 threshold; measured contrast is 5.48:1 for these two solid colors. This does not certify complete component accessibility.
- [x] Brand usage is recorded in [DESIGN.md](../DESIGN.md) and [AGENTS.md](../AGENTS.md).

### B01 — Booking schema and demo inventory

Prerequisite: existing foundation; decisions in the MVP remain visible as proposed until selected for implementation.

- [x] Reviewed migrations define required event/layout/slot, guest-session, booking/item, reservation/claim, and audit records with no payment tables. Evidence: [schema](../src/server/db/schema.ts), [relational migration](../db/migrations/0001_booking-foundation.sql), and [spatial/snapshot guards](../db/migrations/0002_booking-spatial-and-snapshot-guards.sql). `npm exec drizzle-kit -- check` passed.
- [x] Required constraints, active-claim uniqueness, and spatial validation are applied and inspected on isolated Neon branch `br-broad-shape-b3uilbrj`. Evidence: [PostgreSQL integration tests](../tests/integration/booking-foundation.test.ts) and [verification](./booking-foundation-verification.md). The concurrent claim check proves the database constraint, not B06 service behavior.
- [x] An explicit seed provides 60 published illustrative slots, 2 route groups, access gaps, mixed sizes including 1.2 m/2.1 m, and independent price overrides. Evidence: [insert-only seed](../db/seeds/illustrative-booking-inventory.ts); repeated execution preserves existing data.
- [x] Typed inventory reads and immutable quote/item data come from the database with focused verification. Evidence: [inventory service](../src/server/services/published-booking-inventory.server.ts), [quote service](../src/server/services/booking-quote.server.ts), and [integration tests](../tests/integration/booking-foundation.test.ts). The obsolete todo helper/schema were removed. RPC wrappers await route/HTTP verification in B02/B05.

### B02 — Booking route and slot browser

Prerequisite: B01 provides inventory; static component work can proceed before database wiring, but gates require the stated behavior.

- [ ] Thin TanStack directory routes provide direct `/booking` access and keep `/` as the landing route.
- [ ] Slot view displays published codes, dimensions, individual prices, and available/reserved/blocked state from the inventory contract.
- [ ] Loading, empty, unavailable, and request-error states work without fake-success fallback.
- [ ] The browser is keyboard-operable and usable at 360 px width with focused behavior verification.

### B03 — Map, satellite, and zoom

Prerequisite: B01 inventory and B02 route; provider configuration/coverage must be verified.

- [ ] Street/satellite switching works with attribution and retains slot/exclusion overlays and the viewport.
- [ ] Slot inspection and selection are synchronized with B04; photography retains readable boundaries and status indicators.
- [ ] Zoom, scale, fit-available, and focus-slot controls work for mixed small footprints on desktop/mobile; validate the proposed display maximum of 24 against source metadata.
- [ ] Map/style errors preserve selection and allow street retry or slot-view fallback; refresh does not reset the camera.

### B04 — Shared selection and filters

Prerequisite: B02; verify the map-switch portion when B03 is ready.

- [ ] One feature-owned selection is shared across slot/map views and identifies slots by stable ID.
- [ ] Code search and route/availability/price filters work without losing the existing selection.
- [ ] Add/remove actions and summaries show each slot's dimensions, price, and exact IDR total; no implicit adjacency or size-based repricing.
- [ ] Unavailable/stale selection, view switching, empty results, and selection changes have focused checks.

### B05 — Checkout details and quote review

Prerequisite: B01 and B04; test successful submission once B06 is ready.

- [ ] Checkout collects and validates the agreed minimum customer/business details with accessible errors.
- [ ] Server-authoritative review shows exact selected slots, actual dimensions, price snapshots, and total.
- [ ] Quote/revision changes require review; conflicts retain a correctable selection instead of partially proceeding.
- [ ] Submit/pending/error UI works on mobile and keyboard, uses a stable submission key, and contains no payment form or countdown.

### B06 — Atomic reservations and private ownership

Prerequisite: B01 and B05 contracts.

- [ ] One transaction validates the event/quote and creates the booking, immutable items, and every claim, or none.
- [ ] Two-session and overlapping-selection tests against PostgreSQL demonstrate one owner per slot and all-or-nothing allocation.
- [ ] Idempotency and timeout recovery return the same booking; changed payloads cannot reuse the submission key silently.
- [ ] Guest ownership is enforced server-side; reservations are explicitly unpaid/not integrated, with the documented prototype lifecycle and no provider call.

### B07 — Private result and recovery

Prerequisite: B06.

- [ ] A persisted booking returns a private status page and copyable reference with actual dimensions/prices.
- [ ] Reserved/cancelled, loading/read-error, and access-denied states are shown correctly, with "No payment collected" explicit.
- [ ] Refresh or a lost submission response recovers the existing booking without duplication or accidental cancellation.
- [ ] Private details are inaccessible through another guest's guessed ID/reference, and cancel-state refresh is verified when A07 is ready.

### A01 — Admin authentication and shell

Prerequisite: B01 schema conventions; this is the first admin implementation task after the booking slice.

- [ ] Better Auth sessions are persistent, with reviewed migrations and server-provisioned admin roles.
- [ ] `/admin` shell/navigation works with an accessible sign-in route and no authentication loop.
- [ ] Private admin server operations check session, role, and resource access independently of the route guard.
- [ ] Signed-out, guest/non-admin, expired-session, and valid-admin behavior is verified; identity changes clear private client state.

### A02 — Event setup

Prerequisite: A01.

- [ ] The fixed event's settings and map context can be edited and persisted, including admin-configurable booking opening/closing dates and times displayed in the event timezone. No event creation or switching UI.
- [ ] Default dimensions and price validate correctly and act as templates, without silently modifying existing inventory.
- [ ] Opening/closing bookings is authoritative on the server: automatically accept from the saved opening instant until the closing instant, respecting manual closure and subsequent admin schedule changes. Closing does not cancel existing reservations.
- [ ] Invalid input, stale update, unauthorized access, and persistence failures are verified with recoverable UI.

### A03 — Draft layout editor

Prerequisite: A01–A02 and map foundations from B03.

- [ ] Routes, directed rows, approved stretches, and access gaps are editable and saveable.
- [ ] Street/satellite and close-zoom controls preserve source geometry and unsaved edits.
- [ ] Draft revision conflicts, unsaved-navigation warning, and save failures behave explicitly.
- [ ] Server validation rejects unapproved, invalid, or overlapping geometry and preserves exclusions.

### A04 — Generation and mixed-size overrides

Prerequisite: A03.

- [ ] Uniform generation respects gaps and reports exact unused remainder; the documented 70 m example yields 40 slots.
- [ ] Per-slot frontage/depth overrides and clear/reset actions validate and atomically reflow affected intervals.
- [ ] The six-slot mixed-width 10 m example uses 9.3 m and leaves 0.7 m while preserving targeted IDs/codes and prices.
- [ ] Overflow/collision rollback and destructive full-regeneration preview are demonstrated; no silent slot deletion or shrinking.

### A05 — Slot pricing

Prerequisite: A01 and generated inventory from A04.

- [ ] Generation copies the default into slot base prices and supports independent individual price overrides.
- [ ] Filtered/selected bulk price actions show a precise target preview and report changed/skipped items.
- [ ] Clear-override and explicit reset-to-current-default preserve the documented semantics; resizing never automatically reprices.
- [ ] Reserved-slot edits are rejected and existing booking snapshots remain unchanged under update/cancellation tests.

### A06 — Publishing and inventory restrictions

Prerequisite: A03–A05.

- [ ] Only approved, valid, priced inventory can become the one active published layout; drafts stay private.
- [ ] Publishing and reservation races use consistent locking/revision rules.
- [ ] The first reservation permanently freezes geometry/identity for the prototype event, including after cancellation.
- [ ] Blocking/unblocking requires eligible unclaimed inventory, a reason, and audit evidence; reserved slots cannot be blocked.

### A07 — Booking monitoring and cancellation

Prerequisite: A01 and B06–B07.

- [ ] Search/filters/detail pages show persisted bookings, customer details, exact slot snapshots, and quoted totals.
- [ ] Proposed admin-only cancellation validates prototype/unpaid eligibility, requires a reason, and releases every claim atomically.
- [ ] Cancellation is idempotent and safe under reservation/cancellation races; the guest sees the resulting state.
- [ ] Booking/admin changes retain an audit trail; private access, errors, and refresh states are verified with no manual-paid action.

### A08 — Reservation analytics

Prerequisite: persisted booking/cancellation behavior from B06 and A07.

- [ ] Available + reserved + blocked equals published inventory in a consistent snapshot.
- [ ] Active booking count and quoted reservation value match uncancelled immutable snapshots, including mixed prices.
- [ ] Booking trend and route breakdown work with event timezone and empty/zero-capacity cases.
- [ ] Refresh/stale/error indicators work; retries/cancellations do not inflate totals and no metric implies collected revenue.

### Q01 — Integrated prototype verification

Prerequisite: the customer and admin features above; feature-level verification happens throughout implementation.

- [ ] The complete customer/admin journey passes against an isolated shared-demo dataset, including publish, reserve, inspect, and cancel.
- [ ] Browser checks cover mobile/keyboard, cross-view selection, satellite/map failure, two-customer conflicts, and private/admin access.
- [ ] Final lint/typecheck/build and critical database tests pass, with exact commands/results and documented unresolved limitations.
- [ ] Repeatable setup, safe fixture reset instructions, demo walkthrough, and environment readiness are recorded; no payment credentials/jobs are required or paid states simulated.

## Deferred and separate work

| ID  | Feature                                                                                                          | Completion | Status   | Prototype weight | Resume condition                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| P01 | Midtrans Sandbox, payment UI, attempts/events, webhooks, expiry/reconciliation, reversals, and payment analytics | 0%         | Deferred | Excluded         | Booking/admin prototype is accepted and payment hold/migration policy is defined.                              |
| L01 | Event landing page at `/`                                                                                        | 0%         | Deferred | Excluded         | Separate requested landing-page work after the booking/admin priority; existing page is a starter placeholder. |
| R01 | Live payment launch and production operating readiness                                                           | 0%         | Deferred | Excluded         | Measured/approved physical inventory, live policies, provider acceptance, and deployment evidence.             |

## Dependencies and unresolved choices

| Item                               | Current evidence / next action                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database and environment           | B01 verified on isolated branch `br-broad-shape-b3uilbrj`; ignored `.env.test.local` contains test credentials. Branch expires 24 November 2026 at 19:00 Asia/Jakarta. Application `.env.local` database target remains to be configured; staging/production were not migrated. |
| Map provider                       | Libraries are declared, but map credentials, site coverage, native tile zoom, and attribution are unverified. Confirm during B03 without blocking B02/B04.                                                                                                                      |
| Customer access                    | Confirmed: no customer login or account creation for checkout/booking. Implement automatic private guest sessions and ownership checks in B01/B06/B07; admin authentication remains required.                                                                                   |
| Cancellation lifecycle             | Persistent reservations until explicit admin cancellation remain proposed, not a confirmed live operating policy. Record the implementation choice and limits before B06/A07.                                                                                                   |
| Interface language/customer fields | Indonesian and the listed contact/business fields remain proposed defaults. Resolve before final form copy; avoid treating a prototype assumption as a confirmed policy.                                                                                                        |
| Actual site layout                 | Use explicit illustrative geometry until frontage, access permissions, reference points, and physical numbering are measured/approved.                                                                                                                                          |
| Deployment                         | Nitro build approach exists; a shared host/environment has not been verified. No payment scheduler is required now.                                                                                                                                                             |

No dependency is marked blocked solely because it has not yet been inspected. Mark a feature blocked only when a concrete failure or missing prerequisite prevents its next useful step, and record what resolves it.

## Progress history

Append records rather than rewriting earlier evidence. If a prior completion claim proves incorrect, add a correction and update the current register.

| Date / timezone           | Record                                                                                            | Feature percentage change                                | Total before → after           | Evidence / verification                                                                                                                                                                                                                                                | Next action                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2026-11-17 · Asia/Jakarta | Initial measured baseline and priority plan created; historical completion dates are not inferred | F01 baseline 50%; F02 baseline 100%; B01–Q01 baseline 0% | Not previously tracked → 3.00% | Source inspection of routes, schema, auth, Query wiring, and color tokens. White/primary contrast calculated at 5.48:1. No fresh app build, database test, or browser flow claimed.                                                                                    | Start B01, then B02/B04 and B03.                                                   |
| 2026-11-17 · Asia/Jakarta | Customer confirmed checkout and slot booking without login or account creation                    | No gate changes                                          | 3.00% → 3.00%                  | User clarification recorded in MVP and architecture; automatic private guest sessions remain to be implemented. No runtime behavior verified.                                                                                                                          | Start B01 with guest ownership; resolve reservation lifecycle separately.          |
| 2026-11-17 · Asia/Jakarta | Implemented and verified booking database foundation and repeatable development checks            | F01 50% → 100%; B01 0% → 100%; other features unchanged  | 3.00% → 14.00%                 | Reviewed migrations/metadata, seed and typed reads on isolated Neon branch; 3 unit and 10 PostgreSQL integration tests, lint, typecheck and build passed. See [verification](./booking-foundation-verification.md) for scope and warnings; no browser journey claimed. | B02/B04: `/booking` slot browser, selection and filters using persisted inventory. |
| 2026-11-17 · Asia/Jakarta | Confirmed one fixed event and admin-editable scheduled booking window                             | No additional gate changes                               | 14.00% → 14.00%                | Schedule boundary checks and persisted schedule changes verified; A02 dashboard editing and B06 reservation checks remain outstanding.                                                                                                                                 | Continue B02/B04; implement protected schedule editing in A02.                     |

## Updating this record

After each meaningful implementation or verification step:

1. Update the feature's checkboxes and add evidence: file, commit/PR when available, executed check, or validation artifact.
2. Recalculate its gate count and percentage; then update the area table and weighted total. Keep two decimal places for totals.
3. Append a dated history row containing feature change, total before/after, checks, limitations, and next action. Record work that changes no percentage honestly.
4. Keep blockers, scope changes, and next task current. Reopen a gate if new evidence contradicts it.
5. Keep payments and `/` work outside the current denominator unless the user changes the prototype scope. Never raise a percentage because time was spent, packages were installed, or a plan was written.
