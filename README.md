# Ketaon Fair

Customer booking and organizer administration prototype built with React, TanStack Start, TypeScript, Neon PostgreSQL/PostGIS, and the existing Nitro Node runtime. Customers do not need an account or login. Payment integration is deferred.

See [MVP](docs/mvp.md), [architecture](docs/architecture.md), and [progress](docs/progress.md) before extending behavior. The current implementation is the B01 database foundation. `/` remains the starter landing page; `/booking` and `/admin` are not implemented yet.

## Local development

Use Node.js 24 LTS (Node 22.12+ is also supported) and npm.

```bash
npm ci
```

Create `.env.local` using the variable names in [.env.example](.env.example), preserving existing values. Use a pooled `DATABASE_URL` for application reads and a direct `DATABASE_URL_UNPOOLED` for migrations on a dedicated development branch. Set a random `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL=http://localhost:3000`. Admin persistence and roles are still A01 work.

Apply reviewed migrations explicitly, then seed only on an isolated development/demo branch:

```bash
npm run db:migrate
ALLOW_ILLUSTRATIVE_SEED=true npm run db:seed
npm run dev
```

Neither application startup nor ordinary requests migrate or seed the database. Migrations enable PostGIS and create the booking tables, constraints, and geometry/snapshot guards. The obsolete todo helper/schema have been removed. No payment configuration is needed.

The seed inserts 60 clearly illustrative slots across 2 routes, with access gaps, 1.2/1.5/2.1 m frontages, depth overrides, and independent prices. Dates are relative to the first seed execution. It is insert-only and repeat execution leaves existing bookings untouched. Geometry is synthetic UTM zone 49S data transformed to WGS84, not surveyed site inventory. Fixture prices are not approved business prices.

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
