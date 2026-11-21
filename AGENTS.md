# Project Engineering Instructions

These instructions apply throughout this repository. Favor developer experience, descriptive naming, explicit behavior, and maintainability. Production-grade code means correct, secure, observable, and verifiable behavior, not extra layers for their own sake.

## Project context

- Read [the MVP](docs/mvp.md) and [the architecture](docs/architecture.md) before changing related behavior. Proposed business defaults remain proposals until confirmed.
- Use [the progress tracker](docs/progress.md) for current priorities and evidence. After meaningful implementation/verification, update its acceptance gates, feature percentages, weighted area/total percentages, history, and next action. Do not count planning/dependencies as product completion or include deferred payments/landing work in the prototype denominator.
- Current implementation priority is the `/booking` customer reservation flow, followed by the `/admin` prototype. Payment integration is deferred, including Sandbox, provider schema/routes, webhooks, expiry jobs, and payment monitoring. Do not make those prerequisites for booking/admin work or simulate a paid result.
- Preserve confirmed route ownership: `/` is the event landing page, `/booking` is the customer booking portal, and `/admin` is the authenticated admin dashboard.
- Use React, TypeScript, TanStack Start/Router, Neon PostgreSQL, and Midtrans. Retain the existing Nitro runtime unless the task changes that decision.
- Apply the named [TanStack Start skill](/Users/arifwahyu/.codex/skills/tanstack-start/SKILL.md) to relevant routing and full-stack patterns. Its Cloudflare/D1 templates, deployment steps, dependency versions, and example redirects are not this project's configuration. Do not switch infrastructure, package managers, or public routes to match the skill.
- Check framework examples against installed versions and official documentation. The scaffold uses `createFileRoute` with `server.handlers` for HTTP routes; do not introduce legacy `createAPIFileRoute` examples without version evidence.
- Implement the requested scope fully. Preserve unrelated work and avoid opportunistic repository-wide rewrites.

## Developer experience first

- Optimize for the next developer finding a feature, tracing its data flow, and changing it safely.
- Prefer explicit domain operations, direct imports, and focused modules over hidden side effects and generic frameworks.
- Reuse existing implementations before adding abstractions or dependencies. Extract shared behavior for a concrete shared responsibility, not speculative future reuse.
- Keep one owner for each business rule, state value, and integration. Split files by responsibility rather than arbitrary line-count limits.
- Use npm and the existing `package-lock.json`. Do not introduce another lockfile. Add dependencies only when their benefit exceeds their maintenance cost.
- Explain non-obvious invariants and consequential decisions. Comments should explain why, not narrate obvious code.
- Create folders when implemented work needs them. The proposed tree below does not require empty scaffolding or an immediate migration of existing files.

## TanStack Start routing and folder structure

Use file-based routing in `src/routes`. Prefer nested directories for booking and admin so the physical tree reflects URL ownership. Keep the root document, parent layouts, index routes, dynamic parameters, and HTTP routes recognizable.

```text
src/
  routes/
    __root.tsx                         # Shared document, providers, root boundaries
    index.tsx                          # / — event landing page
    booking/
      route.tsx                        # Shared booking layout with Outlet
      index.tsx                        # /booking — slot and map views
      checkout.tsx                     # Proposed /booking/checkout
      orders/
        $bookingOrderId.tsx             # Proposed private booking status
    admin/
      route.tsx                        # Admin shell and navigation auth guard
      index.tsx                        # /admin — dashboard
      layout-editor.tsx                # Proposed child page
      slot-pricing.tsx                  # Proposed child page
      orders/
        index.tsx                      # Proposed admin order list
        $bookingOrderId.tsx             # Proposed admin order details
    api/
      auth/
        $.ts                           # Existing Better Auth catch-all
      payments/
        midtrans/
          notification.ts              # Deferred payment phase; do not scaffold now
      jobs/
        reconcile-payments.ts          # Deferred payment phase; do not scaffold now
  features/
    event-landing/
    event-management/
    event-layout/
    slot-inventory/
    slot-pricing/
    booking-checkout/
    booking-orders/
    booking-analytics/
  components/
    ui/                                # Shared UI primitives
    layout/                            # Shared visual shells/navigation
  server/
    auth/                              # Sessions and server authorization
    db/                                # Client, Drizzle schema, transactions
    services/                          # Authoritative business operations
    payments/                          # Deferred until Midtrans implementation
    jobs/                              # Deferred payment reconciliation
  shared/                              # Client-safe cross-feature contracts/helpers
  integrations/                        # Existing framework provider integrations
  lib/                                 # Small cross-cutting framework/UI helpers
  router.tsx
  styles.css
  routeTree.gen.ts                      # Generated; never hand-edit
db/
  migrations/
  seeds/
tests/
  integration/                         # Cross-module/database checks, when needed
  end-to-end/                          # Browser journeys, when needed
docs/
  mvp.md
  architecture.md
```

