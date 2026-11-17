import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getBookingEventId = createServerFn({ method: 'GET' }).handler(
  () => {
    const configuredEventId = z.uuid().safeParse(process.env.BOOKING_EVENT_ID)
    if (!configuredEventId.success) {
      console.error(
        JSON.stringify({ operation: 'booking_event_configuration_invalid' }),
      )
      throw new Error('Booking is not configured. Please try again later.')
    }
    return configuredEventId.data
  },
)
