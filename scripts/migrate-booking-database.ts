import { migrateBookingDatabase } from '#/server/db/migrate-booking-database.server'

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString)
  throw new Error('Set DATABASE_URL_UNPOOLED to the reviewed migration target.')
await migrateBookingDatabase(connectionString)
console.log('Booking migrations applied.')
