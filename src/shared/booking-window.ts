export function isBookingWindowOpen(
  schedule: {
    bookingWindowState: 'open' | 'closed'
    bookingOpensAt: string
    bookingClosesAt: string
  },
  currentTimeMilliseconds: number,
): boolean {
  return (
    schedule.bookingWindowState === 'open' &&
    currentTimeMilliseconds >= Date.parse(schedule.bookingOpensAt) &&
    currentTimeMilliseconds < Date.parse(schedule.bookingClosesAt)
  )
}