Only `/`, `/booking`, and `/admin` are confirmed page paths. Child paths above are implementation proposals. Keep sign-in reachable outside a layout that requires an existing admin session; avoid redirect loops.

Routing rules:

- Preserve reserved names and syntax: `__root.tsx`, `index.tsx`, `route.tsx`, the `Route` export, and `$` parameters/catch-alls. Descriptive naming complements these framework conventions.
- Use explicit parameters such as `$bookingOrderId` and `$eventId`. Keep the framework-required bare `$` for catch-all routes.
- Add `route.tsx` when a section needs a shared parent layout, guard, or context, and render `Outlet` for children. A directory alone does not require a layout file.
- Use a leading `_` for a pathless layout only when a URL-independent layout is needed. Keep default route tokens unless a concrete requirement justifies changing them.
- Keep route files thin: configuration, validated parameters/search, loaders, metadata, boundaries, and feature composition. Put substantial page UI in the owning feature and business operations on the server.
- Keep ordinary components, tests, schemas, and helpers outside `src/routes` to avoid accidental route discovery.
- Use typed `Link` and navigation APIs. Validate search parameters and prefer typed destinations over manually assembled internal URLs.
- Loaders can run during client navigation. Call server functions rather than accessing private environment values or database clients directly in a loader.
- Regenerate route types through the configured tooling after route changes. Never edit `routeTree.gen.ts` or build output by hand.

References: [file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing), [file naming conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions). Check the installed generator configuration before applying examples.

## Feature ownership and module boundaries

Inside a feature, create only needed folders such as `components/`, `hooks/`, and `stores/`. Colocate client-safe schemas, queries, domain types, and focused tests with their owner.

```text
features/slot-inventory/
  components/
    booking-slot-browser-page.tsx
    booking-slot-map.tsx
    booking-slot-selection-summary.tsx
  hooks/
    use-booking-slot-selection.ts
  stores/
    booking-slot-selection.store.ts
  slot-inventory.functions.ts           # createServerFn boundary wrappers
  slot-inventory.queries.ts             # Query keys/options
  slot-inventory.schema.ts              # Client-safe validation contracts
  slot-inventory.types.ts               # Separate only when shared types need it
```

- Routes compose features. Features consume shared components and client-safe shared modules.
- Do not import another feature's private component/store internals. Share a narrow contract or promote genuinely shared behavior instead.
- Put `createServerFn` wrappers in descriptive `.functions.ts` modules. Validate requests and delegate through TanStack-supported server boundaries.
- Put executable server implementations under `src/server` with `.server.ts` suffixes. Keep their imports inside supported server-only boundaries. Browser-reachable code must not expose credentials or database access.
- UI imports server-function wrappers, not service implementations. HTTP handlers reuse the same services instead of duplicating rules.
- Server implementations do not depend on components, hooks, or client stores. Shared modules do not depend on server or feature internals.
- Prefer direct named imports. Avoid broad barrel files that hide ownership, cause cycles, or mix client/server exports.
- Use the established `#/` source alias for non-local imports and `./` for nearby files. Avoid long parent-directory traversal and additional aliases.
- Keep local state local and shared selection in its feature store. Create global stores only for genuinely app-wide state.

## Descriptive naming

Longer names are welcome when they clarify intent. Avoid abbreviations, ambiguous context, and redundant filler. Short names are acceptable only in immediately clear local contexts, such as a simple numeric loop index.

| Item                          | Convention                                             | Example                                                              |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| Folder / ordinary file        | Descriptive kebab-case                                 | `booking-checkout/`, `booking-slot-map.tsx`                          |
| Page component                | PascalCase with domain and `Page`                      | `BookingSlotBrowserPage`, `AdminSlotPricingPage`, `EventLandingPage` |
| Layout component              | PascalCase with `Layout`                               | `AdminDashboardLayout`, `BookingPortalLayout`                        |
| Component                     | PascalCase with specific purpose                       | `BookingSlotSelectionSummary`                                        |
| Variable / function           | camelCase with domain meaning                          | `selectedBookingSlotIds`, `calculateBookingTotalPrice`               |
| Boolean                       | `is`, `has`, `can`, or `should`                        | `isReservationPending`, `canPublishEventLayout`                      |
| Collection                    | Plural or explicit collection meaning                  | `availableBookingSlots`, `bookingSlotById`                           |
| Hook                          | `use` plus purpose                                     | `useBookingSlotSelection`                                            |
| Callback prop / local handler | `on` event / `handle` event                            | `onBookingSlotSelectionChange`, `handleCheckoutSubmission`           |
| Type / interface / schema     | PascalCase type; camelCase schema                      | `BookingOrderSummary`, `createSlotReservationInputSchema`            |
| Fixed module constant         | UPPER_SNAKE_CASE                                       | `INVENTORY_REFRESH_INTERVAL_MILLISECONDS`                            |
| Database table / column       | Descriptive snake_case mapped to application camelCase | `payment_attempts`, `confirmed_at`                                   |
| Test                          | Behavior-specific `.test.ts` / `.test.tsx`             | `calculate-booking-total-price.test.ts`                              |

