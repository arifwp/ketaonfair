import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClientOnly, Link, getRouteApi } from '@tanstack/react-router'
import { ArrowLeft, List, Search, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { isBookingWindowOpen } from '#/shared/booking-window'
import { bookingBrowserSearchSchema } from '../booking-browser-search'
import { filterBookingSlots } from '../booking-slot-browser'
import { publishedBookingInventoryQueryOptions } from '../slot-inventory.queries'
import { BookingSlotSelectionSummary } from './booking-slot-selection-summary'
import { BookingSlotSearchResults } from './booking-slot-search-results'
import type { PublishedBookingInventory } from '../slot-inventory.schema'

const bookingRoute = getRouteApi('/booking/')
const BookingSlotMap = lazy(() =>
  import('./booking-slot-map').then((module) => ({
    default: module.BookingSlotMap,
  })),
)

export function BookingSlotBrowserPage() {
  const { eventId } = bookingRoute.useLoaderData()
  const search = bookingRoute.useSearch()
  const navigate = bookingRoute.useNavigate()
  const [isSlotListOpen, setIsSlotListOpen] = useState(false)
  const inventoryQuery = useQuery(
    publishedBookingInventoryQueryOptions(eventId),
  )
  const inventory =
    inventoryQuery.data?.status === 'published'
      ? inventoryQuery.data.inventory
      : undefined
  const isWindowOpen = useBookingWindowOpen(
    inventory?.event,
    inventoryQuery.dataUpdatedAt,
  )
  const isInventoryUnverified =
    inventoryQuery.isError || inventoryQuery.fetchStatus === 'paused'
  const matchingSlots = filterBookingSlots(inventory?.slots ?? [], search)
  const canSelect = isWindowOpen && !isInventoryUnverified
  const updateSearch = (nextSearch: unknown) => {
    void navigate({
      search: bookingBrowserSearchSchema.parse(nextSearch),
      replace: true,
      resetScroll: false,
    })
  }

  return (
    <main
      className="fixed inset-0 isolate overflow-hidden bg-muted text-foreground"
      aria-label="Peta pilihan slot"
    >
      <h1 className="sr-only">Pilih slotmu</h1>
      {inventory && inventory.slots.length > 0 && (
        <ClientOnly fallback={<MapLoadingState />}>
          <Suspense fallback={<MapLoadingState />}>
            <BookingSlotMap
              inventory={inventory}
              matchingSlots={matchingSlots}
              basemap={search.basemap}
              canSelect={canSelect}
              onBasemapChange={(basemap) =>
                updateSearch({ ...search, basemap })
              }
              onShowSlotList={() => setIsSlotListOpen(true)}
            />
          </Suspense>
        </ClientOnly>
      )}
      <div className="absolute left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex gap-2 md:left-5 md:right-auto md:top-5 md:w-96">
        <Link
          to="/"
          aria-label="Balik ke halaman acara"
          title="Balik ke acara"
          className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="relative min-w-0 flex-1">
          <label className="flex h-12 items-center gap-2 rounded-lg border bg-background px-3 shadow-lg">
            <Search
              size={18}
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Cari kode slot</span>
            <input
              type="search"
              placeholder="Cari kode slot..."
              value={search.q}
              maxLength={80}
              className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-controls="booking-slot-search-results"
              onFocus={() => {
                if (search.q) setIsSlotListOpen(true)
              }}
              onChange={(event) => {
                setIsSlotListOpen(true)
                updateSearch({ ...search, q: event.target.value })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsSlotListOpen(false)
                  updateSearch({ ...search, q: '' })
                }
              }}
            />
          </label>
          {(isSlotListOpen || search.q.trim().length > 0) && inventory && (
            <div className="absolute -left-14 right-0 top-14 overflow-hidden rounded-lg border bg-background shadow-xl md:left-0">
              <div className="flex items-center justify-between border-b px-3 py-1 text-sm font-semibold">
                <span>{matchingSlots.length} slot ketemu</span>
                <Button
                  variant="secondary"
                  aria-label="Tutup daftar slot"
                  className="border-0 px-2 shadow-none"
                  onClick={() => {
                    setIsSlotListOpen(false)
                    updateSearch({ ...search, q: '' })
                  }}
                >
                  <X size={18} aria-hidden="true" />
                  Tutup
                </Button>
              </div>
              <BookingSlotSearchResults
                slots={matchingSlots}
                canSelect={canSelect}
                onLocate={() => {
                  setIsSlotListOpen(false)
                  updateSearch({ ...search, q: '' })
                }}
              />
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          aria-label="Lihat daftar slot"
          title="Daftar slot"
          aria-pressed={isSlotListOpen || search.q.trim().length > 0}
          className="min-h-12 shrink-0 gap-1 px-2 shadow-lg"
          onClick={() => {
            if (isSlotListOpen || search.q.trim().length > 0) {
              setIsSlotListOpen(false)
              updateSearch({ ...search, q: '' })
            } else setIsSlotListOpen(true)
          }}
        >
          <List size={20} aria-hidden="true" />
          <span className="text-sm">Daftar</span>
        </Button>
      </div>
      {inventoryQuery.isPending && <MapLoadingState />}
      {isInventoryUnverified && (
        <div
          role="alert"
          className="absolute left-3 right-3 top-20 z-10 rounded-lg border bg-background p-4 shadow-lg md:left-5 md:right-auto md:w-96"
        >
          <p className="text-sm font-semibold">
            {inventory
              ? 'Status slot belum bisa diperbarui. Pilihanmu tetap di keranjang. Coba lagi dulu, ya.'
              : 'Slotnya belum bisa dimuat. Coba lagi, ya.'}
          </p>
          <Button
            className="mt-3"
            disabled={inventoryQuery.isFetching}
            onClick={() => void inventoryQuery.refetch()}
          >
            {inventoryQuery.isFetching ? 'Lagi dimuat...' : 'Coba lagi'}
          </Button>
        </div>
      )}
      {!inventoryQuery.isPending &&
        !isInventoryUnverified &&
        (!inventory || inventory.slots.length === 0) && (
          <div
            role="status"
            className="absolute left-4 right-4 top-1/3 mx-auto max-w-sm rounded-lg border bg-background p-5 shadow-lg"
          >
            <h2 className="font-bold">Slotnya belum tayang, nih.</h2>
            <p className="mt-2 text-sm">
              Cek lagi nanti pas tempatnya sudah siap.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              disabled={inventoryQuery.isFetching}
              onClick={() => void inventoryQuery.refetch()}
            >
              Cek lagi
            </Button>
          </div>
        )}
      {inventory && !isWindowOpen && (
        <p
          role="status"
          className="absolute left-3 top-20 z-10 max-w-xs rounded-lg bg-background p-3 text-sm shadow-lg md:left-5"
        >
          Pemesanan lagi ditutup. Kamu masih bisa cek peta dan hapus pilihanmu.
        </p>
      )}
      <BookingSlotSelectionSummary
        slots={inventory?.slots ?? []}
        isInventoryUnverified={isInventoryUnverified || !inventory}
        isIllustrative={inventory?.event.isIllustrative ?? false}
      />
    </main>
  )
}

function MapLoadingState() {
  return (
    <p
      role="status"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background px-5 py-3 text-sm shadow-lg"
    >
      Lagi nyiapin petanya...
    </p>
  )
}

function useBookingWindowOpen(
  event: PublishedBookingInventory['event'] | undefined,
  dataUpdatedAt: number,
) {
  const [currentTimeMilliseconds, setCurrentTimeMilliseconds] =
    useState<number>()
  useEffect(() => {
    if (!event) return
    let timeout: number | undefined
    const updateBookingWindow = () => {
      const now = Date.now()
      setCurrentTimeMilliseconds(now)
      const nextBoundary = [
        Date.parse(event.bookingOpensAt),
        Date.parse(event.bookingClosesAt),
      ]
        .filter((instant) => instant > now)
        .sort((left, right) => left - right)
        .at(0)
      if (nextBoundary === undefined) return
      timeout = window.setTimeout(
        updateBookingWindow,
        Math.min(nextBoundary - now + 1, 2_147_483_647),
      )
    }
    updateBookingWindow()
    return () => window.clearTimeout(timeout)
  }, [event, dataUpdatedAt])
  return event
    ? isBookingWindowOpen(event, currentTimeMilliseconds ?? dataUpdatedAt)
    : false
}
