import { z } from 'zod'

export const privateBookingOrderInputSchema = z.object({
  bookingOrderId: z.uuid(),
})

export type PrivateBookingOrderResult =
  | { status: 'not_found' }
  | {
      status: 'found'
      order: {
        bookingOrderId: string
        bookingReference: string
        contactName: string
        sellingDescription: string
        email: string
        phone: string
        note: string
        state: 'reserved' | 'cancelled'
        paymentState: 'not_integrated'
        totalPriceIdr: number
        reservedAt: string
        timezone: string
        cancelledAt: string | null
        items: {
          slotId: string
          code: string
          frontageMillimeters: number
          depthMillimeters: number
          priceIdr: number
        }[]
      }
    }
