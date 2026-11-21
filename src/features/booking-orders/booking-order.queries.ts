import { queryOptions } from '@tanstack/react-query'
import { getPrivateBookingOrder } from './booking-order.functions'

export function privateBookingOrderQueryOptions(bookingOrderId: string) {
  return queryOptions({
    queryKey: ['private-booking-order', bookingOrderId],
    queryFn: () =>
      getPrivateBookingOrder({
        data: { bookingOrderId },
        signal: AbortSignal.timeout(15_000),
      }),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  })
}
