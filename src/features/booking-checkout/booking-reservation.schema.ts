import type { BookingQuote } from './booking-checkout-review'
import type { BookingQuoteResult } from './booking-quote.schema'

export type BookingReservationResult =
  | {
      status: 'reserved'
      bookingOrderId: string
      bookingReference: string
      totalPriceIdr: number
      paymentState: 'not_integrated'
      state: 'reserved' | 'cancelled'
    }
  | Exclude<BookingQuoteResult, { status: 'quoted' }>
  | { status: 'quote_changed'; quote: BookingQuote }
  | { status: 'session_required' }
  | { status: 'idempotency_conflict' }
  | { status: 'rate_limited'; retryAfterSeconds: number }
