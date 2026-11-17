import { describe, expect, it } from 'vitest'
import { isBookingWindowOpen } from './booking-window'

describe('admin-configurable booking window', () => {
  const schedule = {
    bookingWindowState: 'open' as const,
    bookingOpensAt: '2026-11-01T05:00:00.000Z',
    bookingClosesAt: '2026-12-13T16:00:00.000Z',
  }

  it('opens at 12:00 Jakarta and closes at 23:00 Jakarta at the exact configured instants', () => {
    const opensAt = Date.parse(schedule.bookingOpensAt)
    const closesAt = Date.parse(schedule.bookingClosesAt)
    expect(isBookingWindowOpen(schedule, opensAt - 1)).toBe(false)
    expect(isBookingWindowOpen(schedule, opensAt)).toBe(true)
    expect(isBookingWindowOpen(schedule, closesAt - 1)).toBe(true)
    expect(isBookingWindowOpen(schedule, closesAt)).toBe(false)
  })

  it('uses changed settings and respects manual closure', () => {
    const currentTimeMilliseconds = Date.parse('2026-11-17T00:00:00.000Z')
    expect(isBookingWindowOpen(schedule, currentTimeMilliseconds)).toBe(true)
    expect(
      isBookingWindowOpen(
        { ...schedule, bookingOpensAt: '2026-12-01T00:00:00.000Z' },
        currentTimeMilliseconds,
      ),
    ).toBe(false)
    expect(
      isBookingWindowOpen(
        { ...schedule, bookingWindowState: 'closed' },
        currentTimeMilliseconds,
      ),
    ).toBe(false)
  })
})
