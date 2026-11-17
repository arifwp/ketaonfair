# Ketaon Fair

Customer booking and organizer administration prototype built with React, TanStack Start, TypeScript, Neon PostgreSQL/PostGIS, and the existing Nitro Node runtime. Customers do not need an account or login. Payment integration is deferred.

See [MVP](docs/mvp.md), [architecture](docs/architecture.md), and [progress](docs/progress.md) before extending behavior. `/booking` is a full-screen satellite map with hover/clickable slots on both street sides, a floating cart, slot-code search and an accessible results overlay. Zoom-out and panning are limited to the fitted inventory region. Event information belongs to `/`, which remains the starter landing page; checkout/reservations and `/admin` are subsequent work.

## Local development

Use Node.js 24 LTS (Node 22.12+ is also supported) and npm.

```bash
npm ci
```

Create `.env.local` using the variable names in [.env.example](.env.example), preserving existing values. Use a pooled `DATABASE_URL` for application reads and a direct `DATABASE_URL_UNPOOLED` for migrations on a dedicated development branch. Set a random `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL=http://localhost:3000`. Admin persistence and roles are still A01 work.

Apply reviewed migrations explicitly, then seed only on an isolated development/demo branch:

```bash
npm run db:migrate
ALLOW_ILLUSTRATIVE_SEED=true npm run db:seed:street-demo
npm run dev
```

Neither application startup nor ordinary requests migrate or seed the database. Migrations enable PostGIS and create the booking tables, constraints, and geometry/snapshot guards. The obsolete todo helper/schema have been removed. No payment configuration is needed.

Set server-only `BOOKING_EVENT_ID=479672ed-1562-4a89-a21a-09bbd7f96441` for the street demo and public `VITE_MAPTILER_KEY` to your application's MapTiler browser key. Restrict the key's allowed origins in MapTiler Cloud before deploying, and rebuild after changing `VITE_` values. Credentials remain in ignored `.env.local`; do not commit keys.

The street seed inserts 220 illustrative slots, 110 on each side of the starter route from Pasar Ketaon toward Bengkel Purnama Fauzan. It uses attributed OpenStreetMap/OSRM road context checked into [the fixture](db/seeds/fixtures/ketaon-starter-route.json), without making routing calls during ordinary requests or seed execution. Slots, 3 m street offsets, junction clearances, access gaps, dates, and prices are demonstration assumptions, not surveyed or approved frontage. Metric UTM zone 49S generation and PostgreSQL spatial guards apply to both sides. Seeding is insert-only; repeat execution preserves existing data. The original `npm run db:seed` remains the separate 60-slot foundation fixture used by integration checks; its event ID is `c180aeb3-772c-469b-a37b-38d022103821`.

The ignored local application database targets isolated branch `br-tiny-lake-b34l5y7d`, expiring 24 November 2026 at 19:00 Asia/Jakarta. The integration branch remains separate. Recreate an isolated development branch after expiry. No shared staging/production migration or seed is implied.

Selection is temporary browser state, not a reservation, and survives search/background changes within the mounted booking flow. Clicking an available footprint adds it directly to the cart; clicking a selected one removes it. Search results provide the same operation and explicit map focus. Reloading starts a fresh selection. Only slot-code search is offered; there are no route, availability or price-range filters. Inventory refreshes every 15 seconds while visible. Refresh failures retain cached information and the cart, show retry, and stop new selections until recovery. Unavailable/unpublished selections are flagged for removal rather than silently discarded. See [browser verification](docs/booking-browser-verification.md).

Customer booking copy uses casual Bahasa Indonesia, including accessible labels and decimal measurements such as `1,5 × 2 m`. The mobile cart starts as a compact bar. **Lihat** opens a bounded sheet with a visible **Tutup** action; closing/backdrop/Escape preserves selection. Item content scrolls inside the sheet while its header/footer stay reachable. Native dialog behavior supplies focus containment and restoration. No new UI dependency or database change is needed.

For a fresh dataset, create a new disposable branch and apply migrations/seed there. There is deliberately no destructive reset command. Do not truncate history or reset a shared/live branch.

## Database changes

The schema owner is [schema.ts](src/server/db/schema.ts). Generate relational changes with Drizzle, and review the resulting SQL and snapshots:

```bash
npm run db:generate -- --name=describe-the-change
npm exec drizzle-kit -- check
```

Use `npm run db:generate -- --custom --name=describe-the-change` for PostGIS functions/triggers unsupported by the schema generator. Keep applied migrations immutable. Do not use schema push against a shared database.

The active published layout is derived from `layout_versions.state`, protected by a partial unique index per event. Availability is derived from publication, blocking, and active claims. Slot prices and dimensions use independent overrides. Geometry changes are checked at transaction commit, allowing a complete atomic reflow in the later editor. Services must lock the event before updating rows/slots, then lock slots in stable ID order.

Read services live under `src/server/services`; client-safe contracts and `createServerFn` wrappers live in their owning features. The installed TanStack Start version uses `.validator(...)`, despite older skill examples using `.inputValidator(...)`. Public inventory contains no guest/customer identifiers. Inventory and quote wrappers return `Cache-Control: no-store`. Quotes do not claim inventory and must be revalidated by B06 at reservation time.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs these checks using Node 24. Build output is excluded from linting; source checks remain enabled. The build currently emits upstream module-directive warnings. A successful build does not demonstrate customer booking or admin behavior.

PostgreSQL integration tests require a **separate disposable Neon branch**, with direct and pooled URLs for that same branch. Put these variables in the ignored `.env.test.local`:

```dotenv
TEST_DATABASE_URL=postgresql://USER:PASSWORD@TEST-ENDPOINT-pooler.REGION.aws.neon.tech/neondb?sslmode=require
TEST_DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@TEST-ENDPOINT.REGION.aws.neon.tech/neondb?sslmode=require
TEST_DATABASE_BRANCH_ID=br-YOUR-DISPOSABLE-BRANCH
```

```bash
npm run test:integration
```

This command applies migrations, seeds illustrative inventory if absent, and exercises real PostgreSQL constraints, concurrent claim uniqueness, spatial validation, snapshot immutability, and inventory/quote reads. It never falls back to `DATABASE_URL`. It intentionally mutates the test branch and retains synthetic history; do not point it at live/shared-demo data. CI integration checks can be run manually with dedicated disposable-branch secrets, as configured in [checks.yml](.github/workflows/checks.yml).

The locally prepared test environment is separate from `.env.local`; no application database target was overwritten. Current validation details and the temporary branch lifecycle are recorded in [booking foundation verification](docs/booking-foundation-verification.md).

## Run the Node build

```bash
npm run build
node --env-file-if-exists=.env.local .output/server/index.mjs
```

Hosting, live deployment, map-provider configuration, persistent admin authentication, and payment acceptance remain separate work.
