import { createContext, useContext, useState } from 'react'
import { useStore } from 'zustand'
import { createBookingSlotSelectionStore } from '../stores/booking-slot-selection.store'
import type { ReactNode } from 'react'
import type { BookingSlotSelectionStore } from '../stores/booking-slot-selection.store'

const BookingSlotSelectionContext =
  createContext<BookingSlotSelectionStore | null>(null)

export function BookingSlotSelectionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [store] = useState(createBookingSlotSelectionStore)
  return (
    <BookingSlotSelectionContext.Provider value={store}>
      {children}
    </BookingSlotSelectionContext.Provider>
  )
}

export function useBookingSlotSelection<TSelection>(
  selector: (
    state: ReturnType<BookingSlotSelectionStore['getState']>,
  ) => TSelection,
) {
  const store = useContext(BookingSlotSelectionContext)
  if (!store)
    throw new Error('Booking selection requires its booking provider.')
  return useStore(store, selector)
}
