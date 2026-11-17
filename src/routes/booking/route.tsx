import { Outlet, createFileRoute } from '@tanstack/react-router'
import { BookingSlotSelectionProvider } from '#/features/slot-inventory/components/booking-slot-selection-provider'

export const Route = createFileRoute('/booking')({
  component: BookingPortalLayout,
})

function BookingPortalLayout() {
  return (
    <BookingSlotSelectionProvider>
      <Outlet />
    </BookingSlotSelectionProvider>
  )
}
