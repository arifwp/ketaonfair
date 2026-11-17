import { and, asc, eq, sql } from 'drizzle-orm'
import {
  approvedStretches,
  boothRows,
  events,
  exclusions,
  inventoryRoutes,
  layoutVersions,
  slots,
} from '#/server/db/schema'
import {
  publishedBookingInventorySchema,
  publishedInventoryInputSchema,
} from '#/features/slot-inventory/slot-inventory.schema'
import type { PublishedInventoryResult } from '#/features/slot-inventory/slot-inventory.schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'

export async function readPublishedBookingInventory(
  database: BookingDatabase,
  eventId: string,
): Promise<PublishedInventoryResult> {
  publishedInventoryInputSchema.parse({ eventId })
  // Metadata, prices and claims must describe one consistent database snapshot.
  return database.transaction(
    async (transaction) => {
      const publishedLayouts = await transaction
        .select({
          event: events,
          layoutId: layoutVersions.id,
          layoutRevision: layoutVersions.revision,
        })
        .from(events)
        .innerJoin(
          layoutVersions,
          and(
            eq(layoutVersions.eventId, events.id),
            eq(layoutVersions.state, 'published'),
          ),
        )
        .where(eq(events.id, eventId))
        .limit(1)

      const publishedLayout = publishedLayouts.at(0)
      if (!publishedLayout) return { status: 'not_found' }

      const publishedSlots = await transaction
        .select({
          slotId: slots.id,
          code: slots.code,
          routeId: inventoryRoutes.id,
          routeName: inventoryRoutes.name,
          routeDisplayOrder: inventoryRoutes.displayOrder,
          displayOrder: slots.displayOrder,
          frontageMillimeters: sql<number>`COALESCE(${slots.frontageOverrideMillimeters}, ${slots.baseFrontageMillimeters})`,
          depthMillimeters: sql<number>`COALESCE(${slots.depthOverrideMillimeters}, ${slots.baseDepthMillimeters})`,
          priceIdr:
            sql`COALESCE(${slots.priceOverrideIdr}, ${slots.basePriceIdr})`.mapWith(
              Number,
            ),
          revision: slots.revision,
          availability: sql<string>`CASE WHEN ${slots.isBlocked} THEN 'blocked' WHEN EXISTS (SELECT 1 FROM slot_claims WHERE slot_id = ${slots.id} AND released_at IS NULL) THEN 'reserved' ELSE 'available' END`,
          footprint: sql<unknown>`ST_AsGeoJSON(${slots.footprint}, 15)::json`,
        })
        .from(slots)
        .innerJoin(
          approvedStretches,
          eq(slots.approvedStretchId, approvedStretches.id),
        )
        .innerJoin(boothRows, eq(approvedStretches.rowId, boothRows.id))
        .innerJoin(inventoryRoutes, eq(boothRows.routeId, inventoryRoutes.id))
        .where(
          and(
            eq(slots.eventId, eventId),
            eq(slots.layoutId, publishedLayout.layoutId),
          ),
        )
        .orderBy(
          asc(inventoryRoutes.displayOrder),
          asc(slots.displayOrder),
          asc(slots.id),
        )

      const publishedExclusions = await transaction
        .select({
          exclusionId: exclusions.id,
          reason: exclusions.reason,
          footprint: sql<unknown>`ST_AsGeoJSON(${exclusions.footprint}, 15)::json`,
        })
        .from(exclusions)
        .where(eq(exclusions.layoutId, publishedLayout.layoutId))

      const event = publishedLayout.event
      return {
        status: 'published',
        inventory: publishedBookingInventorySchema.parse({
          event: {
            eventId: event.id,
            name: event.name,
            slug: event.slug,
            timezone: event.timezone,
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt.toISOString(),
            bookingOpensAt: event.bookingOpensAt.toISOString(),
            bookingClosesAt: event.bookingClosesAt.toISOString(),
            bookingWindowState: event.bookingWindowState,
            isIllustrative: event.isIllustrative,
          },
          layoutId: publishedLayout.layoutId,
          layoutRevision: publishedLayout.layoutRevision,
          slots: publishedSlots,
          exclusions: publishedExclusions,
        }),
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
