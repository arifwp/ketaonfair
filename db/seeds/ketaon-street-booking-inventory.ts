import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import starterRoute from './fixtures/ketaon-starter-route.json'
import {
  approvedStretches,
  auditLogs,
  boothRows,
  events,
  exclusions,
  inventoryRoutes,
  layoutVersions,
  slots,
} from '#/server/db/schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'
import type { PgInsertValue } from 'drizzle-orm/pg-core'

export const KETAON_STREET_DEMO_EVENT_ID =
  '479672ed-1562-4a89-a21a-09bbd7f96441'
export const KETAON_STREET_DEMO_LAYOUT_ID =
  '74c903a6-f125-4f2c-aa9a-f3f252ba70d0'

type MetricPoint = [number, number]

function metricPointAlongRow(
  origin: MetricPoint,
  direction: MetricPoint,
  along: number,
  outward: number,
  side: number,
) {
  return `${(origin[0] + direction[0] * along - direction[1] * outward * side).toFixed(6)} ${(origin[1] + direction[1] * along + direction[0] * outward * side).toFixed(6)}`
}

function streetFixtureFootprint(
  origin: MetricPoint,
  direction: MetricPoint,
  side: number,
  startMillimeters: number,
  endMillimeters: number,
  nearMillimeters: number,
  farMillimeters: number,
) {
  const vertices: string[] = []
  const append = (along: number, outward: number) =>
    vertices.push(
      metricPointAlongRow(
        origin,
        direction,
        along / 1000,
        outward / 1000,
        side,
      ),
    )
  // A common 100 mm edge grid keeps shared edges identical after projection.
  for (let along = startMillimeters; along < endMillimeters; along += 100)
    append(along, nearMillimeters)
  for (let outward = nearMillimeters; outward < farMillimeters; outward += 100)
    append(endMillimeters, outward)
  for (let along = endMillimeters; along > startMillimeters; along -= 100)
    append(along, farMillimeters)
  for (let outward = farMillimeters; outward > nearMillimeters; outward -= 100)
    append(startMillimeters, outward)
  append(startMillimeters, nearMillimeters)
  return sql`ST_SnapToGrid(ST_Transform(ST_GeomFromText(${`POLYGON((${vertices.join(',')}))`}, 32749), 4326), 0.000000000001)`
}

