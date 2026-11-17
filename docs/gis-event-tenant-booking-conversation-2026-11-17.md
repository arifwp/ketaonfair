# GIS Event Tenant Booking — Conversation

Date: 17 November 2026  
Scope: Project discussion and proposed solution. Tool activity and environment instructions are omitted.

## User — Project request

saya ingin initiate project berbasis GIS.

ini adalah project untuk penjualan tenant dalam suat event. jadi pembeli bisa checkout berdasarkan slot yang tersedia disini. dalam satu slot panjangnya 1.5 meter (dinamis, bisa juga 1.2 meter atau bahkan 2 meter). jadi nanti user/customer bisa langsung klik pada available slot dan menuju checkout page, bisa juga memilih beberapa slot yang tersedia.

propose tech stack yang digunakan (prefer untuk frontend react + tanstack start +typescript) dan untuk payment integration menggunakan midtrans, dan db menggunakan neon, namun saya bingung untuk integrasi pada GIS nya.

saya ingin membuat prototype nya dulu untuk demo.

Serta cara mengatur slot, karena rutenya sangat dinamis, jadi bisa saja diantara para rumah tersebut harus dikasih jeda untuk slot (karena itu halaman depan rumah warga) namun kebanyakan halaman depan rumah warga boleh untuk dikasih slot. serta untuk rute slot nya bisa dinamis bisa saja pada toko sudarman sampai les baca AHE dikasih slot, bisa saja untuk jalan ke makan mbah budo dikasih slot dengan beberapa jeda diantaranya.

Attached reference image:

![Map screenshot supplied by the user](</Users/arifwahyu/Desktop/Screenshot 2026-11-17 at 14.23.43.png>)

## Assistant — Progress update

I’ll assess how to model routes, sellable slots, and gaps, then propose a stack and demo scope. I’ll also check the current mapping, Neon, and Midtrans options.

## Assistant — Progress update

The key design choice is to separate the road route from the stretches where booths are approved. Each stretch can have its own slot size, side of the road, and access gaps. Also, satellite imagery can guide placement, but it cannot establish reliable 1.2–2 m booth boundaries without measurements on the ground.

## Assistant — Proposed solution

**I recommend React + TanStack Start + TypeScript, with MapLibre for the map, Terra Draw for layout editing, Turf.js for slot generation, Neon Postgres + PostGIS for storage, and Midtrans Snap for checkout.**

The central design decision is **how you model sellable space**. A road route alone does not tell you where booths may be placed. You need separately approved stretches, access gaps, and individual slots.

For the prototype, I would build both the organizer’s layout editor and the customer’s booking flow.

**The proposed stack**

| Layer           | Recommendation                               | Purpose                                                   |
| --------------- | -------------------------------------------- | --------------------------------------------------------- |
| Application     | React, TanStack Start, TypeScript            | Customer pages, organizer dashboard, server logic         |
| Map             | MapLibre GL JS + `react-map-gl/maplibre`     | Display routes, clickable slots, and availability         |
| Basemap         | MapTiler streets and satellite               | Geographic context                                        |
| Drawing tools   | Terra Draw with its MapLibre adapter         | Draw and edit booth rows and exclusion areas              |
| Geometry        | Turf.js                                      | Split rows into slots and calculate preview geometry      |
| Database        | Neon Postgres + PostGIS                      | Store layouts, spatial geometry, reservations, and orders |
| Database access | Drizzle ORM, with SQL for spatial operations | Schema management and database queries                    |
| Availability    | TanStack Query                               | Refresh availability and checkout state                   |
| Payment         | Midtrans Snap Sandbox                        | Demonstrate payment without real charges                  |
| Deployment      | Vercel                                       | Shareable demo and public payment webhook                 |