- Name operations by behavior: `reserveBookingSlots`, `reconcileMidtransPayment`, `publishEventLayout`. Add `Async` only when distinguishing APIs requires it.
- Include meaningful units: `slotFrontageMillimeters`, `bookingTotalPriceIdr`, `reservationExpiresAt`, `refreshIntervalMilliseconds`.
- Distinguish internal IDs, public references, and provider IDs: `bookingOrderId`, `bookingReference`, `midtransOrderId`.
- Replace vague `data`, `item`, `temp`, `res`, `manager`, and `helper` names when the domain is known. Preserve framework-required API names.
- Avoid application-wide catch-all `common.ts`, `helpers.ts`, and `types.ts` files. Name modules for their job, such as `format-price-idr.ts`. Keep established helpers such as shadcn's `cn` compatible.
- Do not prefix interfaces with `I` or types with `T`. Infer schema/database types where useful rather than maintaining parallel declarations.
- Preserve provider fields such as Midtrans's `order_id` at integration boundaries, then explicitly map them to descriptive internal names.

## TypeScript and code style

- Keep strict mode and existing safety checks. Never weaken configuration to hide errors.
- Narrow `unknown` external values. Avoid `any`, double assertions, non-null assertions, and suppression comments as shortcuts. Explain narrow unavoidable escape hatches at their boundary.
- Model meaningful states with unions and exhaustive handling. Avoid boolean combinations that permit impossible reservation/payment states.
- Type public contracts and important boundaries explicitly; infer obvious locals. Derive input types from schemas where appropriate.
- Prefer immutable values and pure functions for money, geometry, and state decisions. Keep side effects explicit.
- Use named exports except where framework/configuration conventions require another shape.
- Follow Prettier/ESLint: single quotes, no semicolons, and configured trailing commas. Do not introduce competing manual formatting rules.
- Remove dead code, debug logs, unused flags, and commented-out implementations. Avoid speculative service factories, generic repositories, and interfaces for a single operation.

## React, state, and presentation

- The confirmed primary brand color is `#047857`. Keep it centralized as `--brand-primary` in `src/styles.css`, consumed by semantic primary/sidebar/focus tokens. Use `bg-primary`, `text-primary`, and related semantic utilities rather than repeating the hex in components. Use white foreground text on primary fills and check contrast for new color pairings. See [design direction](DESIGN.md).
- Use TanStack Query for server state, router search parameters for shareable navigation state, and Zustand for shared client state that cannot be derived. Never maintain a second writable copy of server inventory/prices.
- Scope query keys by event, layout revision, resource, and relevant filters. Share query options between loaders/components and invalidate affected data after mutations.
- Keep SSR state request-scoped. Never share a server QueryClient or customer selection store across users. Clear private queries on sign-out or identity changes.
- Slot/map views share inventory and selected IDs. Reservation-time server validation is authoritative.
- Map view must include street/satellite backgrounds with persistent slot overlays and close zoom for small footprints. Keep Slot/Map presentation separate from Street/Satellite basemaps. Preserve selection, viewport, and draft edits when changing backgrounds, and follow the documented fit/focus and source-zoom rules.
- Use focused components, semantic HTML, reusable controls, and semantic styling tokens.
- Define relevant loading, empty, error, pending, stale, unauthorized, and success states. Prevent accidental duplicate submissions while retaining server idempotency.
- Provide labels, visible focus, keyboard access, non-color status indicators, and an accessible list alternative to map interaction. Follow the MVP's mobile booking requirements.
- Load browser-only maps/editors behind a client boundary. Keep SSR output deterministic; do not conceal general hydration bugs with blanket `suppressHydrationWarning`.
- Use effects and memoization for concrete lifecycle/performance needs, not to maintain values that can be derived during rendering.
- Isolate illustrative fixtures from real inventory. A failed query produces an honest error, not a silent fallback to fake success data.

