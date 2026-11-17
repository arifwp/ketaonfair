import { createBookingDatabase } from '#/server/db/booking-database.server'
import { seedIllustrativeBookingInventory } from '../db/seeds/illustrative-booking-inventory'

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString || process.env.ALLOW_ILLUSTRATIVE_SEED !== 'true') {
  throw new Error(
    'Set DATABASE_URL_UNPOOLED and ALLOW_ILLUSTRATIVE_SEED=true on an isolated development/demo branch.',
  )
}
const connection = createBookingDatabase(connectionString)
try {
  console.log(await seedIllustrativeBookingInventory(connection.database))
} finally {
  await connection.close()
}
