import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { formatPriceIdr } from '#/shared/format-price-idr'
import { formatSlotDimensions } from '#/features/slot-inventory/booking-slot-browser'
import { privateBookingOrderQueryOptions } from '../booking-order.queries'

const orderRoute = getRouteApi('/booking/orders/$bookingOrderId')

export function BookingOrderPage() {
  const { bookingOrderId } = orderRoute.useParams()
  const orderQuery = useQuery(privateBookingOrderQueryOptions(bookingOrderId))
  const referenceRef = useRef<HTMLInputElement>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const order =
    orderQuery.data?.status === 'found' ? orderQuery.data.order : undefined
  async function handleCopyReference() {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.bookingReference)
      setCopyStatus('Kode pesanan disalin.')
    } catch {
      referenceRef.current?.select()
      setCopyStatus('Salin kode yang sudah dipilih secara manual, ya.')
    }
  }
  return (
    <main className="min-h-dvh bg-muted/40 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground">
      <div className="mx-auto max-w-xl space-y-5">
        <Link
          to="/booking"
          search={{ basemap: 'satellite', q: '' }}
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Balik ke peta
        </Link>
        {orderQuery.isPending && <p role="status">Lagi buka pesananmu...</p>}
        {orderQuery.isError && (
          <section role="alert">
            {order ? (
              <h2 className="text-lg font-bold">
                Status belum bisa diperbarui.
              </h2>
            ) : (
              <h1 className="text-2xl font-bold">Pesanan belum bisa dimuat.</h1>
            )}
            <p className="mt-2">
              Coba cek lagi. Memuat ulang nggak membuat pesanan baru.
            </p>
            <Button
              className="mt-4"
              disabled={orderQuery.isFetching}
              onClick={() => void orderQuery.refetch()}
            >
              Cek lagi
            </Button>
          </section>
        )}
        {orderQuery.data?.status === 'not_found' && (
          <section>
            <h1 className="text-2xl font-bold">
              Pesanan ini belum bisa dibuka.
            </h1>
            <p className="mt-3">
              Buka dari browser yang dipakai saat memesan. Kalau sesi browsermu
              hilang, hubungi panitia dengan kode pesananmu.
            </p>
          </section>
        )}
        {order && (
          <>
            <header>
              <h1 className="text-2xl font-bold">
                {order.state === 'reserved'
                  ? 'Slotmu udah dipesan!'
                  : 'Pesanan dibatalkan'}
              </h1>
              <p className="mt-3 text-sm">
                {order.state === 'reserved'
                  ? 'Pesananmu tercatat. Simpan kode pesanan di bawah ini, ya.'
                  : 'Slot pesanan ini sudah dilepas oleh panitia.'}
              </p>
              <p className="mt-3 font-semibold">
                Belum ada pembayaran yang dipungut.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Dipesan pada{' '}
                <time dateTime={order.reservedAt}>
                  {new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: order.timezone,
                  }).format(new Date(order.reservedAt))}
                </time>
              </p>
            </header>
            <section
              aria-label="Kode pesanan"
              className="rounded-xl border bg-background p-4"
            >
              <label
                htmlFor="booking-reference"
                className="text-sm font-semibold"
              >
                Kode pesanan
              </label>
              <input
                ref={referenceRef}
                id="booking-reference"
                readOnly
                value={order.bookingReference}
                className="mt-2 min-h-12 w-full rounded-lg border bg-muted px-3 text-sm"
              />
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => void handleCopyReference()}
              >
                Salin kode pesanan
              </Button>
              <p role="status" className="mt-2 text-sm">
                {copyStatus}
              </p>
            </section>
            <section
              aria-label="Detail pemesan"
              className="rounded-xl border bg-background p-4"
            >
              <h2 className="text-lg font-bold">Data pemesan</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ['Nama', order.contactName],
                  ['Mau jualan apa?', order.sellingDescription],
                  ['Email', order.email],
                  ['Nomor WhatsApp', order.phone],
                  ...(order.note ? [['Catatan', order.note]] : []),
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            <section
              aria-label="Slot pesanan"
              className="rounded-xl border bg-background p-4"
            >
              <h2 className="text-lg font-bold">Slot pesananmu</h2>
              <ul className="mt-3 divide-y">
                {order.items.map((slot) => (
                  <li
                    key={slot.slotId}
                    className="flex flex-wrap items-start justify-between gap-2 py-3"
                  >
                    <div>
                      <strong>{slot.code}</strong>
                      <p className="mt-1 text-sm">
                        {formatSlotDimensions(slot)}
                      </p>
                    </div>
                    <strong className="tabular-nums">
                      {formatPriceIdr(slot.priceIdr)}
                    </strong>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between gap-3 border-t pt-4">
                <span>Total pesanan</span>
                <strong className="tabular-nums">
                  {formatPriceIdr(order.totalPriceIdr)}
                </strong>
              </div>
            </section>
            <Button
              variant="secondary"
              className="w-full"
              disabled={orderQuery.isFetching}
              onClick={() => void orderQuery.refetch()}
            >
              {orderQuery.isFetching ? 'Lagi diperbarui...' : 'Perbarui status'}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
