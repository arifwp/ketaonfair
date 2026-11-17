import { createFileRoute } from '@tanstack/react-router'
import { getBookingEventId } from '#/features/slot-inventory/booking-event.functions'
import { bookingBrowserSearchSchema } from '#/features/slot-inventory/booking-browser-search'
import { publishedBookingInventoryQueryOptions } from '#/features/slot-inventory/slot-inventory.queries'
import { BookingSlotBrowserPage } from '#/features/slot-inventory/components/booking-slot-browser-page'
import {
  BookingInventoryError,
  BookingInventoryPending,
} from '#/features/slot-inventory/components/booking-inventory-feedback'

export const Route = createFileRoute('/booking/')({
  validateSearch: (search) => bookingBrowserSearchSchema.parse(search),
  loader: async ({ context }) => {
    const eventId = await getBookingEventId()
    // Stream the pending query so slow inventory reads show an honest loading state.
    void context.queryClient.prefetchQuery(
      publishedBookingInventoryQueryOptions(eventId),
    )
    return { eventId }
  },
  head: () => ({ meta: [{ title: 'Pilih slotmu · Ketaon Fair' }] }),
  pendingComponent: BookingInventoryPending,
  errorComponent: BookingInventoryError,
  component: BookingSlotBrowserPage,
})