export async function seedKetaonStreetBookingInventory(
  database: BookingDatabase,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(781402)`)
    const existing = await transaction
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, KETAON_STREET_DEMO_EVENT_ID))
    if (existing.length) return { status: 'already_seeded' as const }
    const now = new Date()
    const startsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    await transaction.insert(events).values({
      id: KETAON_STREET_DEMO_EVENT_ID,
      slug: 'ketaon-street-demo',
      name: 'Ketaon Fair · illustrative street layout',
      timezone: 'Asia/Jakarta',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000),
      bookingOpensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      bookingClosesAt: startsAt,
      bookingWindowState: 'open',
      defaultSlotFrontageMillimeters: 1500,
      defaultSlotDepthMillimeters: 2000,
      defaultSlotPriceIdr: 250000,
      isIllustrative: true,
    })
    await transaction.insert(layoutVersions).values({
      id: KETAON_STREET_DEMO_LAYOUT_ID,
      eventId: KETAON_STREET_DEMO_EVENT_ID,
      version: 1,
      state: 'draft',
      approvalNote: starterRoute.notice,
    })
    const routeId = randomUUID()
    await transaction.insert(inventoryRoutes).values({
      id: routeId,
      eventId: KETAON_STREET_DEMO_EVENT_ID,
      layoutId: KETAON_STREET_DEMO_LAYOUT_ID,
      name: starterRoute.name,
      displayOrder: 0,
    })
    const projectedResult = await transaction.execute(
      sql`SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(starterRoute.geometry)}),4326),32749))::json AS geometry`,
    )
    const projected = z
      .object({ coordinates: z.array(z.tuple([z.number(), z.number()])) })
      .parse(projectedResult.rows[0]?.geometry)
    const slotCounts = { left: 0, right: 0 }
    // The short market-entry spur and road bends remain open in this demo.
    for (
      let segmentIndex = 2;
      segmentIndex < projected.coordinates.length;
      segmentIndex += 1
    ) {
      const start = projected.coordinates.at(segmentIndex - 1)
      const end = projected.coordinates.at(segmentIndex)
      if (!start || !end) continue
      const segmentLengthMeters = Math.hypot(
        end[0] - start[0],
        end[1] - start[1],
      )
      if (segmentLengthMeters < 15) continue
      const direction: MetricPoint = [
        (end[0] - start[0]) / segmentLengthMeters,
        (end[1] - start[1]) / segmentLengthMeters,
      ]
      const origin: MetricPoint = [
        start[0] + direction[0] * 2,
        start[1] + direction[1] * 2,
      ]
      const rowLengthMillimeters =
        Math.floor((segmentLengthMeters - 4) * 10) * 100
      for (const footprintSide of ['left', 'right'] as const) {
        const side = footprintSide === 'left' ? 1 : -1
        const rowId = randomUUID()
        const stretchId = randomUUID()
        const rowLabel = `${footprintSide === 'left' ? 'Left' : 'Right'} side from Pasar Ketaon · section ${segmentIndex - 1}`
        await transaction.insert(boothRows).values({
          id: rowId,
          eventId: KETAON_STREET_DEMO_EVENT_ID,
          layoutId: KETAON_STREET_DEMO_LAYOUT_ID,
          routeId,
          label: rowLabel,
          footprintSide,
          centerline: sql`ST_Transform(ST_GeomFromText(${`LINESTRING(${metricPointAlongRow(origin, direction, 0, 3, side)},${metricPointAlongRow(origin, direction, rowLengthMillimeters / 1000, 3, side)})`},32749),4326)`,
        })
        await transaction.insert(approvedStretches).values({
          id: stretchId,
          eventId: KETAON_STREET_DEMO_EVENT_ID,
          layoutId: KETAON_STREET_DEMO_LAYOUT_ID,
          rowId,
          startMillimeters: 0,
          endMillimeters: rowLengthMillimeters,
          defaultFrontageMillimeters: 1500,
          defaultDepthMillimeters: 2000,
          isApproved: true,
          approvalNote:
            'Illustrative demo permission only. Not homeowner or organizer approval.',
          footprint: streetFixtureFootprint(
            origin,
            direction,
            side,
            -100,
            rowLengthMillimeters + 100,
            2900,
            6100,
          ),
        })
        const gapStartMillimeters =
          Math.floor(rowLengthMillimeters / 2 / 100) * 100
        const gapEndMillimeters = gapStartMillimeters + 3000
        await transaction.insert(exclusions).values({
          eventId: KETAON_STREET_DEMO_EVENT_ID,
          layoutId: KETAON_STREET_DEMO_LAYOUT_ID,
          rowId,
          startMillimeters: gapStartMillimeters,
          endMillimeters: gapEndMillimeters,
          reason: 'Illustrative access gap — position requires site approval',
          footprint: streetFixtureFootprint(
            origin,
            direction,
            side,
            gapStartMillimeters,
            gapEndMillimeters,
            3000,
            6000,
          ),
        })
        let nextStartMillimeters = 0
        const rowSlots: PgInsertValue<typeof slots>[] = []
        while (nextStartMillimeters < rowLengthMillimeters) {
          const slotIndex = slotCounts[footprintSide]
          const frontageMillimeters = [1200, 1500, 2100][slotIndex % 3] ?? 1500
          if (
            nextStartMillimeters < gapEndMillimeters &&
            nextStartMillimeters + frontageMillimeters > gapStartMillimeters
          )
            nextStartMillimeters = gapEndMillimeters
          if (nextStartMillimeters + frontageMillimeters > rowLengthMillimeters)
            break
          const depthMillimeters = slotIndex % 10 === 2 ? 2500 : 2000
          const code = `${footprintSide === 'left' ? 'L' : 'R'}-${String(slotIndex + 1).padStart(3, '0')}`
          rowSlots.push({
            eventId: KETAON_STREET_DEMO_EVENT_ID,
            layoutId: KETAON_STREET_DEMO_LAYOUT_ID,
            approvedStretchId: stretchId,
            code,
            displayOrder: slotIndex,
            startMillimeters: nextStartMillimeters,
            endMillimeters: nextStartMillimeters + frontageMillimeters,
            baseFrontageMillimeters: 1500,
            baseDepthMillimeters: 2000,
            frontageOverrideMillimeters:
              frontageMillimeters === 1500 ? null : frontageMillimeters,
            depthOverrideMillimeters:
              depthMillimeters === 2000 ? null : depthMillimeters,
            basePriceIdr: 250000,
            priceOverrideIdr: slotIndex % 7 === 0 ? 325000 : null,
            isBlocked: slotIndex === 18,
            blockedReason:
              slotIndex === 18 ? 'Illustrative organizer restriction' : null,
            footprint: streetFixtureFootprint(
              origin,
              direction,
              side,
              nextStartMillimeters,
              nextStartMillimeters + frontageMillimeters,
              3000,
              3000 + depthMillimeters,
            ),
          })
          nextStartMillimeters += frontageMillimeters
          slotCounts[footprintSide] += 1
        }
        if (rowSlots.length) await transaction.insert(slots).values(rowSlots)
      }
    }
    await transaction
      .update(layoutVersions)
      .set({ state: 'published', publishedAt: now })
      .where(eq(layoutVersions.id, KETAON_STREET_DEMO_LAYOUT_ID))
    await transaction.insert(auditLogs).values({
      eventId: KETAON_STREET_DEMO_EVENT_ID,
      actorKind: 'system',
      actorId: 'illustrative-street-seed',
      operation: 'illustrative_street_inventory_published',
      entityId: KETAON_STREET_DEMO_LAYOUT_ID,
      newValues: {
        slotCounts,
        source: starterRoute.source,
        sourceUrl: starterRoute.sourceUrl,
        isIllustrative: true,
      },
      correlationId: randomUUID(),
    })
    return { status: 'seeded' as const, slotCounts }
  })
}
