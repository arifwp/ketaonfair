import { queryOptions } from '@tanstack/react-query'
import { getPublishedBookingInventory } from './slot-inventory.functions'

export const INVENTORY_REFRESH_INTERVAL_MILLISECONDS = 15_000

export function publishedBookingInventoryQueryOptions(eventId: string) {
  return queryOptions({
    // This discovery read returns the current published revision atomically.
    // Code search stays client-side so hidden selections use the same snapshot.
    queryKey: ['events', eventId, 'layouts', 'published', 'inventory'] as const,
    queryFn: () => getPublishedBookingInventory({ data: { eventId } }),
    staleTime: 10_000,
    refetchInterval: INVENTORY_REFRESH_INTERVAL_MILLISECONDS,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
