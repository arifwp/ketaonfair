import { useBookingSlotSelection } from './components/booking-slot-selection-provider'

// The checkout consumes selection operations, never the inventory feature's store.
export function useBookingSelection() {
  const selectedBookingSlotIds = useBookingSlotSelection(
    (state) => state.selectedBookingSlotIds,
  )
  const removeBookingSlot = useBookingSlotSelection(
    (state) => state.removeBookingSlot,
  )
  return { selectedBookingSlotIds, removeBookingSlot }
}
