import { Button } from '#/components/ui/button'
import { formatPriceIdr } from '#/shared/format-price-idr'
import {
  bookingSlotClickAction,
  formatSlotDimensions,
} from '../booking-slot-browser'
import { useBookingSlotSelection } from './booking-slot-selection-provider'
import {
  BOOKING_SLOT_AVAILABILITY_LABELS,
  BOOKING_SLOT_SIDE_LABELS,
} from '../booking-slot-labels'
import type { PublishedBookingSlot } from '../slot-inventory.schema'

export function BookingSlotSearchResults({
  slots,
  canSelect,
  onLocate,
}: {
  slots: PublishedBookingSlot[]
  canSelect: boolean
  onLocate: () => void
}) {
  const selectedIds = useBookingSlotSelection(
    (state) => state.selectedBookingSlotIds,
  )
  const addSlot = useBookingSlotSelection((state) => state.addBookingSlot)
  const removeSlot = useBookingSlotSelection((state) => state.removeBookingSlot)
  const inspectSlot = useBookingSlotSelection(
    (state) => state.inspectBookingSlot,
  )
  return (
    <ul
      id="booking-slot-search-results"
      aria-label="Daftar slot"
      className="max-h-[min(55dvh,28rem)] overflow-y-auto overscroll-contain p-2"
    >
      {slots.length === 0 && (
        <li className="p-3 text-sm" role="status">
          Slotnya belum ketemu. Coba kode lain, ya.
        </li>
      )}
      {slots.map((slot) => {
        const action = bookingSlotClickAction(slot, {
          selectedBookingSlotIds: selectedIds,
          canSelect,
        })
        return (
          <li key={slot.slotId} className="border-b p-2 last:border-0">
            <button
              type="button"
              className="w-full rounded text-left focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Lihat ${slot.code} di peta`}
              onClick={() => {
                inspectSlot(slot.slotId)
                onLocate()
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <strong className="text-sm">{slot.code}</strong>
                <span className="text-sm">
                  {BOOKING_SLOT_AVAILABILITY_LABELS[slot.availability]}
                </span>
              </span>
              <span className="mt-1 block text-sm">
                {formatSlotDimensions(slot)} · {formatPriceIdr(slot.priceIdr)}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {BOOKING_SLOT_SIDE_LABELS[slot.footprintSide]} · Lihat di peta
              </span>
            </button>
            <Button
              className="mt-2 w-full"
              variant={action === 'remove' ? 'primary' : 'secondary'}
              aria-label={`${action === 'remove' ? 'Hapus' : 'Pilih'} ${slot.code}`}
              aria-pressed={action === 'remove'}
              disabled={action !== 'add' && action !== 'remove'}
              onClick={() =>
                action === 'remove'
                  ? removeSlot(slot.slotId)
                  : addSlot(slot.slotId)
              }
            >
              {action === 'remove'
                ? 'Udah dipilih · Hapus'
                : action === 'unavailable'
                  ? 'Belum tersedia'
                  : action === 'paused'
                    ? 'Belum bisa dipilih'
                    : action === 'limit'
                      ? 'Keranjang sudah penuh'
                      : 'Masukin keranjang'}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
