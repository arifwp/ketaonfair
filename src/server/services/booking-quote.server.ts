import { bookingQuoteInputSchema } from '#/features/booking-checkout/booking-quote.schema'
import { isBookingWindowOpen } from '#/shared/booking-window'
import { readPublishedBookingInventory } from './published-booking-inventory.server'
import type {
  BookingQuoteInput,
  BookingQuoteResult,
} from '#/features/booking-checkout/booking-quote.schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'

export async function readBookingQuote(
  database: BookingDatabase,
  input: BookingQuoteInput,
): Promise<BookingQuoteResult> {
  const { eventId, slotIds } = bookingQuoteInputSchema.parse(input)
  const result = await readPublishedBookingInventory(database, eventId)
  if (result.status === 'not_found') return result
  const { inventory } = result
  if (!isBookingWindowOpen(inventory.event, Date.now()))
    return { status: 'booking_closed' }

  const slotById = new Map(inventory.slots.map((slot) => [slot.slotId, slot]))
  const unavailableSlotIds = slotIds.filter(
    (slotId) => slotById.get(slotId)?.availability !== 'available',
  )
  if (unavailableSlotIds.length)
    return { status: 'slots_unavailable', slotIds: unavailableSlotIds }

  const items = slotIds.map((slotId) => {
    const slot = slotById.get(slotId)
    if (!slot) throw new Error('Validated quote slot is missing.')
    return {
      slotId: slot.slotId,
      code: slot.code,
      routeName: slot.routeName,
      frontageMillimeters: slot.frontageMillimeters,
      depthMillimeters: slot.depthMillimeters,
      priceIdr: slot.priceIdr,
      revision: slot.revision,
      footprint: slot.footprint,
    }
  })
  // This is review data, not an allocation or a promise that inventory stays free.
  return {
    status: 'quoted',
    eventId,
    layoutId: inventory.layoutId,
    layoutRevision: inventory.layoutRevision,
    items,
    totalPriceIdr: items.reduce((total, item) => total + item.priceIdr, 0),
    paymentState: 'not_integrated',
  }
}
