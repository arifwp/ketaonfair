import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getCookie, setResponseHeader } from '@tanstack/react-start/server'
import { privateBookingOrderInputSchema } from './booking-order.schema'

export const getPrivateBookingOrder = createServerFn({ method: 'GET' })
  .validator(privateBookingOrderInputSchema)
  .handler(async ({ data }) => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const { readPrivateBookingOrder } =
      await import('#/server/services/private-booking-order.server')
    const { hashBookingGuestToken, BOOKING_GUEST_COOKIE_NAME } =
      await import('#/server/auth/booking-guest-session.server')
    setResponseHeader('Cache-Control', 'private, no-store')
    return withBookingDatabase((database) =>
      readPrivateBookingOrder(
        database,
        hashBookingGuestToken(getCookie(BOOKING_GUEST_COOKIE_NAME)),
        data.bookingOrderId,
      ),
    )
  })

export const recoverBookingSubmission = createServerFn({ method: 'GET' })
  .validator(z.object({ submissionKey: z.uuid() }))
  .handler(async ({ data }) => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const { recoverPrivateBookingOrder } =
      await import('#/server/services/private-booking-order.server')
    const { hashBookingGuestToken, BOOKING_GUEST_COOKIE_NAME } =
      await import('#/server/auth/booking-guest-session.server')
    setResponseHeader('Cache-Control', 'private, no-store')
    return withBookingDatabase((database) =>
      recoverPrivateBookingOrder(
        database,
        hashBookingGuestToken(getCookie(BOOKING_GUEST_COOKIE_NAME)),
        data.submissionKey,
      ),
    )
  })
