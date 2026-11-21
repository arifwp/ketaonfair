import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ShoppingCart, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatPriceIdr } from '#/shared/format-price-idr'
import {
  formatSlotDimensions,
  summarizeBookingSelection,
} from '../booking-slot-browser'
import {
  BOOKING_SLOT_AVAILABILITY_LABELS,
  BOOKING_SLOT_SIDE_LABELS,
} from '../booking-slot-labels'
import { useBookingSlotSelection } from './booking-slot-selection-provider'
import type { PublishedBookingSlot } from '../slot-inventory.schema'

export function BookingSlotSelectionSummary({
  slots,
  isInventoryUnverified,
  isIllustrative,
}: {
  slots: PublishedBookingSlot[]
  isInventoryUnverified: boolean
  isIllustrative: boolean
}) {
  const cartDialogRef = useRef<HTMLDialogElement>(null)
  const selectedIds = useBookingSlotSelection(
    (state) => state.selectedBookingSlotIds,
  )
  const removeSlot = useBookingSlotSelection((state) => state.removeBookingSlot)
  const clearSelection = useBookingSlotSelection(
    (state) => state.clearBookingSelection,
  )
  const selection = summarizeBookingSelection(slots, selectedIds)
  return (
    <aside aria-label="Keranjang pilihan">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls="booking-cart-dialog"
        aria-label={`Lihat keranjang, ${selectedIds.length} slot, total ${formatPriceIdr(selection.totalPriceIdr)}`}
        className="absolute bottom-[calc(1.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-20 flex min-h-18 items-center justify-between gap-3 rounded-xl border bg-background p-3 text-left shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:bottom-auto md:left-auto md:right-5 md:top-5 md:w-80"
        onClick={() => cartDialogRef.current?.showModal()}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShoppingCart size={22} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
              {selectedIds.length}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-muted-foreground">
              {selectedIds.length > 0
                ? `${selectedIds.length} slot pilihanmu`
                : 'Keranjangmu'}
            </span>
            <strong className="block text-base tabular-nums">
              {formatPriceIdr(selection.totalPriceIdr)}
            </strong>
          </span>
        </span>
        <span className="shrink-0 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
          Lihat
        </span>
      </button>
      <dialog
        ref={cartDialogRef}
        id="booking-cart-dialog"
        aria-labelledby="booking-cart-heading"
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none overflow-hidden rounded-t-2xl border border-b-0 bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/30 md:bottom-auto md:left-auto md:right-5 md:top-5 md:w-80 md:rounded-xl md:border-b"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className="flex max-h-[min(65dvh,32rem)] flex-col [@media(max-height:600px)]:max-h-[85dvh]">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 id="booking-cart-heading" className="text-base font-bold">
                Keranjangmu
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedIds.length} slot dipilih
              </p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0 px-3"
              onClick={() => cartDialogRef.current?.close()}
            >
              <X size={18} aria-hidden="true" />
              Tutup
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
            {selectedIds.length === 0 ? (
              <div className="py-6">
                <p className="text-base font-semibold">Masih kosong, nih.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tap slot di peta buat mulai pilih tempatmu.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {selection.selectedSlots.map(({ slotId, slot }) => (
                  <li key={slotId} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="text-sm">
                          {slot?.code ?? 'Slot sudah tidak ditampilkan'}
                        </strong>
                        {slot && (
                          <>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatSlotDimensions(slot)} ·{' '}
                              {BOOKING_SLOT_SIDE_LABELS[slot.footprintSide]}
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">
                              {formatPriceIdr(slot.priceIdr)}
                            </p>
                          </>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        className="size-11 shrink-0 border-0 px-0"
                        aria-label={`Hapus ${slot?.code ?? 'slot yang tidak tersedia'} dari keranjang`}
                        onClick={() => removeSlot(slotId)}
                      >
                        <X size={18} aria-hidden="true" />
                      </Button>
                    </div>
                    {(!slot || slot.availability !== 'available') && (
                      <p className="mt-2 text-sm font-semibold">
                        {slot
                          ? `${BOOKING_SLOT_AVAILABILITY_LABELS[slot.availability]}.`
                          : 'Slot ini sudah tidak tersedia.'}{' '}
                        Hapus dulu dari keranjang, ya.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(selection.hasUnavailableSlots ||
              (isInventoryUnverified && selectedIds.length > 0)) && (
              <p role="alert" className="pb-3 text-sm font-semibold">
                {selection.hasUnavailableSlots
                  ? 'Ada slot yang sudah nggak tersedia. Cek lagi pilihanmu, ya.'
                  : 'Status dan harga belum bisa diperbarui. Coba muat ulang dulu.'}
              </p>
            )}
          </div>
          <footer className="shrink-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {selectedIds.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {selection.hasMissingSlots
                      ? 'Subtotal sementara'
                      : 'Total pilihan'}
                  </span>
                  <strong className="text-base tabular-nums">
                    {formatPriceIdr(selection.totalPriceIdr)}
                  </strong>
                </div>
                <div className="mt-3 flex flex-col gap-2 [@media(max-height:600px)]:flex-row">
                  <Button
                    variant="secondary"
                    className="min-h-12 flex-1"
                    onClick={clearSelection}
                  >
                    Kosongin keranjang
                  </Button>
                  {!selection.hasUnavailableSlots && !isInventoryUnverified && (
                    <Link
                      to="/booking/checkout"
                      onClick={() => cartDialogRef.current?.close()}
                      className="flex min-h-12 flex-1 items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Lanjut isi data
                    </Link>
                  )}
                </div>
              </>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Baru dipilih, belum jadi pesanan.
            </p>
            {isIllustrative && (
              <p className="mt-1 text-sm text-muted-foreground">
                Slot demo. Posisi aslinya perlu dicek panitia.
              </p>
            )}
          </footer>
        </div>
      </dialog>
      <span role="status" className="sr-only">
        {selectedIds.length} slot di keranjang, total{' '}
        {formatPriceIdr(selection.totalPriceIdr)}
      </span>
    </aside>
  )
}
