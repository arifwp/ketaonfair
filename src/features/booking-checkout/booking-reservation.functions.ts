import { createServerFn } from '@tanstack/react-start'
import {
  getCookie,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { bookingCheckoutReviewInputSchema } from './booking-checkout.schema'

export const establishBookingGuest = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const {
      establishBookingGuestSession,
      BOOKING_GUEST_COOKIE_NAME,
      BOOKING_GUEST_MAX_AGE_SECONDS,
    } = await import('#/server/auth/booking-guest-session.server')
    setResponseHeader('Cache-Control', 'no-store')
    const result = await withBookingDatabase((database) =>
      establishBookingGuestSession(
        database,
        getCookie(BOOKING_GUEST_COOKIE_NAME),
      ),
    )
    if (result.status === 'created')
      setCookie(BOOKING_GUEST_COOKIE_NAME, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: BOOKING_GUEST_MAX_AGE_SECONDS,
      })
    return {
      status: 'ready' as const,
      didCreateSession: result.status === 'created',
    }
  },
)

export const reserveBookingSelection = createServerFn({ method: 'POST' })
  .validator(bookingCheckoutReviewInputSchema)
  .handler(async ({ data }) => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const { reserveBookingSlots } =
      await import('#/server/services/reserve-booking-slots.server')
    const { hashBookingGuestToken, BOOKING_GUEST_COOKIE_NAME } =
      await import('#/server/auth/booking-guest-session.server')
    setResponseHeader('Cache-Control', 'no-store')
    const tokenHash = hashBookingGuestToken(
      getCookie(BOOKING_GUEST_COOKIE_NAME),
    )
    return withBookingDatabase((database) =>
      reserveBookingSlots(database, tokenHash, data),
    )
  })
