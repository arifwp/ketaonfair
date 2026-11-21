import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { privateBookingOrderQueryOptions } from '#/features/booking-orders/booking-order.queries'
import { BookingOrderPage } from '#/features/booking-orders/components/booking-order-page'
import {
  BookingInventoryError,
  BookingInventoryPending,
} from '#/features/slot-inventory/components/booking-inventory-feedback'

export const Route = createFileRoute('/booking/orders/$bookingOrderId')({
  params: {
    parse: (params) => ({
      bookingOrderId: z.uuid().parse(params.bookingOrderId),
    }),
  },
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(
      privateBookingOrderQueryOptions(params.bookingOrderId),
    )
  },
  head: () => ({
    meta: [
      { title: 'Pesananmu · Ketaon Fair' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  pendingComponent: BookingInventoryPending,
  errorComponent: BookingInventoryError,
  component: BookingOrderPage,
})
