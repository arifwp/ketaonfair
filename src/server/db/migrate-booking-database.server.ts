import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import { createBookingDatabase } from './booking-database.server'

export async function migrateBookingDatabase(connectionString: string) {
  const hostname = new URL(connectionString).hostname
  if (hostname.includes('-pooler.')) {
    throw new Error(
      'Migrations require a direct DATABASE_URL_UNPOOLED connection.',
    )
  }
  const connection = createBookingDatabase(connectionString)
  try {
    await migrate(connection.database, {
      migrationsFolder: fileURLToPath(
        new URL('../../../db/migrations', import.meta.url),
      ),
    })
  } finally {
    await connection.close()
  }
}
