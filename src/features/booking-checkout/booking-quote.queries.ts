import { queryOptions } from '@tanstack/react-query'
import { getBookingQuote } from './booking-quote.functions'

export function bookingQuoteQueryOptions(
  eventId: string,
  slotIds: string[],
  layoutId: string | undefined,
  layoutRevision: number | undefined,
) {
  const sortedSlotIds = [...slotIds].sort()
  return queryOptions({
    queryKey: [
      'events',
      eventId,
      'layouts',
      layoutId,
      layoutRevision,
      'quote',
      sortedSlotIds,
    ] as const,
    queryFn: () =>
      getBookingQuote({ data: { eventId, slotIds: sortedSlotIds } }),
    enabled: sortedSlotIds.length > 0 && layoutId !== undefined,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}