MapLibre supports clickable GeoJSON polygons, and the React wrapper provides declarative map components. Terra Draw provides the editing tools. These fit your custom booth layout well. [MapLibre example](https://maplibre.org/maplibre-gl-js/docs/examples/show-polygon-information-on-click/), [React integration](https://visgl.github.io/react-map-gl/docs), [Terra Draw](https://www.osgeo.org/projects/terra-draw/).

TanStack Start can also handle the backend. Use server functions for application operations and a server route for Midtrans’s webhook. A separate backend service would add little value to this prototype. [TanStack server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).

**How to model your dynamic routes**

I suggest this hierarchy:

```text
Event
└── Layout version
    ├── Route A
    │   ├── Approved booth row on one side
    │   │   ├── Sellable stretch → individual slots
    │   │   ├── Access gap → no slots
    │   │   └── Sellable stretch → individual slots
    │   └── Approved booth row on the opposite side
    └── Route B
        └── Its own rows, gaps, and slots
```

Applied to your example:

- **Route A** could follow Toko Sudarman toward Les Baca AHE.
- **Route B** could follow the road toward Makam Mbah Budo.
- Each route can be enabled independently for an event.
- Each side of a road has separate availability and access restrictions.
- Each approved stretch can use a different slot length.

These are layout examples, not confirmation that those locations are available.

For the first prototype, **draw booth rows along the actual frontage**, rather than drawing the road centerline and automatically placing booths on both sides. This gives you more direct control around houses, junctions, and irregular road edges.

Keep a fixed start-to-end direction for every row. Slot numbering and “left/right” must remain stable when someone rotates the map.

**How organizers should manage slots and gaps**

The organizer workflow should be:

1. Draw a booth row along the permitted frontage.
2. Set the slot length, booth depth, and price.
3. Mark access gaps for gates, entrances, junctions, or other restrictions.
4. Preview generated slots.
5. Adjust individual slots where necessary.
6. Publish the approved layout.

**Unreviewed frontage should remain unavailable.** “Most homeowners allow booths” is not a reliable rule for generating inventory. Approval needs to be recorded per stretch, ideally with a reference point, note, and confirmation status.

Store positions as distances along a row. For example, this hypothetical row could contain:

| Distance from row start | Treatment      |
| ----------------------- | -------------- |
| 0–18 m                  | Sellable       |
| 18–22 m                 | House entrance |
| 22–40 m                 | Sellable       |
| 40–46 m                 | Access gap     |
| 46–70 m                 | Sellable       |

With 1.5 m slots, the three sellable stretches produce **12 + 12 + 16 = 40 slots**.

Calculate each uninterrupted stretch separately. A slot must never bridge a gap, and leftover space should remain unused unless the organizer explicitly adjusts the layout.

Turf’s `lineSliceAlong` can extract sections between distances along a line, which is useful for this generation process. [Turf documentation](https://turfjs.org/docs/api/lineSliceAlong).

Two dimensions need separate fields:

- **Frontage length** along the row, such as 1.2, 1.5, or 2 m.
- **Booth depth** extending away from the frontage.

Length alone cannot define the polygon customers click.

For the prototype, let the organizer choose the size per stretch, then generate fixed inventory. Customers buy existing slots. Allowing customers to request arbitrary lengths would introduce a more complex allocation problem.

**Map accuracy is the main operational risk**

Your screenshot is useful for understanding the area, but it cannot establish accurate 1.5 m boundaries. Satellite imagery may be blurry, offset, outdated, or obscured by roofs and trees.

MapTiler lists approximately 1 m per pixel across many densely populated Southeast Asian regions. That does not establish the resolution or positioning accuracy at this particular location. Increasing zoom does not create additional ground detail. [MapTiler satellite documentation](https://docs.maptiler.com/schema-raster/satellite/).

For the demo, label the layout as illustrative. Before selling real space:

- Measure the usable frontage and access gaps on site.
- Record recognizable reference points and photos.
- Approve and physically number the final slots.

Keep **measured dimensions** separate from **display geometry**. An accurate-looking polygon is not proof of accurate ground placement.

Use geographic coordinates for display, but calculate distances with geodesic functions or a suitable local metric projection. PostGIS documents that ordinary geometry measurements use the coordinate system’s units, while geography lengths are measured in meters. [PostGIS measurement documentation](https://postgis.net/docs/ST_Length.html).

**How booking and Midtrans should work**

The customer flow should be:

```text
Select slots → Review selection → Reserve slots
→ Checkout → Midtrans → Confirmed booking
```

Clicking a slot should add it to a selection panel. This supports selecting several slots before checkout. Offer a clear “Continue to checkout” action.

Keep these states distinct:

- **Selected** — local customer selection, without guaranteed availability.
- **Held** — temporarily reserved by the server.
- **Sold** — confirmed after payment verification.
- **Blocked** — unavailable by organizer decision.

When checkout starts, the server must reserve all requested slots in one database transaction. If one is unavailable, reject the selection and show the conflict. Database locking and constraints must prevent two orders from owning the same slot.

The server should calculate prices and create the Midtrans transaction. Confirm payment through a verified, repeat-safe webhook handler, with status reconciliation when needed. A browser success callback is insufficient confirmation. [Midtrans integration](https://docs.midtrans.com/docs/snap-snap-integration-guide), [webhook handling](https://docs.midtrans.com/docs/https-notification-webhooks).

**Reservation expiry needs special care.** Expiring the Snap page does not necessarily expire a previously issued payment code. Do not release a slot solely because the website countdown reaches zero. Coordinate the reservation deadline with the payment method’s expiry and reconcile uncertain payments before reallocating inventory. [Midtrans expiry behavior](https://docs.midtrans.com/reference/expire-a-snap-session).

**The minimum database model**

Use these core records:

| Record                            | Responsibility                                          |
| --------------------------------- | ------------------------------------------------------- |
| Events and layout versions        | Event details and published layout                      |
| Routes and booth rows             | Geometry and stable direction                           |
| Approved stretches and exclusions | Permission, dimensions, gaps, and notes                 |
| Slots                             | Stable ID, number, position, dimensions, polygon, price |
| Orders and order items            | Customer details and purchased slot snapshots           |
| Reservations                      | Slot ownership and expiry                               |
| Payment attempts                  | Midtrans references and payment status                  |

Neon supports PostGIS, so spatial data and booking data can live in the same database. [Neon PostGIS documentation](https://neon.com/docs/extensions/postgis).

Once reservations exist, prevent unrestricted layout regeneration. Moving or renumbering sold slots silently would change what customers purchased.

**The prototype I would prioritize**

1. **Validate the layout model first.** One event, your two proposed routes, configurable sizes, and several explicit access gaps.
2. **Build the organizer editor.** Draw rows, edit gaps, generate slots, preview, and publish.
3. **Build customer selection.** Clickable slots, multiple selection, dimensions, prices, and a synchronized slot list for mobile users.
4. **Add transactional reservations and Midtrans Sandbox.**
5. **Demonstrate failure cases.** Two customers choosing the same slot, expired checkout, duplicate payment notifications, and attempted edits to reserved slots.

Start with **50–100 illustrative slots**. Refresh availability periodically for the demo, while keeping checkout validation authoritative on the server.

The first milestone should prove that an organizer can change a route, preserve house access, and regenerate valid slots. That is the distinctive and least-proven part of this product.

## User — Export request

save this conversation to markdown file

## Assistant — Export acknowledgment

I’ll save your project request and the proposed solution in a Markdown file.
