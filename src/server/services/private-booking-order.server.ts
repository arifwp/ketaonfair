import { and, asc, eq, gt, sql } from 'drizzle-orm'
import {
  bookingOrderItems,
  bookingOrders,
  guestSessions,
  events,
} from '#/server/db/schema'
import { privateBookingOrderInputSchema } from '#/features/booking-orders/booking-order.schema'
import type { PrivateBookingOrderResult } from '#/features/booking-orders/booking-order.schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'

export async function readPrivateBookingOrder(
  database: BookingDatabase,
  guestTokenHash: string | undefined,
  bookingOrderId: string,
): Promise<PrivateBookingOrderResult> {
  privateBookingOrderInputSchema.parse({ bookingOrderId })
  if (!guestTokenHash) return { status: 'not_found' }
  return database.transaction(
    async (transaction) => {
      const stored = (
        await transaction
          .select({ order: bookingOrders, timezone: events.timezone })
          .from(bookingOrders)
          .innerJoin(
            guestSessions,
            eq(guestSessions.id, bookingOrders.guestSessionId),
          )
          .innerJoin(events, eq(events.id, bookingOrders.eventId))
          .where(
            and(
              eq(bookingOrders.id, bookingOrderId),
              eq(guestSessions.tokenHash, guestTokenHash),
              gt(guestSessions.expiresAt, sql`clock_timestamp()`),
            ),
          )
          .limit(1)
      ).at(0)
      if (!stored) return { status: 'not_found' }
      const items = await transaction
        .select({
          slotId: bookingOrderItems.slotId,
          code: bookingOrderItems.slotCode,
          frontageMillimeters: bookingOrderItems.frontageMillimeters,
          depthMillimeters: bookingOrderItems.depthMillimeters,
          priceIdr: bookingOrderItems.unitPriceIdr,
        })
        .from(bookingOrderItems)
        .where(eq(bookingOrderItems.bookingOrderId, bookingOrderId))
        .orderBy(asc(bookingOrderItems.slotCode))
      const order = stored.order
      return {
        status: 'found',
        order: {
          bookingOrderId: order.id,
          bookingReference: order.bookingReference,
          contactName: order.contactName,
          sellingDescription: order.sellingDescription ?? '',
          email: order.email,
          phone: order.phone,
          note: order.note,
          state: order.state,
          paymentState: order.paymentState,
          totalPriceIdr: order.totalPriceIdr,
          reservedAt: order.reservedAt.toISOString(),
          timezone: stored.timezone,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          items,
        },
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}

export async function recoverPrivateBookingOrder(
  database: BookingDatabase,
  guestTokenHash: string | undefined,
  submissionKey: string,
) {
  if (!guestTokenHash) return { status: 'not_found' as const }
  const stored = (
    await database
      .select({ bookingOrderId: bookingOrders.id })
      .from(bookingOrders)
      .innerJoin(
        guestSessions,
        eq(guestSessions.id, bookingOrders.guestSessionId),
      )
      .where(
        and(
          eq(bookingOrders.idempotencyKey, submissionKey),
          eq(guestSessions.tokenHash, guestTokenHash),
          gt(guestSessions.expiresAt, sql`clock_timestamp()`),
        ),
      )
      .limit(1)
  ).at(0)
  return stored
    ? { status: 'found' as const, bookingOrderId: stored.bookingOrderId }
    : { status: 'not_found' as const }
}
