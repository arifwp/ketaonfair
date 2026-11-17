import { z } from 'zod'
import { MAX_BOOKING_SLOT_COUNT } from '#/shared/booking-limits'
import type { PublishedBookingSlot } from '#/features/slot-inventory/slot-inventory.schema'

export const bookingQuoteInputSchema = z.object({
  eventId: z.uuid(),
  slotIds: z
    .array(z.uuid())
    .min(1)
    .max(MAX_BOOKING_SLOT_COUNT)
    .refine(
      (slotIds) => new Set(slotIds).size === slotIds.length,
      'Each slot may appear only once.',
    ),
})

export type BookingQuoteInput = z.infer<typeof bookingQuoteInputSchema>

export type BookingQuoteItem = Pick<
  PublishedBookingSlot,
  | 'slotId'
  | 'code'
  | 'routeName'
  | 'frontageMillimeters'
  | 'depthMillimeters'
  | 'priceIdr'
  | 'revision'
  | 'footprint'
>

export type BookingQuoteResult =
  | {
      status: 'quoted'
      eventId: string
      layoutId: string
      layoutRevision: number
      items: BookingQuoteItem[]
      totalPriceIdr: number
      paymentState: 'not_integrated'
    }
  | { status: 'not_found' }
  | { status: 'booking_closed' }
  | { status: 'slots_unavailable'; slotIds: string[] }
