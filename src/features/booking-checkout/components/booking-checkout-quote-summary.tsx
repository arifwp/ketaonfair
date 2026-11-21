import { X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatSlotDimensions } from '#/features/slot-inventory/booking-slot-browser'
import { formatPriceIdr } from '#/shared/format-price-idr'
import type { BookingQuote } from '../booking-checkout-review'

export function BookingCheckoutQuoteSummary({
  quote,
  isPending,
  onRemove,
}: {
  quote: BookingQuote
  isPending: boolean
  onRemove: (slotId: string) => void
}) {
  return (
    <section
      aria-labelledby="checkout-slots-heading"
      className="rounded-xl border bg-background p-4 sm:p-6"
    >
      <h2 id="checkout-slots-heading" className="text-lg font-bold">
        Cek slot pilihanmu
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {quote.items.length} slot · Cek lagi ukuran dan harga tiap slot, ya.
      </p>
      <ul className="mt-4 divide-y">
        {quote.items.map((slot) => (
          <li
            key={slot.slotId}
            className="flex items-start justify-between gap-3 py-4"
          >
            <div className="min-w-0">
              <h3 className="font-bold">{slot.code}</h3>
              <p className="mt-1 text-sm">{formatSlotDimensions(slot)}</p>
              <p className="mt-2 font-semibold tabular-nums">
                {formatPriceIdr(slot.priceIdr)}
              </p>
            </div>
            <Button
              variant="secondary"
              className="size-11 shrink-0 border-0 p-0"
              disabled={isPending}
              aria-label={`Hapus ${slot.code} dari pilihan`}
              onClick={() => onRemove(slot.slotId)}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <span className="font-semibold">Total pilihan</span>
        <strong className="text-xl tabular-nums">
          {formatPriceIdr(quote.totalPriceIdr)}
        </strong>
      </div>
    </section>
  )
}
