import type { BookingBrowserSearch } from './booking-browser-search'
import type { PublishedBookingSlot } from './slot-inventory.schema'
import { MAX_BOOKING_SLOT_COUNT } from '#/shared/booking-limits'

const slotDimensionFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 3,
})

export function filterBookingSlots(
  slots: readonly PublishedBookingSlot[],
  filters: BookingBrowserSearch,
) {
  const codeSearch = filters.q.trim().toLowerCase()
  return slots.filter((slot) => slot.code.toLowerCase().includes(codeSearch))
}

export function bookingSlotClickAction(
  slot: PublishedBookingSlot,
  selection: { selectedBookingSlotIds: readonly string[]; canSelect: boolean },
) {
  if (selection.selectedBookingSlotIds.includes(slot.slotId)) return 'remove'
  if (slot.availability !== 'available') return 'unavailable'
  if (!selection.canSelect) return 'paused'
  if (selection.selectedBookingSlotIds.length >= MAX_BOOKING_SLOT_COUNT)
    return 'limit'
  return 'add'
}

export function summarizeBookingSelection(
  slots: readonly PublishedBookingSlot[],
  selectedBookingSlotIds: readonly string[],
) {
  const slotById = new Map(slots.map((slot) => [slot.slotId, slot]))
  const selectedSlots = selectedBookingSlotIds.map((slotId) => ({
    slotId,
    slot: slotById.get(slotId),
  }))
  return {
    selectedSlots,
    totalPriceIdr: selectedSlots.reduce(
      (total, { slot }) => total + (slot?.priceIdr ?? 0),
      0,
    ),
    hasMissingSlots: selectedSlots.some(({ slot }) => !slot),
    hasUnavailableSlots: selectedSlots.some(
      ({ slot }) => !slot || slot.availability !== 'available',
    ),
  }
}

export function formatSlotDimensions(slot: {
  frontageMillimeters: number
  depthMillimeters: number
}) {
  return `${slotDimensionFormatter.format(slot.frontageMillimeters / 1000)} × ${slotDimensionFormatter.format(slot.depthMillimeters / 1000)} m`
}
