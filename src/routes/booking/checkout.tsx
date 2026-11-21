import { createFileRoute } from '@tanstack/react-router'
import { getBookingEventId } from '#/features/slot-inventory/booking-event.functions'
import { publishedBookingInventoryQueryOptions } from '#/features/slot-inventory/slot-inventory.queries'
import { BookingCheckoutPage } from '#/features/booking-checkout/components/booking-checkout-page'
import {
  BookingInventoryError,
  BookingInventoryPending,
} from '#/features/slot-inventory/components/booking-inventory-feedback'

export const Route = createFileRoute('/booking/checkout')({
  loader: async ({ context }) => {
    const eventId = await getBookingEventId()
    void context.queryClient.prefetchQuery(
      publishedBookingInventoryQueryOptions(eventId),
    )
    return { eventId }
  },
  head: () => ({
    meta: [
      { title: 'Cek pilihanmu · Ketaon Fair' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  pendingComponent: BookingInventoryPending,
  errorComponent: BookingInventoryError,
  component: BookingCheckoutPage,
})
