import { Button } from '#/components/ui/button'
import type { BookingQuoteResult } from '../booking-quote.schema'

export function BookingCheckoutQuoteProblem({
  problem,
  slotCodeById,
  isPending,
  onRemoveUnavailable,
  onRetry,
}: {
  problem: Exclude<BookingQuoteResult, { status: 'quoted' }> | undefined
  slotCodeById: ReadonlyMap<string, string>
  isPending: boolean
  onRemoveUnavailable: (slotIds: string[]) => void
  onRetry: () => void
}) {
  if (!problem) return null
  if (problem.status === 'slots_unavailable')
    return (
      <section role="alert" className="rounded-xl border bg-background p-4">
        <h2 className="font-bold">Ada slot yang sudah nggak tersedia.</h2>
        <p className="mt-2 text-sm">
          {problem.slotIds
            .map(
              (slotId) =>
                slotCodeById.get(slotId) ?? 'Slot yang tidak ditampilkan',
            )
            .join(', ')}
          . Belum ada slot yang dipesan. Hapus yang nggak tersedia, lalu cek
          lagi pilihanmu.
        </p>
        <Button
          variant="secondary"
          className="mt-3"
          disabled={isPending}
          onClick={() => onRemoveUnavailable(problem.slotIds)}
        >
          Hapus slot yang nggak tersedia
        </Button>
      </section>
    )
  return (
    <section role="alert" className="rounded-xl border bg-background p-4">
      <p className="text-sm">
        {problem.status === 'booking_closed'
          ? 'Pemesanan lagi ditutup. Pilihan dan datamu tetap di sini.'
          : 'Slotnya belum tayang. Balik ke peta buat cek lagi, ya.'}
      </p>
      <Button
        variant="secondary"
        className="mt-3"
        disabled={isPending}
        onClick={onRetry}
      >
        Cek lagi
      </Button>
    </section>
  )
}
