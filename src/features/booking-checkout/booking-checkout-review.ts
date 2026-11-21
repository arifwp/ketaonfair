import type { BookingQuoteResult } from './booking-quote.schema'
import type { ReviewedBookingQuote } from './booking-checkout.schema'

export type BookingQuote = Extract<BookingQuoteResult, { status: 'quoted' }>
export function getReviewedBookingQuote(
  quote: BookingQuote,
): ReviewedBookingQuote {
  return {
    eventId: quote.eventId,
    layoutId: quote.layoutId,
    layoutRevision: quote.layoutRevision,
    totalPriceIdr: quote.totalPriceIdr,
    items: quote.items
      .map((item) => ({
        slotId: item.slotId,
        revision: item.revision,
        frontageMillimeters: item.frontageMillimeters,
        depthMillimeters: item.depthMillimeters,
        priceIdr: item.priceIdr,
      }))
      .sort((left, right) => left.slotId.localeCompare(right.slotId)),
  }
}

export function isBookingQuoteCurrent(
  expected: ReviewedBookingQuote,
  actual: BookingQuote,
) {
  const current = getReviewedBookingQuote(actual)
  const expectedItems = new Map(
    expected.items.map((item) => [item.slotId, item]),
  )
  return (
    expected.eventId === current.eventId &&
    expected.layoutId === current.layoutId &&
    expected.layoutRevision === current.layoutRevision &&
    expected.totalPriceIdr === current.totalPriceIdr &&
    expected.items.length === current.items.length &&
    current.items.every((item) => {
      const reviewed = expectedItems.get(item.slotId)
      return (
        reviewed?.revision === item.revision &&
        reviewed.priceIdr === item.priceIdr &&
        reviewed.frontageMillimeters === item.frontageMillimeters &&
        reviewed.depthMillimeters === item.depthMillimeters
      )
    })
  )
}
