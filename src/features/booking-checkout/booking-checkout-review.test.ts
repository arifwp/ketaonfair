import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  bookingCheckoutReviewInputSchema,
  bookingCustomerDetailsSchema,
  getBookingCustomerErrors,
  reviewedBookingQuoteSchema,
} from './booking-checkout.schema'
import {
  getReviewedBookingQuote,
  isBookingQuoteCurrent,
} from './booking-checkout-review'
import type { BookingQuote } from './booking-checkout-review'

const customer = {
  contactName: '  Test tenant  ',
  sellingDescription: '  Es teh dan camilan  ',
  email: ' tenant@example.invalid ',
  phone: '0812-3456-7890',
  note: '',
}
const quote: BookingQuote = {
  status: 'quoted',
  eventId: randomUUID(),
  layoutId: randomUUID(),
  layoutRevision: 2,
  paymentState: 'not_integrated',
  totalPriceIdr: 575000,
  items: [
    {
      slotId: randomUUID(),
      code: 'A-001',
      frontageMillimeters: 1200,
      depthMillimeters: 2000,
      priceIdr: 325000,
      revision: 2,
      footprint: { type: 'Polygon', coordinates: [] },
    },
    {
      slotId: randomUUID(),
      code: 'A-003',
      frontageMillimeters: 2100,
      depthMillimeters: 2500,
      priceIdr: 250000,
      revision: 1,
      footprint: { type: 'Polygon', coordinates: [] },
    },
  ],
}

describe('checkout customer details', () => {
  it('normalizes common Indonesian phone formats to +62 and trims free-text details', () => {
    for (const phone of [
      '0812-3456-7890',
      '+62 812 3456 7890',
      '6281234567890',
      '81234567890',
      '(0812) 3456-7890',
    ]) {
      expect(
        bookingCustomerDetailsSchema.parse({ ...customer, phone }),
      ).toEqual({
        contactName: 'Test tenant',
        sellingDescription: 'Es teh dan camilan',
        email: 'tenant@example.invalid',
        phone: '+6281234567890',
        note: '',
      })
    }
  })

  it('keeps notes optional and accepts a free-text selling description rather than a category enum', () => {
    const { note, ...withoutNote } = customer
    expect(note).toBe('')
    expect(
      bookingCustomerDetailsSchema.parse({
        ...withoutNote,
        sellingDescription: 'Jasa lukis wajah & aksesori handmade',
        note: '  Butuh akses masuk.\nBawa meja sendiri.  ',
      }).note,
    ).toBe('Butuh akses masuk.\nBawa meja sendiri.')
    expect(bookingCustomerDetailsSchema.parse(withoutNote).note).toBe('')
  })

  it('rejects missing details, invalid/foreign phones, invalid email and oversized notes with field errors', () => {
    const invalid = bookingCustomerDetailsSchema.safeParse({
      contactName: ' ',
      sellingDescription: '',
      email: 'bad email',
      phone: '+14155552671',
      note: 'a'.repeat(1001),
    })
    expect(invalid.success).toBe(false)
    if (invalid.success) throw new Error('Expected validation errors')
    expect(Object.keys(getBookingCustomerErrors(invalid.error))).toEqual([
      'contactName',
      'sellingDescription',
      'email',
      'phone',
      'note',
    ])
    for (const phone of [
      '+62081234567890',
      '08+1234567890',
      '+62abc8123456789',
      '0812',
      '+6281234567890123456',
    ]) {
      expect(
        bookingCustomerDetailsSchema.safeParse({ ...customer, phone }).success,
      ).toBe(false)
    }
  })
})

describe('reviewed quote agreement', () => {
  it('accepts the same selection regardless of item order', () => {
    const expected = getReviewedBookingQuote(quote)
    expect(
      isBookingQuoteCurrent(
        { ...expected, items: [...expected.items].reverse() },
        quote,
      ),
    ).toBe(true)
  })

  it('requires another review after price, size, item revision, layout or selection changes', () => {
    const expected = getReviewedBookingQuote(quote)
    for (const changed of [
      { ...quote, totalPriceIdr: quote.totalPriceIdr + 1 },
      { ...quote, layoutId: randomUUID() },
      { ...quote, layoutRevision: quote.layoutRevision + 1 },
      { ...quote, items: quote.items.slice(1) },
      ...[
        'priceIdr',
        'frontageMillimeters',
        'depthMillimeters',
        'revision',
      ].map((field) => ({
        ...quote,
        items: quote.items.map((item, index) =>
          index === 0
            ? {
                ...item,
                [field]:
                  item[
                    field as
                      | 'priceIdr'
                      | 'frontageMillimeters'
                      | 'depthMillimeters'
                      | 'revision'
                  ] + 1,
              }
            : item,
        ),
      })),
    ])
      expect(isBookingQuoteCurrent(expected, changed)).toBe(false)
  })

  it('rejects malformed review payloads and duplicate or oversized selections server-side', () => {
    const reviewedQuote = getReviewedBookingQuote(quote)
    expect(
      bookingCheckoutReviewInputSchema.safeParse({
        customer,
        reviewedQuote,
        submissionKey: randomUUID(),
      }).success,
    ).toBe(true)
    expect(
      bookingCheckoutReviewInputSchema.safeParse({
        customer,
        reviewedQuote,
        submissionKey: 'invalid',
      }).success,
    ).toBe(false)
    expect(
      reviewedBookingQuoteSchema.safeParse({
        ...reviewedQuote,
        items: [...reviewedQuote.items, ...reviewedQuote.items],
      }).success,
    ).toBe(false)
    expect(
      reviewedBookingQuoteSchema.safeParse({
        ...reviewedQuote,
        items: Array.from({ length: 101 }, () => ({
          ...reviewedQuote.items[0],
          slotId: randomUUID(),
        })),
      }).success,
    ).toBe(false)
  })
})
