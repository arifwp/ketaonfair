import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { guestSessions } from '#/server/db/schema'
import type { BookingDatabase } from '#/server/db/booking-database.server'

export const BOOKING_GUEST_COOKIE_NAME = 'ketaon_booking_guest'
export const BOOKING_GUEST_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export function hashBookingGuestToken(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined
  return createHash('sha256').update(token).digest('hex')
}

export async function establishBookingGuestSession(
  database: BookingDatabase,
  currentToken: string | undefined,
) {
  const currentHash = hashBookingGuestToken(currentToken)
  if (currentHash) {
    const existing = await database
      .select({ id: guestSessions.id })
      .from(guestSessions)
      .where(
        and(
          eq(guestSessions.tokenHash, currentHash),
          gt(guestSessions.expiresAt, new Date()),
        ),
      )
      .limit(1)
    if (existing.length > 0) return { status: 'existing' as const }
  }
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashBookingGuestToken(token)
  if (!tokenHash) throw new Error('Failed to generate a guest access token.')
  await database.insert(guestSessions).values({
    tokenHash,
    expiresAt: new Date(Date.now() + BOOKING_GUEST_MAX_AGE_SECONDS * 1000),
  })
  return { status: 'created' as const, token }
}
