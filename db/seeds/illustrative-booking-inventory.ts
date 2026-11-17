import { sql } from 'drizzle-orm'
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

export const ILLUSTRATIVE_EVENT_ID = 'c180aeb3-772c-469b-a37b-38d022103821'
export const ILLUSTRATIVE_LAYOUT_ID = 'd5fb7235-845f-48b3-813e-f7935889e40f'

// Synthetic UTM zone 49S rectangles, not a surveyed venue or real sales inventory.
function illustrativeFootprint(
  startMeters: number,
  endMeters: number,
  rowOffsetMeters: number,
  depthMeters = 2,
) {
  // Shared 100 mm vertices avoid transforming unequal straight polygon edges
  // into subtly different WGS84 chords. Snap only at sub-micrometer precision.
  return sql`ST_SnapToGrid(ST_Transform(ST_Segmentize(ST_MakeEnvelope(${450000 + startMeters}, ${9170000 + rowOffsetMeters}, ${450000 + endMeters}, ${9170000 + rowOffsetMeters + depthMeters}, 32749), 0.1), 4326), 0.000000000001)`
}

export async function seedIllustrativeBookingInventory(
  database: BookingDatabase,
) {
  return database.transaction(async (transaction) => {
    // The seed is insert-only and idempotent. It never clears existing reservations.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(781401)`)
    const existing = await transaction
      .select({ id: events.id })
      .from(events)
      .where(sql`${events.id} = ${ILLUSTRATIVE_EVENT_ID}`)
    if (existing.length) return { status: 'already_seeded' as const }

    const now = new Date()
    const startsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const endsAt = new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000)
    await transaction.insert(events).values({
      id: ILLUSTRATIVE_EVENT_ID,
      slug: 'illustrative-booking-demo',
      name: 'Illustrative booking demo — not surveyed inventory',
      timezone: 'Asia/Jakarta',
      startsAt,
      endsAt,
      bookingOpensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      bookingClosesAt: startsAt,
      bookingWindowState: 'open',
      defaultSlotFrontageMillimeters: 1500,
      defaultSlotDepthMillimeters: 2000,
      defaultSlotPriceIdr: 250000,
      isIllustrative: true,
    })
    await transaction.insert(layoutVersions).values({
      id: ILLUSTRATIVE_LAYOUT_ID,
      eventId: ILLUSTRATIVE_EVENT_ID,
      version: 1,
      state: 'draft',
      approvalNote: 'Synthetic geometry for prototype verification only.',
    })

    for (const [routeIndex, prefix] of ['A', 'B'].entries()) {
      const routeId = crypto.randomUUID()
      const rowId = crypto.randomUUID()
      const stretchId = crypto.randomUUID()
      const rowOffsetMeters = routeIndex * 20
      await transaction.insert(inventoryRoutes).values({
        id: routeId,
        eventId: ILLUSTRATIVE_EVENT_ID,
        layoutId: ILLUSTRATIVE_LAYOUT_ID,
        name: `Illustrative route ${prefix}`,
        displayOrder: routeIndex,
      })
      await transaction.insert(boothRows).values({
        id: rowId,
        eventId: ILLUSTRATIVE_EVENT_ID,
        layoutId: ILLUSTRATIVE_LAYOUT_ID,
        routeId,
        label: `Illustrative row ${prefix}`,
        footprintSide: 'left',
        centerline: sql`ST_Transform(ST_GeomFromText(${`LINESTRING(450000 ${9170000 + rowOffsetMeters},450100 ${9170000 + rowOffsetMeters})`}, 32749), 4326)`,
      })
      await transaction.insert(approvedStretches).values({
        id: stretchId,
        eventId: ILLUSTRATIVE_EVENT_ID,
        layoutId: ILLUSTRATIVE_LAYOUT_ID,
        rowId,
        startMillimeters: 0,
        endMillimeters: 100000,
        defaultFrontageMillimeters: 1500,
        defaultDepthMillimeters: 2000,
        isApproved: true,
        approvalNote: 'Illustrative approval, not organizer/site approval.',
        footprint: illustrativeFootprint(
          -0.1,
          100.1,
          rowOffsetMeters - 0.1,
          3.2,
        ),
      })
      await transaction.insert(exclusions).values({
        eventId: ILLUSTRATIVE_EVENT_ID,
        layoutId: ILLUSTRATIVE_LAYOUT_ID,
        rowId,
        startMillimeters: 20000,
        endMillimeters: 23000,
        reason: 'Illustrative access gap',
        footprint: illustrativeFootprint(20, 23, rowOffsetMeters, 3),
      })

      let nextStartMillimeters = 0
      const illustrativeSlots = Array.from({ length: 30 }, (_, slotIndex) => {
        const frontageMillimeters = [1200, 1500, 2100][slotIndex % 3] ?? 1500
        if (
          nextStartMillimeters < 23000 &&
          nextStartMillimeters + frontageMillimeters > 20000
        ) {
          nextStartMillimeters = 23000
        }
        const startMillimeters = nextStartMillimeters
        nextStartMillimeters += frontageMillimeters
        const hasDepthOverride = slotIndex % 10 === 2
        return {
          eventId: ILLUSTRATIVE_EVENT_ID,
          layoutId: ILLUSTRATIVE_LAYOUT_ID,
          approvedStretchId: stretchId,
          code: `${prefix}-${String(slotIndex + 1).padStart(3, '0')}`,
          displayOrder: slotIndex,
          startMillimeters,
          endMillimeters: nextStartMillimeters,
          baseFrontageMillimeters: 1500,
          baseDepthMillimeters: 2000,
          frontageOverrideMillimeters:
            frontageMillimeters === 1500 ? null : frontageMillimeters,
          depthOverrideMillimeters: hasDepthOverride ? 2500 : null,
          basePriceIdr: 250000,
          // Price differences deliberately do not follow the frontage pattern.
          priceOverrideIdr: slotIndex % 7 === 0 ? 325000 : null,
          footprint: illustrativeFootprint(
            startMillimeters / 1000,
            nextStartMillimeters / 1000,
            rowOffsetMeters,
            hasDepthOverride ? 2.5 : 2,
          ),
          isBlocked: slotIndex === 29,
          blockedReason:
            slotIndex === 29 ? 'Illustrative organizer restriction' : null,
        }
      })
      await transaction.insert(slots).values(illustrativeSlots)
    }

    await transaction
      .update(layoutVersions)
      .set({ state: 'published', publishedAt: now })
      .where(sql`${layoutVersions.id} = ${ILLUSTRATIVE_LAYOUT_ID}`)
    await transaction.insert(auditLogs).values({
      eventId: ILLUSTRATIVE_EVENT_ID,
      actorKind: 'system',
      actorId: 'illustrative-seed',
      operation: 'illustrative_inventory_published',
      entityId: ILLUSTRATIVE_LAYOUT_ID,
      newValues: { slotCount: 60, routeCount: 2, isIllustrative: true },
      correlationId: crypto.randomUUID(),
    })
    return { status: 'seeded' as const }
  })
}
