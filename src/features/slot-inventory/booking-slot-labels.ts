import type { PublishedBookingSlot } from './slot-inventory.schema'

export const BOOKING_SLOT_AVAILABILITY_LABELS = {
  available: 'Tersedia',
  reserved: 'Sudah dipesan',
  blocked: 'Ditutup',
} satisfies Record<PublishedBookingSlot['availability'], string>

export const BOOKING_SLOT_SIDE_LABELS = {
  left: 'sisi kiri',
  right: 'sisi kanan',
} satisfies Record<PublishedBookingSlot['footprintSide'], string>
