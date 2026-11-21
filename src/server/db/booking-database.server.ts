import { randomUUID } from 'node:crypto'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

export function createBookingDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 10_000,
  })
  return { database: drizzle(pool, { schema }), close: () => pool.end() }
}

export type BookingDatabase = ReturnType<
  typeof createBookingDatabase
>['database']

export async function withBookingDatabase<T>(
  operation: (database: BookingDatabase) => Promise<T>,
): Promise<T> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'Booking database is not configured. Set server-only DATABASE_URL.',
    )
  }
  const connection = createBookingDatabase(connectionString)
  try {
    return await operation(connection.database)
  } catch (error) {
    const correlationId = randomUUID()
    console.error(
      JSON.stringify({
        operation: 'booking_database_operation_failed',
        correlationId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }),
    )
    throw new Error(
      `Booking service is temporarily unavailable. Reference ${correlationId}.`,
    )
  } finally {
    await connection.close()
  }
}
