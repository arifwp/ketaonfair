import { createStore } from 'zustand/vanilla'
import { subscribeWithSelector } from 'zustand/middleware'
import { MAX_BOOKING_SLOT_COUNT } from '#/shared/booking-limits'

interface BookingSlotSelectionState {
  selectedBookingSlotIds: string[]
  inspectedBookingSlotId: string | null
  mapFocusRequest: number
  mapViewport: BookingMapViewport | null
}

export interface BookingMapViewport {
  longitude: number
  latitude: number
  zoom: number
  bearing: number
  pitch: number
}

interface BookingSlotSelectionActions {
  addBookingSlot: (slotId: string) => void
  removeBookingSlot: (slotId: string) => void
  clearBookingSelection: () => void
  inspectBookingSlot: (slotId: string | null) => void
  setMapViewport: (viewport: BookingMapViewport) => void
}

// A provider owns each instance. Never share customer selection during SSR.
export function createBookingSlotSelectionStore() {
  return createStore<BookingSlotSelectionState & BookingSlotSelectionActions>()(
    subscribeWithSelector((set) => ({
      selectedBookingSlotIds: [],
      inspectedBookingSlotId: null,
      mapFocusRequest: 0,
      mapViewport: null,
      inspectBookingSlot: (slotId) =>
        set((state) => ({
          inspectedBookingSlotId: slotId,
          mapFocusRequest: state.mapFocusRequest + 1,
        })),
      setMapViewport: (mapViewport) => set({ mapViewport }),
      addBookingSlot: (slotId) =>
        set((state) => {
          if (
            state.selectedBookingSlotIds.includes(slotId) ||
            state.selectedBookingSlotIds.length >= MAX_BOOKING_SLOT_COUNT
          ) {
            return state
          }
          return {
            selectedBookingSlotIds: [...state.selectedBookingSlotIds, slotId],
          }
        }),
      removeBookingSlot: (slotId) =>
        set((state) => ({
          selectedBookingSlotIds: state.selectedBookingSlotIds.filter(
            (selectedId) => selectedId !== slotId,
          ),
        })),
      clearBookingSelection: () => set({ selectedBookingSlotIds: [] }),
    })),
  )
}

export type BookingSlotSelectionStore = ReturnType<
  typeof createBookingSlotSelectionStore
>
