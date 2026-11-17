import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { bookingQuoteInputSchema } from './booking-quote.schema'

describe('booking quote request limits', () => {
  it('rejects empty, duplicate, malformed and oversized selections', () => {
    const eventId = randomUUID()
    const slotId = randomUUID()
    for (const slotIds of [
      [],
      [slotId, slotId],
      ['not-a-slot'],
      Array.from({ length: 101 }, () => randomUUID()),
    ]) {
      expect(
        bookingQuoteInputSchema.safeParse({ eventId, slotIds }).success,
      ).toBe(false)
    }
  })
})
