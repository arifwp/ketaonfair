import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { bookingQuoteInputSchema } from './booking-quote.schema'

export const getBookingQuote = createServerFn({ method: 'GET' })
  .validator(bookingQuoteInputSchema)
  .handler(async ({ data }) => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const { readBookingQuote } =
      await import('#/server/services/booking-quote.server')
    setResponseHeader('Cache-Control', 'no-store')
    return withBookingDatabase((database) => readBookingQuote(database, data))
  })
