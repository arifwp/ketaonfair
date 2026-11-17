import { createBookingDatabase } from '#/server/db/booking-database.server'
import { seedKetaonStreetBookingInventory } from '../db/seeds/ketaon-street-booking-inventory'

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString || process.env.ALLOW_ILLUSTRATIVE_SEED !== 'true') {
  throw new Error(
    'Set DATABASE_URL_UNPOOLED and ALLOW_ILLUSTRATIVE_SEED=true on an isolated demo branch.',
  )
}
const connection = createBookingDatabase(connectionString)
try {
  console.log(await seedKetaonStreetBookingInventory(connection.database))
} finally {
  await connection.close()
}
