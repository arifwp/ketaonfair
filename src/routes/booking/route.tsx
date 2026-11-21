import { Outlet, createFileRoute } from '@tanstack/react-router'
import { BookingSlotSelectionProvider } from '#/features/slot-inventory/components/booking-slot-selection-provider'
import { BookingCheckoutDraftProvider } from '#/features/booking-checkout/booking-checkout-draft'

export const Route = createFileRoute('/booking')({
  component: BookingPortalLayout,
})

function BookingPortalLayout() {
  return (
    <BookingSlotSelectionProvider>
      <BookingCheckoutDraftProvider>
        <Outlet />
      </BookingCheckoutDraftProvider>
    </BookingSlotSelectionProvider>
  )
}
