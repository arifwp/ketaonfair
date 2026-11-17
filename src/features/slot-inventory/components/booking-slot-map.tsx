import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import Map, { Layer, Popup, ScaleControl, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibre from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Layers, Maximize, Minus, Plus, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatPriceIdr } from '#/shared/format-price-idr'
import {
  bookingMapNavigationBounds,
  bookingSlotBounds,
  bookingSlotMapFeatures,
} from '../booking-slot-map-geometry'
import {
  bookingSlotClickAction,
  formatSlotDimensions,
} from '../booking-slot-browser'
import { useBookingSlotSelection } from './booking-slot-selection-provider'
import { BOOKING_SLOT_AVAILABILITY_LABELS } from '../booking-slot-labels'
import type { MapRef } from 'react-map-gl/maplibre'
import type {
  PublishedBookingInventory,
  PublishedBookingSlot,
} from '../slot-inventory.schema'

const MAX_MAP_DISPLAY_ZOOM = 24
const BOOKING_MAP_LOCALE = {
  'Map.Title': 'Peta pilihan slot',
  'AttributionControl.ToggleAttribution': 'Lihat sumber peta',
  'AttributionControl.MapFeedback': 'Masukan untuk peta',
  'Popup.Close': 'Tutup info slot',
  'CooperativeGesturesHandler.WindowsHelpText':
    'Pakai Ctrl + gulir buat memperbesar peta',
  'CooperativeGesturesHandler.MacHelpText':
    'Pakai ⌘ + gulir buat memperbesar peta',
  'CooperativeGesturesHandler.MobileHelpText': 'Pakai dua jari buat geser peta',
}
const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY
// MapLibre 6 ships a separate worker. Let Vite bundle its relative imports.
maplibre.setWorkerUrl(mapLibreWorkerUrl)

