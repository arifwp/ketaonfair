import { z } from 'zod'
import { bookingQuoteInputSchema } from './booking-quote.schema'
import {
  MAX_BOOKING_SLOT_COUNT,
  MAX_BOOKING_TOTAL_PRICE_IDR,
  MAX_SLOT_PRICE_IDR,
} from '#/shared/booking-limits'

export const bookingCustomerDetailsSchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(1, 'Isi namamu dulu, ya.')
    .max(200, 'Nama maksimal 200 karakter.'),
  sellingDescription: z
    .string()
    .trim()
    .min(1, 'Tulis dulu mau jualan apa, ya.')
    .max(200, 'Ceritain dalam maksimal 200 karakter, ya.'),
  email: z
    .string()
    .trim()
    .max(254, 'Email terlalu panjang.')
    .pipe(z.email('Cek lagi format emailmu, ya.')),
  phone: z
    .string()
    .trim()
    .max(40, 'Nomornya terlalu panjang.')
    .regex(/^[+\d\s().-]+$/, 'Pakai nomor Indonesia, contoh +62 812-3456-7890.')
    .transform((phone) => {
      const compactPhone = phone.replace(/[\s().-]/g, '')
      if (compactPhone.startsWith('0')) return `+62${compactPhone.slice(1)}`
      if (compactPhone.startsWith('62')) return `+${compactPhone}`
      if (compactPhone.startsWith('8')) return `+62${compactPhone}`
      return compactPhone
    })
    .pipe(
      z
        .string()
        .regex(
          /^\+62[1-9]\d{7,11}$/,
          'Pakai nomor Indonesia, contoh +62 812-3456-7890.',
        ),
    ),
  note: z
    .string()
    .trim()
    .max(1000, 'Catatan maksimal 1.000 karakter.')
    .default(''),
})

export type BookingCustomerDetails = z.output<
  typeof bookingCustomerDetailsSchema
>
export type BookingCustomerField = keyof BookingCustomerDetails
export type BookingCustomerErrors = Partial<
  Record<BookingCustomerField, string>
>

export const reviewedBookingQuoteSchema = z.object({
  eventId: bookingQuoteInputSchema.shape.eventId,
  layoutId: z.uuid(),
  layoutRevision: z.number().int().positive(),
  totalPriceIdr: z.number().int().positive().max(MAX_BOOKING_TOTAL_PRICE_IDR),
  items: z
    .array(
      z.object({
        slotId: z.uuid(),
        revision: z.number().int().positive(),
        frontageMillimeters: z.number().int().positive(),
        depthMillimeters: z.number().int().positive(),
        priceIdr: z.number().int().positive().max(MAX_SLOT_PRICE_IDR),
      }),
    )
    .min(1)
    .max(MAX_BOOKING_SLOT_COUNT)
    .refine(
      (items) =>
        new Set(items.map((item) => item.slotId)).size === items.length,
      'Slot tidak boleh dobel.',
    ),
})

export const bookingCheckoutReviewInputSchema = z.object({
  customer: bookingCustomerDetailsSchema,
  reviewedQuote: reviewedBookingQuoteSchema,
  submissionKey: z.uuid(),
})

export type ReviewedBookingQuote = z.infer<typeof reviewedBookingQuoteSchema>
export type BookingCheckoutReviewInput = z.infer<
  typeof bookingCheckoutReviewInputSchema
>

export function getBookingCustomerErrors(
  error: z.ZodError,
): BookingCustomerErrors {
  const errors: BookingCustomerErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (
      typeof field === 'string' &&
      field in bookingCustomerDetailsSchema.shape
    ) {
      const customerField = field as BookingCustomerField
      errors[customerField] ??= issue.message
    }
  }
  return errors
}
