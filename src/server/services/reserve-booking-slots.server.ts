import { createHash, randomUUID } from 'node:crypto'
import { and, asc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import {
  auditLogs,
  approvedStretches,
  bookingOrderItems,
  bookingOrders,
  boothRows,
  events,
  guestSessions,
  inventoryRoutes,
  layoutVersions,
  reservations,
  slotClaims,
  slots,
} from '#/server/db/schema'
import { bookingCheckoutReviewInputSchema } from '#/features/booking-checkout/booking-checkout.schema'
import { isBookingQuoteCurrent } from '#/features/booking-checkout/booking-checkout-review'
import { isBookingWindowOpen } from '#/shared/booking-window'
import type { BookingCheckoutReviewInput } from '#/features/booking-checkout/booking-checkout.schema'
import type { BookingReservationResult } from '#/features/booking-checkout/booking-reservation.schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'
import type { BookingQuote } from '#/features/booking-checkout/booking-checkout-review'

const RESERVATION_ATTEMPTS_PER_MINUTE = 10

export function bookingReservationPayloadHash(
  input: BookingCheckoutReviewInput,
) {
  const normalized = bookingCheckoutReviewInputSchema.parse(input)
  const reviewedQuote = {
    ...normalized.reviewedQuote,
    items: [...normalized.reviewedQuote.items].sort((left, right) =>
      left.slotId.localeCompare(right.slotId),
    ),
  }
  return createHash('sha256')
    .update(JSON.stringify({ customer: normalized.customer, reviewedQuote }))
    .digest('hex')
}

export async function reserveBookingSlots(
  database: BookingDatabase,
  guestTokenHash: string | undefined,
  input: BookingCheckoutReviewInput,
): Promise<BookingReservationResult> {
  const validated = bookingCheckoutReviewInputSchema.parse(input)
  if (!guestTokenHash) return { status: 'session_required' }
  const { customer, reviewedQuote, submissionKey } = validated
  const slotIds = reviewedQuote.items.map((item) => item.slotId).sort()
  const payloadHash = bookingReservationPayloadHash(validated)
  try {
    const result = await database.transaction(
      async (transaction): Promise<BookingReservationResult> => {
        await transaction.execute(
          sql`SELECT set_config('lock_timeout', '5s', true), set_config('statement_timeout', '15s', true)`,
        )
        // Every inventory writer must use this event → guest → sorted-slots order.
        // Read committed sees the winner's commit after waiting for the event lock.
        const event = (
          await transaction
            .select()
            .from(events)
            .where(eq(events.id, reviewedQuote.eventId))
            .for('update')
        ).at(0)
        if (!event) return { status: 'not_found' }
        const guest = (
          await transaction
            .select()
            .from(guestSessions)
            .where(
              and(
                eq(guestSessions.tokenHash, guestTokenHash),
                gt(guestSessions.expiresAt, sql`clock_timestamp()`),
              ),
            )
            .for('update')
        ).at(0)
        if (!guest) return { status: 'session_required' }
        const existing = (
          await transaction
            .select()
            .from(bookingOrders)
            .where(
              and(
                eq(bookingOrders.guestSessionId, guest.id),
                eq(bookingOrders.idempotencyKey, submissionKey),
              ),
            )
        ).at(0)
        if (existing) {
          if (existing.submissionPayloadHash !== payloadHash)
            return { status: 'idempotency_conflict' }
          return {
            status: 'reserved',
            bookingOrderId: existing.id,
            bookingReference: existing.bookingReference,
            totalPriceIdr: existing.totalPriceIdr,
            paymentState: existing.paymentState,
            state: existing.state,
          }
        }

        const recentAttempts = await transaction
          .select({ id: auditLogs.id })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.actorKind, 'guest'),
              eq(auditLogs.actorId, guest.id),
              eq(auditLogs.operation, 'booking_reservation_attempt'),
              gt(auditLogs.createdAt, new Date(Date.now() - 60_000)),
            ),
          )
          .limit(RESERVATION_ATTEMPTS_PER_MINUTE)
        if (recentAttempts.length >= RESERVATION_ATTEMPTS_PER_MINUTE)
          return { status: 'rate_limited', retryAfterSeconds: 60 }
        await transaction.insert(auditLogs).values({
          eventId: event.id,
          actorKind: 'guest',
          actorId: guest.id,
          operation: 'booking_reservation_attempt',
          entityId: submissionKey,
          correlationId: randomUUID(),
        })
        if (
          !isBookingWindowOpen(
            {
              bookingWindowState: event.bookingWindowState,
              bookingOpensAt: event.bookingOpensAt.toISOString(),
              bookingClosesAt: event.bookingClosesAt.toISOString(),
            },
            Date.now(),
          )
        )
          return { status: 'booking_closed' }

        const layout = (
          await transaction
            .select()
            .from(layoutVersions)
            .where(
              and(
                eq(layoutVersions.eventId, event.id),
                eq(layoutVersions.state, 'published'),
              ),
            )
            .for('update')
        ).at(0)
        if (!layout) return { status: 'not_found' }
        const lockedSlots = await transaction
          .select({
            slotId: slots.id,
            code: slots.code,
            revision: slots.revision,
            routeName: inventoryRoutes.name,
            frontageMillimeters: sql<number>`COALESCE(${slots.frontageOverrideMillimeters}, ${slots.baseFrontageMillimeters})`,
            depthMillimeters: sql<number>`COALESCE(${slots.depthOverrideMillimeters}, ${slots.baseDepthMillimeters})`,
            priceIdr:
              sql`COALESCE(${slots.priceOverrideIdr}, ${slots.basePriceIdr})`.mapWith(
                Number,
              ),
            isBlocked: slots.isBlocked,
            footprint: sql<
              BookingQuote['items'][number]['footprint']
            >`ST_AsGeoJSON(${slots.footprint}, 15)::json`,
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
              eq(slots.eventId, event.id),
              eq(slots.layoutId, layout.id),
              inArray(slots.id, slotIds),
            ),
          )
          .orderBy(asc(slots.id))
          .for('update', { of: slots })
        const claims = await transaction
          .select({ slotId: slotClaims.slotId })
          .from(slotClaims)
          .where(
            and(
              inArray(slotClaims.slotId, slotIds),
              isNull(slotClaims.releasedAt),
            ),
          )
        const claimedIds = new Set(claims.map((claim) => claim.slotId))
        const lockedById = new Map(
          lockedSlots.map((slot) => [slot.slotId, slot]),
        )
        const unavailableIds = slotIds.filter(
          (slotId) =>
            !lockedById.has(slotId) ||
            lockedById.get(slotId)?.isBlocked ||
            claimedIds.has(slotId),
        )
        if (unavailableIds.length > 0)
          return { status: 'slots_unavailable', slotIds: unavailableIds }
        const quote: BookingQuote = {
          status: 'quoted',
          eventId: event.id,
          layoutId: layout.id,
          layoutRevision: layout.revision,
          paymentState: 'not_integrated',
          items: lockedSlots.map(
            ({ routeName: _routeName, isBlocked: _isBlocked, ...item }) => item,
          ),
          totalPriceIdr: lockedSlots.reduce(
            (total, slot) => total + slot.priceIdr,
            0,
          ),
        }
        if (!isBookingQuoteCurrent(reviewedQuote, quote))
          return { status: 'quote_changed', quote }

        const bookingOrderId = randomUUID()
        const bookingReference = `KF-${randomUUID().replaceAll('-', '').toUpperCase()}`
        const reservationId = randomUUID()
        await transaction.insert(bookingOrders).values({
          id: bookingOrderId,
          eventId: event.id,
          layoutId: layout.id,
          guestSessionId: guest.id,
          bookingReference,
          idempotencyKey: submissionKey,
          submissionPayloadHash: payloadHash,
          ...customer,
          totalPriceIdr: quote.totalPriceIdr,
          layoutRevision: layout.revision,
        })
        await transaction.insert(bookingOrderItems).values(
          lockedSlots.map((slot) => ({
            bookingOrderId,
            slotId: slot.slotId,
            eventId: event.id,
            layoutId: layout.id,
            slotCode: slot.code,
            routeName: slot.routeName,
            frontageMillimeters: slot.frontageMillimeters,
            depthMillimeters: slot.depthMillimeters,
            unitPriceIdr: slot.priceIdr,
            slotRevision: slot.revision,
            footprint: sql`(SELECT footprint FROM slots WHERE id = ${slot.slotId})`,
          })),
        )
        await transaction.insert(reservations).values({
          id: reservationId,
          bookingOrderId,
          eventId: event.id,
          layoutId: layout.id,
        })
        await transaction.insert(slotClaims).values(
          slotIds.map((slotId) => ({
            reservationId,
            slotId,
            eventId: event.id,
            layoutId: layout.id,
          })),
        )
        await transaction
          .update(events)
          .set({
            bookingStartedAt: sql`COALESCE(${events.bookingStartedAt}, now())`,
          })
          .where(eq(events.id, event.id))
        await transaction.insert(auditLogs).values({
          eventId: event.id,
          actorKind: 'guest',
          actorId: guest.id,
          operation: 'booking_reserved',
          entityId: bookingOrderId,
          newValues: {
            slotIds,
            totalPriceIdr: quote.totalPriceIdr,
            paymentState: 'not_integrated',
          },
          correlationId: randomUUID(),
        })
        return {
          status: 'reserved',
          bookingOrderId,
          bookingReference,
          totalPriceIdr: quote.totalPriceIdr,
          paymentState: 'not_integrated',
          state: 'reserved',
        }
      },
    )
    if (result.status === 'reserved')
      console.info(
        JSON.stringify({
          operation: 'booking_reserved_or_recovered',
          bookingOrderId: result.bookingOrderId,
          eventId: reviewedQuote.eventId,
          slotCount: slotIds.length,
        }),
      )
    return result
  } catch (error) {
    if (isActiveClaimConflict(error)) {
      const activeClaims = await database
        .select({ slotId: slotClaims.slotId })
        .from(slotClaims)
        .where(
          and(
            inArray(slotClaims.slotId, slotIds),
            isNull(slotClaims.releasedAt),
          ),
        )
      if (activeClaims.length === 0) throw error
      return {
        status: 'slots_unavailable',
        slotIds: activeClaims.map((claim) => claim.slotId),
      }
    }
    throw error
  }
}

function isActiveClaimConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'one_active_claim_per_slot'
  )
    return true
  return isActiveClaimConflict(error.cause)
}