export function BookingSlotMap({
  inventory,
  matchingSlots,
  basemap,
  canSelect,
  onBasemapChange,
  onShowSlotList,
}: {
  inventory: PublishedBookingInventory
  matchingSlots: PublishedBookingSlot[]
  basemap: 'street' | 'satellite'
  canSelect: boolean
  onBasemapChange: (basemap: 'street' | 'satellite') => void
  onShowSlotList: () => void
}) {
  const mapRef = useRef<MapRef>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasMapError, setHasMapError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [activeSlot, setActiveSlot] = useState<{
    slotId: string
    longitude: number
    latitude: number
    isClicked: boolean
  } | null>(null)
  const [selectionNotice, setSelectionNotice] = useState('')
  useEffect(() => {
    const dismissTooltip = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveSlot(null)
    }
    window.addEventListener('keydown', dismissTooltip)
    return () => window.removeEventListener('keydown', dismissTooltip)
  }, [])
  const [navigationLimits, setNavigationLimits] = useState<{
    minZoom: number
    maxBounds: [number, number, number, number]
  }>()
  const [primaryColor] = useState(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary')
      .trim(),
  )
  const selectedIds = useBookingSlotSelection(
    (state) => state.selectedBookingSlotIds,
  )
  const inspectedId = useBookingSlotSelection(
    (state) => state.inspectedBookingSlotId,
  )
  const focusRequest = useBookingSlotSelection((state) => state.mapFocusRequest)
  const viewport = useBookingSlotSelection((state) => state.mapViewport)
  const setViewport = useBookingSlotSelection((state) => state.setMapViewport)
  const addSlot = useBookingSlotSelection((state) => state.addBookingSlot)
  const removeSlot = useBookingSlotSelection((state) => state.removeBookingSlot)
  const inspectedSlot = inventory.slots.find(
    (slot) => slot.slotId === inspectedId,
  )
  const popupSlot = inventory.slots.find(
    (slot) => slot.slotId === activeSlot?.slotId,
  )
  const initialBounds = useRef(
    bookingSlotBounds(
      inventory.slots.filter((slot) => slot.availability === 'available'),
    ) ?? bookingSlotBounds(inventory.slots),
  )
  const slotFeatures = useMemo(
    () =>
      bookingSlotMapFeatures(
        inventory.slots,
        selectedIds,
        matchingSlots.map((slot) => slot.slotId),
      ),
    [inventory.slots, selectedIds, matchingSlots],
  )
  const rowFeatures = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: inventory.rows.map((row) => ({
        type: 'Feature' as const,
        geometry: row.centerline,
        properties: { label: row.label },
      })),
    }),
    [inventory.rows],
  )
  const exclusionFeatures = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: inventory.exclusions.flatMap((exclusion) =>
        exclusion.footprint
          ? [
              {
                type: 'Feature' as const,
                geometry: exclusion.footprint,
                properties: { reason: exclusion.reason },
              },
            ]
          : [],
      ),
    }),
    [inventory.exclusions],
  )
  const styleUrl = `https://api.maptiler.com/maps/${basemap === 'satellite' ? 'satellite' : 'streets-v2'}/style.json?key=${encodeURIComponent(mapTilerKey ?? '')}`

  const mapPadding = () => {
    const width = mapRef.current?.getContainer().clientWidth ?? 0
    return width >= 768
      ? { top: 90, bottom: 60, left: 90, right: 370 }
      : { top: 85, bottom: 135, left: 25, right: 72 }
  }
  const configureNavigation = (shouldFit: boolean) => {
    const map = mapRef.current
    const bounds = initialBounds.current
    if (!map || !bounds) return
    const camera = map.cameraForBounds(bounds, {
      padding: mapPadding(),
      maxZoom: 21,
    })
    if (!camera?.center || camera.zoom === undefined) return
    const center = maplibre.LngLat.convert(camera.center)
    const container = map.getContainer()
    setNavigationLimits({
      minZoom: camera.zoom,
      maxBounds: bookingMapNavigationBounds({
        longitude: center.lng,
        latitude: center.lat,
        zoom: camera.zoom,
        width: container.clientWidth,
        height: container.clientHeight,
      }),
    })
    if (shouldFit)
      map.fitBounds(bounds, { padding: mapPadding(), maxZoom: 21, duration: 0 })
  }
  const focusInspectedSlot = useEffectEvent(() => {
    if (!inspectedSlot) return
    const bounds = bookingSlotBounds([inspectedSlot])
    if (bounds)
      mapRef.current?.fitBounds(bounds, {
        padding: mapPadding(),
        maxZoom: 22,
        duration: 0,
      })
  })
  useEffect(() => {
    if (isLoaded) focusInspectedSlot()
  }, [focusRequest, isLoaded])

  const fitAvailableSlots = () => {
    const bounds = bookingSlotBounds(
      matchingSlots.filter((slot) => slot.availability === 'available'),
    )
    if (bounds)
      mapRef.current?.fitBounds(bounds, {
        padding: mapPadding(),
        maxZoom: 22,
        duration: 0,
      })
  }
  const handleSlotClick = (slot: PublishedBookingSlot) => {
    const action = bookingSlotClickAction(slot, {
      selectedBookingSlotIds: selectedIds,
      canSelect,
    })
    if (action === 'add') addSlot(slot.slotId)
    if (action === 'remove') removeSlot(slot.slotId)
    setSelectionNotice(
      action === 'unavailable'
        ? `${slot.code} ${BOOKING_SLOT_AVAILABILITY_LABELS[slot.availability].toLowerCase()}. Belum bisa dimasukin ke keranjang.`
        : action === 'paused'
          ? 'Belum bisa pilih slot. Cek status pemesanan dan coba muat ulang, ya.'
          : action === 'limit'
            ? 'Keranjang sudah penuh. Hapus satu slot dulu, ya.'
            : `${slot.code} ${action === 'add' ? 'masuk ke' : 'dihapus dari'} keranjang.`,
    )
  }

  return (
    <section
      aria-label="Peta slot di sepanjang jalan"
      className="absolute inset-0"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setActiveSlot(null)
      }}
    >
      {mapTilerKey && (
        <Map
          key={retryCount}
          ref={mapRef}
          mapLib={maplibre}
          locale={BOOKING_MAP_LOCALE}
          initialViewState={
            viewport ?? {
              bounds: initialBounds.current,
              fitBoundsOptions: { padding: 80, maxZoom: 21 },
            }
          }
          maxZoom={MAX_MAP_DISPLAY_ZOOM}
          minZoom={navigationLimits?.minZoom ?? 0}
          maxBounds={navigationLimits?.maxBounds}
          maxPitch={0}
          dragRotate={false}
          touchPitch={false}
          mapStyle={styleUrl}
          renderWorldCopies={false}
          attributionControl={{ compact: true }}
          interactiveLayerIds={['booking-slots-fill']}
          onLoad={() => {
            configureNavigation(!viewport)
            setIsLoaded(true)
            setHasMapError(false)
          }}
          onResize={() => configureNavigation(false)}
          onError={(event) => {
            console.error(
              JSON.stringify({
                operation: 'booking_map_failed',
                message: event.error.message.replaceAll(
                  mapTilerKey ?? '',
                  '[map-key]',
                ),
              }),
            )
            queueMicrotask(() => setHasMapError(true))
          }}
          onMove={(event) => setViewport(event.viewState)}
          onMouseMove={(event) => {
            const slotId = event.features?.[0]?.properties?.slotId
            if (typeof slotId === 'string')
              setActiveSlot({
                slotId,
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
                isClicked: false,
              })
            else setActiveSlot((active) => (active?.isClicked ? active : null))
          }}
          onMouseLeave={() =>
            setActiveSlot((active) => (active?.isClicked ? active : null))
          }
          onClick={(event) => {
            const slotId = event.features?.[0]?.properties?.slotId
            const slot = inventory.slots.find(
              (candidate) => candidate.slotId === slotId,
            )
            if (slot) {
              handleSlotClick(slot)
              setActiveSlot({
                slotId: slot.slotId,
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
                isClicked: true,
              })
            } else setActiveSlot(null)
          }}
          cursor={popupSlot?.availability === 'available' ? 'pointer' : 'grab'}
        >
          <ScaleControl unit="metric" position="bottom-left" />
          <Source id="booking-rows" type="geojson" data={rowFeatures}>
            <Layer
              id="booking-row-lines"
              type="line"
              paint={{
                'line-color': primaryColor,
                'line-width': 1,
                'line-dasharray': [3, 3],
              }}
            />
          </Source>
          <Source
            id="booking-exclusions"
            type="geojson"
            data={exclusionFeatures}
          >
            <Layer
              id="booking-exclusion-fill"
              type="fill"
              paint={{ 'fill-color': '#92400e', 'fill-opacity': 0.35 }}
            />
            <Layer
              id="booking-exclusion-outline"
              type="line"
              paint={{
                'line-color': '#92400e',
                'line-width': 2,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
          <Source
            id="booking-slots"
            type="geojson"
            data={slotFeatures}
            maxzoom={MAX_MAP_DISPLAY_ZOOM}
            tolerance={0}
          >
            <Layer
              id="booking-slots-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['get', 'isSelected'],
                  primaryColor,
                  ['==', ['get', 'slotId'], activeSlot?.slotId ?? ''],
                  primaryColor,
                  ['==', ['get', 'availability'], 'available'],
                  '#ffffff',
                  ['==', ['get', 'availability'], 'reserved'],
                  '#64748b',
                  '#1e293b',
                ],
                'fill-opacity': [
                  'case',
                  ['get', 'isSelected'],
                  0.95,
                  ['==', ['get', 'slotId'], activeSlot?.slotId ?? ''],
                  0.6,
                  ['get', 'isMatching'],
                  0.8,
                  0.45,
                ],
              }}
            />
            <Layer
              id="booking-slots-outline"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['get', 'isSelected'],
                  '#ffffff',
                  primaryColor,
                ],
                'line-width': [
                  'case',
                  ['==', ['get', 'slotId'], activeSlot?.slotId ?? ''],
                  4,
                  ['get', 'isSelected'],
                  3,
                  1.5,
                ],
              }}
            />
            <Layer
              id="booking-slot-labels"
              type="symbol"
              minzoom={20}
              layout={{
                'text-field': ['get', 'code'],
                'text-size': 12,
                'text-font': ['Noto Sans Regular'],
                'text-allow-overlap': false,
              }}
              paint={{
                'text-color': '#111827',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
              }}
            />
          </Source>
          {activeSlot && popupSlot && (
            <Popup
              key={`${popupSlot.slotId}-${activeSlot.isClicked}`}
              longitude={activeSlot.longitude}
              latitude={activeSlot.latitude}
              offset={16}
              closeButton={false}
              closeOnClick={false}
              focusAfterOpen={false}
              maxWidth="220px"
              onClose={() => setActiveSlot(null)}
            >
              <div
                role={activeSlot.isClicked ? 'region' : 'tooltip'}
                aria-label={`Slot ${popupSlot.code}`}
                className="p-1 text-sm text-foreground"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{popupSlot.code}</strong>
                  {activeSlot.isClicked && (
                    <Button
                      variant="secondary"
                      className="size-11 border-0 px-0"
                      aria-label={`Tutup info ${popupSlot.code}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveSlot(null)
                      }}
                    >
                      <X size={18} aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <p>
                  {BOOKING_SLOT_AVAILABILITY_LABELS[popupSlot.availability]}
                </p>
                <p className="mt-1">{formatSlotDimensions(popupSlot)}</p>
                <p className="mt-1 font-semibold">
                  {formatPriceIdr(popupSlot.priceIdr)}
                </p>
                <p className="mt-2">
                  {selectedIds.includes(popupSlot.slotId)
                    ? 'Udah dipilih · tap buat hapus'
                    : popupSlot.availability === 'available'
                      ? 'Tap buat masukin keranjang'
                      : 'Slot ini belum bisa dipilih'}
                </p>
              </div>
            </Popup>
          )}
        </Map>
      )}
      <div
        aria-label="Kontrol peta"
        className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-3 z-10 flex flex-col items-end gap-2 md:bottom-auto md:left-5 md:right-auto md:top-24 md:items-start"
      >
        <div className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
          <Button
            variant="secondary"
            aria-label="Perbesar peta"
            className="size-11 rounded-none border-0 px-0"
            disabled={
              !isLoaded || (viewport?.zoom ?? 0) >= MAX_MAP_DISPLAY_ZOOM - 0.001
            }
            onClick={() => mapRef.current?.zoomIn({ duration: 0 })}
          >
            <Plus size={20} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            aria-label="Perkecil peta"
            className="size-11 rounded-none border-0 border-t px-0"
            disabled={
              !isLoaded ||
              !navigationLimits ||
              (viewport?.zoom ?? 0) <= navigationLimits.minZoom + 0.001
            }
            onClick={() => mapRef.current?.zoomOut({ duration: 0 })}
          >
            <Minus size={20} aria-hidden="true" />
          </Button>
        </div>
        <Button
          variant="secondary"
          aria-label="Lihat semua slot tersedia"
          title="Lihat semua slot tersedia"
          className="size-11 px-0 shadow-lg"
          disabled={
            !isLoaded ||
            !matchingSlots.some((slot) => slot.availability === 'available')
          }
          onClick={fitAvailableSlots}
        >
          <Maximize size={19} aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          aria-label={
            basemap === 'satellite'
              ? 'Ganti ke peta jalan'
              : 'Ganti ke peta satelit'
          }
          title={basemap === 'satellite' ? 'Peta jalan' : 'Peta satelit'}
          className="size-11 px-0 shadow-lg"
          onClick={() => {
            setHasMapError(false)
            onBasemapChange(basemap === 'satellite' ? 'street' : 'satellite')
          }}
        >
          <Layers size={19} aria-hidden="true" />
        </Button>
        <output
          aria-label="Tingkat perbesaran peta"
          className="sr-only md:not-sr-only md:rounded md:bg-background md:px-2 md:py-1 md:text-xs md:shadow"
        >
          Perbesaran{' '}
          {viewport
            ? new Intl.NumberFormat('id-ID', {
                maximumFractionDigits: 1,
              }).format(viewport.zoom)
            : '…'}
        </output>
      </div>
      {!isLoaded && !hasMapError && mapTilerKey && (
        <p
          role="status"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background px-4 py-3 text-sm shadow-lg"
        >
          Lagi nyiapin peta {basemap === 'satellite' ? 'satelit' : 'jalan'}...
        </p>
      )}
      {(!mapTilerKey || hasMapError) && (
        <div
          role="alert"
          className="absolute left-1/2 top-1/3 z-10 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border bg-background p-4 text-sm shadow-xl"
        >
          <p>
            {!mapTilerKey
              ? 'Petanya belum siap. Pilih slot lewat daftar dulu, ya.'
              : `Peta ${basemap === 'satellite' ? 'satelit' : 'jalan'} belum bisa dimuat. Pilihanmu tetap di keranjang.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setHasMapError(false)
                setIsLoaded(false)
                setRetryCount((count) => count + 1)
              }}
            >
              Coba lagi
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setHasMapError(false)
                onBasemapChange('street')
              }}
            >
              Pakai peta jalan
            </Button>
            <Button variant="secondary" onClick={onShowSlotList}>
              Buka daftar slot
            </Button>
          </div>
        </div>
      )}
      <div
        aria-label="Keterangan status slot"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 gap-3 rounded-lg bg-background px-3 py-2 text-xs shadow md:flex"
      >
        <span>□ Tersedia</span>
        <span>▣ Dipilih</span>
        <span>◧ Sudah dipesan</span>
        <span>■ Ditutup</span>
        <span>┄ Akses masuk</span>
      </div>
      <p role="status" className="sr-only">
        {selectionNotice}
      </p>
    </section>
  )
}
