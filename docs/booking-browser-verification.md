# Booking browser verification

Verified on 17 November 2026, Asia/Jakarta. Scope: B02/B03/B04 locally verified browsing and selection. Checkout, persisted reservations, admin authoring and deployment remain separate work.

## Current interaction contract

This record includes the full-screen map correction and the later mobile-first cart/Indonesian-copy correction. Earlier expanded-chevron cart screenshots are superseded by the small-screen evidence below.

- `/booking` is a full-viewport satellite map. Event information belongs to `/`; no event headings, schedule, promotion or page-level catalog is displayed here.
- A slot-code search and accessible results/list overlay float at the upper left. Only `q` and `basemap` remain validated URL state. Removed route/availability/price/view parameters have no effect.
- A compact 72 px cart bar floats at the upper right on desktop and above the bottom safe area on mobile. **Lihat** opens a native dialog as a bottom sheet on mobile and floating panel on desktop. **Tutup**, Escape and backdrop dismiss it without clearing selections; native focus returns to the launcher. The sheet uses 65dvh in portrait and 85dvh on screens at most 600 px high. Item content scrolls internally while header/footer stay visible. Search, map clicks and cart actions use the same provider-owned Zustand IDs; prices remain in the server inventory query.
- All customer booking copy uses casual Bahasa Indonesia, including accessible labels, query/map errors, loading/empty states, map-engine controls, availability/side labels and metadata. Dimensions use `id-ID` decimals with millimeter precision, such as `1,2 × 2 m` and `1,234 × 2,101 m`. Database enum values, IDs, prices and legal provider attribution are unchanged. Copy remains explicit that selected slots are not yet reservations. Mobile map controls sit above the compact cart, and safe-area viewport metadata is enabled.
- Hover highlights a footprint and shows code, availability, actual dimensions and price. Direct polygon clicks add/remove a slot without moving the camera. Unavailable slots can be inspected but cannot be added; an existing selection can still be removed while stale/closed. The same eligibility function governs accessible search actions.
- Search-result focus is explicit and caps at zoom 22. A focus-request counter lets the same slot be located again after panning. Basemap changes and ordinary inventory refresh retain camera/selection.
- Minimum zoom comes from fitting the initial available inventory around the floating controls, with published inventory as the no-availability fallback. A Mercator viewport rectangle at that zoom bounds panning to the local region. Raw narrow street bounds are not used directly, because they would force close zoom and clip the route. Limits recompute on viewport resize; search does not widen them. Manual close zoom remains capped at 24.
- MapTiler provides street/satellite styles and visible attribution. Source metadata previously verified native max zoom 15 for street vectors and 22 for satellite raster. These sources are overzoomed; the close-zoom GeoJSON source uses max zoom 24 and zero simplification. Imagery provides context, not survey measurements.
- Browser-only MapLibre is lazy loaded behind `ClientOnly`, with an explicit bundled MapLibre 6 worker. Development source-prop injection still excludes non-DOM `Source`/`Layer` components. Query prefetch is streamed; cached refresh failures preserve cart IDs and offer retry, without fake inventory fallback.

## Data and environment

The starter road is Pasar Cepit / Pasar Ketaon baru → Bengkel Purnama Fauzan, based on the user's Google Maps endpoints. Attributed OpenStreetMap/OSRM geometry is stored in [the fixture](../db/seeds/fixtures/ketaon-starter-route.json). Endpoint snaps differ by approximately 18.5 m and 9.5 m from the supplied locations; this is road context, not turn-by-turn navigation or a verified reproduction of Google's exact route.

The opt-in [street seed](../db/seeds/ketaon-street-booking-inventory.ts) supplies 220 illustrative slots, 110 per side, with direction-relative left/right rows, junction clearances, synthetic access gaps, mixed widths/depths and independent prices. Proposed 3 m offsets and permissions are illustrative. The original 60-slot foundation fixture remains intact. Additional streets, including toward Makam Mbah Budo, require their geometry and later A03/A04 authoring.

The application uses isolated branch `br-tiny-lake-b34l5y7d`; the separate integration branch is `br-broad-shape-b3uilbrj`. Both expire 24 November 2026 at 19:00 Asia/Jakarta. Credentials and the user's MapTiler browser key remain only in ignored `.env.local`. This UI correction did not change database schema, seeds, services or shared/live inventory.

## Checks and evidence

| Check                                                          | Result                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                 | Passed.                                                                                                                                                                                                                             |
| `npm exec tsc -- --noEmit`                                     | Passed with strict configuration unchanged.                                                                                                                                                                                         |
| `npm test`                                                     | 12 passed: existing request/window checks plus 9 browser-domain/store/navigation checks. New coverage tests click eligibility and local viewport bounds; revised coverage verifies code-only search and obsolete parameter removal. |
| `npm run build`                                                | Client, SSR and Nitro builds passed. Upstream module-directive and large lazy map/worker chunk warnings remain; no check was disabled.                                                                                              |
| Scoped Prettier, `git diff --check`, local documentation links | Passed.                                                                                                                                                                                                                             |
| PostgreSQL regression evidence                                 | The earlier 11 real PostgreSQL tests passed on the separate integration branch, including both-side seed/read/idempotency and allocation/spatial/snapshot regressions. Not rerun for this presentation-only correction.             |
| Playwright CLI against production Node build                   | Desktop 1440 × 900 and mobile 360 × 800 exercised. Canvas bounding boxes were exactly `(0, 0, 1440, 900)` and `(0, 0, 360, 800)`. No page overflow measured on mobile.                                                              |

