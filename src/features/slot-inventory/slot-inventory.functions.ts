import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { publishedInventoryInputSchema } from './slot-inventory.schema'

export const getPublishedBookingInventory = createServerFn({ method: 'GET' })
  .validator(publishedInventoryInputSchema)
  .handler(async ({ data }) => {
    const { withBookingDatabase } =
      await import('#/server/db/booking-database.server')
    const { readPublishedBookingInventory } =
      await import('#/server/services/published-booking-inventory.server')
    setResponseHeader('Cache-Control', 'no-store')
    return withBookingDatabase((database) =>
      readPublishedBookingInventory(database, data.eventId),
    )
  })
