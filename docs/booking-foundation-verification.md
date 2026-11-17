# Booking foundation verification

Verified on 17 November 2026, Asia/Jakarta. This record covers F01 and B01, not an implemented customer reservation journey.

## Database target

- Neon project `muddy-morning-79419149`, currently named `ketaonfair`.
- Isolated schema-only branch `arif/booking-foundation-20261117`, ID `br-broad-shape-b3uilbrj`, created from the schema of the configured staging branch. No parent customer rows were copied.
- Branch expires on 24 November 2026 at 19:00 Asia/Jakarta. Recreate a disposable branch and update ignored test credentials after expiration.
- Credentials are stored only in ignored `.env.test.local`. Existing `.env.local` settings were preserved. Source credential values formerly in tracked `.env.example` were preserved in ignored `.env.neon-source.local`; the tracked example now contains placeholders. Previously committed credentials still require rotation outside this change.
- Migrations and seed were run only on the isolated branch. Staging and production were not migrated or seeded.

## Implemented and exercised

1. Drizzle migration history enables PostGIS, creates 13 booking/inventory/guest/audit tables, and adds geometry and immutable-history triggers. Catalog inspection confirmed PostGIS 3.6.4, 14 public foreign keys, 30 public check constraints, and `one_active_claim_per_slot` as a unique index on `slot_id WHERE released_at IS NULL`. The active-claim partial unique index, event/layout composite foreign keys, whole-IDR bounds, effective frontage interval checks, and guest token-hash format checks were exercised against PostgreSQL. Four migrations cover extension setup, relational schema, spatial/item guards, and order snapshot protection.
2. The explicit seed publishes 60 illustrative slots, grouped into 2 routes with access gaps, mixed frontages/depths, independent price overrides, and 2 blocked slots. Repeated seeding returns `already_seeded` and does not reset data.
3. Read services return only published event/layout inventory, derive reserved state from active claims, omit private fields, and return validated GeoJSON. Quote reads preserve exact prices/dimensions/revisions and return explicit missing/closed/unavailable outcomes. A 1.2 m slot at IDR 325,000 plus a 2.1 m slot at IDR 250,000 totals IDR 575,000.
4. Competing transactions produced exactly one active claim and a PostgreSQL uniqueness conflict for the other. This proves the allocation constraint, not the future B06 all-or-nothing/idempotent reservation operation.
5. Invalid polygons, footprint overflow, overlapping slots, access-gap collisions, unapproved parent edits, interval/frontage mismatch, invalid prices, cross-event references, snapshot edits/deletes, duplicate guest submission keys, and plaintext guest token storage were rejected.
6. Booking quote reads honor persisted changes to opening/closing dates/times and reject requests before opening or after closing. A database check rejects reversed windows. Pure boundary tests cover exactly 12:00 opening and 23:00 closing in Asia/Jakarta using illustrative dates; no actual event schedule is assumed. Admin editing UI remains A02 work.
7. Synthetic polygons use a shared 100 mm metric vertex grid before projection, with WGS84 coordinates snapped at 10^-12 degrees. This prevents inconsistent shared edges after projection. Row interval validation allows 10 mm for metric/geodesic length conversion; polygon containment/interior overlap checks do not allow overlaps. This is fixture validation, not proof of physical site accuracy.

## Commands and results

| Check                           | Result                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`                  | Passed after excluding generated artifacts, replacing the unused todo helper, and correcting the starter auth-header optional chain. |
| `npm exec tsc -- --noEmit`      | Passed.                                                                                                                              |
| `npm test`                      | 3 focused request/window-validation tests passed.                                                                                    |
| `npm run test:integration`      | 10 PostgreSQL integration tests passed on the isolated branch.                                                                       |
| `npm exec drizzle-kit -- check` | Passed migration metadata consistency.                                                                                               |
| `npm run build`                 | Passed client/SSR/Nitro builds, with upstream module-directive/code-splitting warnings.                                              |

Formatting and local documentation links are checked separately on changed files. No browser journey was exercised because B01 introduces no page UI. Server-function wrappers are typechecked but are not yet consumed by a route or verified through an HTTP journey. CI workflow execution on GitHub has not been observed.

## Scope boundaries

Guest checkout without login is confirmed. B01 provides guest ownership storage contracts, not cookie/session establishment. Booking tables model reserved/cancelled state with `not_integrated` payment state and no automatic reservation expiry. Admin cancellation policy remains a proposal until selected for that feature; no cancellation endpoint was implemented.

The user also confirmed one fixed event. The current `events` table stores booking settings and supplies the event transaction lock; it does not authorize a multiple-event product or event creation/switching UI. Replacing its general event identity with singleton settings is a possible schema simplification, not implemented in this task.

Persistent Better Auth sessions/admin roles remain A01 work. Existing auth tables were not migrated. Reservation submission, all-or-nothing allocation service behavior, idempotent request recovery, quote-change review UI, guest access enforcement, rate limits, and admin operations remain their own gates. There are no payment tables, provider routes, webhooks, jobs, or paid-state simulation.

Next action: B02 and B04, database-backed `/booking` slot browsing and shared selection/filtering. Configure an isolated application development target before wiring the read functions to the route. Map configuration follows in B03 and should not block the accessible slot browser.