Browser checks exercised satellite default, no event/filter/catalog UI, search and empty search, locate, desktop hover details, direct polygon add/remove, keyboard selection, floating-cart collapse/expand, basemap persistence and wheel zoom-out clamping. L-001 at Rp325.000 plus R-003 at Rp250.000 produced exactly **Rp575.000** in the cart. Fitted zoom-out controls disabled at the local minimum (approximately 17.7 on the desktop viewport and 17.1 on the mobile viewport), with large outward wheel input unable to zoom further. Exact minimum varies with viewport/inventory, not a hardcoded world zoom.

The earlier slice also exercised real blocked-selection correction/restoration, streamed loading, unpublished inventory, initial request failure and cached refresh retry. These remain regression context; the current UI keeps their underlying query/selection contracts. Earlier full-screen screenshots show the superseded expanded-chevron cart.

## Mobile cart and Indonesian copy correction

The latest production build was exercised with Playwright CLI. L-026 and L-014 remained selected at **Rp500.000** across these viewport sizes:

| Viewport   | Compact cart height | Open sheet height | Result                                        |
| ---------- | ------------------- | ----------------- | --------------------------------------------- |
| 375 × 667  | 72 px               | 428 px            | Close/footer visible; no outer overflow.      |
| 360 × 640  | 72 px               | 417 px            | Close/footer visible; no outer overflow.      |
| 667 × 375  | 72 px               | 319.75 px         | Short-height rule keeps close/footer visible. |
| 1440 × 900 | 72 px               | 429 px            | Floating desktop panel fits within viewport.  |

The cart starts closed. **Lihat** opens it, while **Tutup**, Escape and backdrop close it without removing selections. Native dialog focus containment and restoration to the launcher were exercised. An 11-slot cart had 1,066 px of item content in a 200 px scroll area; scrolling to the last item kept the header and totals/footer visible.

A separate touch-enabled Chromium context at 375 × 667 exercised code search, locating and tapping the actual L-001 polygon, dismissing its info popup, and opening/closing the cart. Dismissing the popup did not toggle the polygon underneath. This is browser emulation, not physical iPhone or Safari verification.

Network-aborted inventory refresh and street-style requests exercised the Indonesian error messages. Inventory retry recovered, the Rp500.000 cart survived both failures, and the map error's list fallback opened the accessible slot list. Request interception was removed and satellite view restored afterward.

The scoped copy audit covered visible text and accessibility labels. Twelve unit tests pass, including Indonesian decimal dimensions with millimeter precision. Current local screenshots are ignored under `output/playwright/`: `booking-id-mobile-final.png`, `booking-id-cart-mobile-final.png`, `booking-id-se-long-cart.png` and `booking-id-cart-{375x667,360x640,667x375,1440x900}.png`.

## View × state coverage

| Surface          | Loading                                    | Empty / unavailable                             | Error                                         | Success                                                                    |
| ---------------- | ------------------------------------------ | ----------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| Inventory/map    | Streamed pending query and lazy-map status | Unpublished panel; empty code results           | Query retry and map fallback retain cart      | Full-viewport street/satellite with real published polygons                |
| Code search/list | Synchronous snapshot search                | No matching code; unavailable controls disabled | Existing cached-read warning pauses additions | Code lookup, keyboard add/remove and repeated focus requests               |
| Cart             | IDs retained during refresh                | Empty cart; unavailable/missing IDs flagged     | Refresh warning preserves selected IDs        | Direct map and keyboard selection, exact totals, collapse/expand           |
| Map navigation   | Controls disabled before load              | Fit disabled with no available search matches   | Provider failure offers street/retry/list     | Inventory-derived zoom-out minimum, local panning bounds, close zoom/focus |

## RYUX delivery gate

| Area          | Result                                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product       | PASS within this correction; strong evidence from the user's literal full-map/floating-cart/search-only requirements. Not tested with users.                                                                            |
| UX            | PASS for inspected direct-click, hover, search, keyboard and cart flows; geography stays the main surface.                                                                                                              |
| UI            | PASS for full-viewport map and floating controls/cart at the inspected sizes. No invented mark or marketing content.                                                                                                    |
| Design system | PASS within scope: shared button, semantic primary/focus tokens, existing type and consistent overlay surfaces.                                                                                                         |
| Accessibility | PASS for scoped labeled search/results, native dialog focus containment/restoration, Escape, explicit close actions and status text. This is not a complete WCAG audit.                                                 |
| Responsive    | PASS at 375 × 667, 360 × 640, 667 × 375 and 1440 × 900, including 11-item scrolling and touch-enabled Chromium. No physical device verification claimed.                                                                |
| Edge cases    | PASS for the scoped state matrix and retained query contracts; actual provider outages and hardware/GPU permutations are not certified.                                                                                 |
| Code quality  | PASS for 12 unit tests, lint, strict types, build and scoped formatting. No new DB changes; prior PostgreSQL evidence remains separate.                                                                                 |
| Visual QA     | PASS for Playwright desktop/mobile screenshots, hover and floating-cart inspection.                                                                                                                                     |
| Anti-slop     | PASS for the existing task surface: one green brand accent, existing neutral/token system, one Lucide icon set, no emoji/new logo/fake scarcity/fake success. Geographic imagery and availability colors serve the map. |
| Final         | PASS for locally verified B02/B03/B04 presentation correction; no reservation, deployment or production certification.                                                                                                  |

Next: B05 checkout details and authoritative quote review, then B06/B07 reservation ownership and recovery.