## Server security and error handling

- Use `createServerFn` for internal RPC and HTTP routes for auth callbacks, Midtrans notifications, and scheduled jobs. Consult current [server function](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) and [server route](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) documentation.
- Validate untrusted input server-side, including parameters, ownership, quote revisions, dimensions, and payload sizes. Client validation only improves UX.
- Check authentication and resource authorization in every private server operation. A parent route guard does not secure server functions.
- Keep secrets server-only. Validate configuration with actionable errors without printing credentials; document safe variable examples.
- Protect cookie-authenticated writes against cross-site requests. Use appropriate secure cookies and bounded checkout/status-refresh operations.
- Return typed, actionable domain conflicts. Keep unexpected failures observable with safe user messages and correlation IDs.
- Never swallow failures or turn provider/network errors into success. Retry only known-safe operations with bounded backoff and duplicate protection.
- Use structured logs with relevant IDs and audit significant admin/payment transitions. Exclude secrets and unnecessary personal information.
- Prevent shared caching of private responses and return only necessary DTO fields.

## Booking, database, payment, and GIS correctness

- Preserve transactional slot claims, uniqueness constraints, deterministic lock order, quote validation, and immutable order snapshots from the architecture.
- Reserve the complete selection or none. Browser state, optimistic UI, and polling cannot prevent double booking.
- Use integer IDR values, integer measured dimensions with units, and timezone-aware timestamps formatted in the event timezone.
- Treat slot size and price as independent per-slot values with common defaults and explicit overrides. Mixed-width positions use cumulative effective widths, not index times a shared width. A draft resize must atomically validate affected geometry, preserve slot identities/prices, and reject overflow without silently deleting inventory.
- Keep local selection and persisted reserved inventory distinct. The prototype uses reserved/cancelled bookings with explicit `not_integrated` payment state and no automatic expiry. Proposed admin cancellation requires a reason, atomic claim release, and an audit record. Reserved does not mean paid or sold.
- When implementing the deferred payment phase, keep held/sold inventory, order state, and provider payment state distinct. Do not build provider functionality speculatively.
- In the payment phase, make external calls outside database transactions. Persist idempotent attempts; uncertain creation/status retains ownership until safely reconciled.
- In the payment phase, verify notifications and provider status. Never confirm from a browser callback or release inventory from a local countdown alone.
- Confirmed: admins may change price and size for available slots after sales opens. Protect reserved slot identities, prices, dimensions and footprints in server transactions and database guards. Safe reflow must preserve reserved neighbours and access gaps; no global opening-time/first-reservation freeze applies to available inventory. Extend reservation protection to held/sold states in the payment phase.
- Validate footprints server-side, use appropriate metric/geodesic calculations, preserve access gaps, and distinguish illustrative geometry from measurements.
- Commit reviewable migrations, preserve applied migration history, and test database changes in isolation. Do not run destructive resets against shared/live data or use mocks as proof of allocation constraints.
- Introduce additional infrastructure only for a demonstrated need and an explicit architecture decision.

## Verification and definition of done

Scale checks to the change. Documentation edits need formatting/link checks, not an application build. For application changes:

1. Run focused behavior checks and regression coverage for bugs or critical logic.
2. Run `npm run lint`, `npm exec tsc -- --noEmit`, and `npm run build` as applicable. Build success does not establish type safety or payment correctness.
3. Use scoped formatting checks such as `npm exec prettier -- --check <changed-files>`. Avoid repository-wide write/fix commands that rewrite unrelated work.
4. Test concurrency, pricing/snapshots, geometry boundaries, authorization, and payment idempotency when implementing them. Use real PostgreSQL integration checks for database constraints and browser checks for critical journeys.
5. Do not add tests that merely mirror implementation details or snapshots for trivial reversible markup. Add minimal useful tooling/scripts with the first tested behavior; do not claim nonexistent test commands work.
6. Verify relevant responsive, keyboard, and UI states. State what was actually exercised.
7. Keep behavior docs, safe environment examples, migration/setup instructions, and executable CI checks aligned as implementation introduces them.
8. Report changes, passing checks, and remaining blockers. Separate pre-existing failures from regressions and never claim unperformed checks passed. Do not disable checks or weaken assertions to force success.

Production readiness requires evidence from the implemented system and target environment. These instructions set engineering requirements; they do not certify the scaffold or prototype as production-ready.

## Collaboration

Be direct and analytical. Identify unsupported assumptions and explain material trade-offs. Make routine reversible choices within scope and identify unresolved business decisions without presenting guesses as approved policy. Prioritize correctness and maintainability over pleasing descriptions or unnecessary complexity.
