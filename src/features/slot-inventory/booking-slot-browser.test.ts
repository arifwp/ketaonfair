import { describe, expect, it } from 'vitest'
import { MAX_BOOKING_SLOT_COUNT } from '#/shared/booking-limits'
import { formatPriceIdr } from '#/shared/format-price-idr'
import { bookingBrowserSearchSchema } from './booking-browser-search'
import {
  filterBookingSlots,
  bookingSlotClickAction,
  formatSlotDimensions,
  summarizeBookingSelection,
} from './booking-slot-browser'
import {
  bookingSlotBounds,
  bookingSlotMapFeatures,
  bookingMapNavigationBounds,
} from './booking-slot-map-geometry'
import { createBookingSlotSelectionStore } from './stores/booking-slot-selection.store'
import type { PublishedBookingSlot } from './slot-inventory.schema'

const baseSlot: PublishedBookingSlot = {
  slotId: '00000000-0000-4000-8000-000000000001',
  code: 'L-001',
  routeId: '00000000-0000-4000-8000-000000000002',
  routeName: 'Market route',
  rowId: '00000000-0000-4000-8000-000000000003',
  rowLabel: 'Left side',
  footprintSide: 'left',
  routeDisplayOrder: 0,
  displayOrder: 0,
  frontageMillimeters: 1200,
  depthMillimeters: 2000,
  priceIdr: 325000,
  revision: 1,
  availability: 'available',
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [110, -7],
        [110.001, -7],
        [110.001, -7.001],
        [110, -7.001],
        [110, -7],
      ],
    ],
  },
}
const mixedSlots: PublishedBookingSlot[] = [
  baseSlot,
  {
    ...baseSlot,
    slotId: '00000000-0000-4000-8000-000000000004',
    code: 'R-001',
    routeId: '00000000-0000-4000-8000-000000000005',
    rowLabel: 'Right side',
    footprintSide: 'right',
    frontageMillimeters: 2100,
    depthMillimeters: 2500,
    priceIdr: 250000,
  },
  {
    ...baseSlot,
    slotId: '00000000-0000-4000-8000-000000000006',
    code: 'L-002',
    availability: 'reserved',
  },
  {
    ...baseSlot,
    slotId: '00000000-0000-4000-8000-000000000007',
    code: 'L-003',
    availability: 'blocked',
  },
]

describe('booking browsing and shared selection', () => {
  it('toggles clicks without adding unavailable, paused or over-limit slots', () => {
    expect(
      bookingSlotClickAction(baseSlot, {
        selectedBookingSlotIds: [],
        canSelect: true,
      }),
    ).toBe('add')
    expect(
      bookingSlotClickAction(
        { ...baseSlot, availability: 'reserved' },
        { selectedBookingSlotIds: [baseSlot.slotId], canSelect: false },
      ),
    ).toBe('remove')
    expect(
      bookingSlotClickAction(
        { ...baseSlot, availability: 'blocked' },
        { selectedBookingSlotIds: [], canSelect: true },
      ),
    ).toBe('unavailable')
    expect(
      bookingSlotClickAction(baseSlot, {
        selectedBookingSlotIds: [],
        canSelect: false,
      }),
    ).toBe('paused')
    expect(
      bookingSlotClickAction(baseSlot, {
        selectedBookingSlotIds: Array.from(
          { length: MAX_BOOKING_SLOT_COUNT },
          (_, index) => String(index),
        ),
        canSelect: true,
      }),
    ).toBe('limit')
  })
  it('bounds panning to the fitted viewport at mobile and desktop sizes', () => {
    for (const width of [360, 1440]) {
      const [west, south, east, north] = bookingMapNavigationBounds({
        longitude: 110.678,
        latitude: -7.53,
        zoom: 17,
        width,
        height: 800,
      })
      expect(west).toBeLessThan(110.678)
      expect(east).toBeGreaterThan(110.678)
      expect(south).toBeLessThan(-7.53)
      expect(north).toBeGreaterThan(-7.53)
      expect(east - west).toBeLessThan(0.01)
      expect(north - south).toBeLessThan(0.01)
    }
  })
  it('defaults to satellite and discards obsolete view and filter parameters', () => {
    expect(bookingBrowserSearchSchema.parse({})).toEqual({
      basemap: 'satellite',
      q: '',
    })
    expect(
      bookingBrowserSearchSchema.parse({
        view: 'unknown',
        basemap: [],
        route: 'bad',
        availability: 'paid',
        minPrice: -1,
        maxPrice: 'not-money',
      }),
    ).toEqual({ basemap: 'satellite', q: '' })
  })
  it('searches only slot codes and keeps every status inspectable', () => {
    const filters = bookingBrowserSearchSchema.parse({
      q: ' r-001 ',
      route: mixedSlots[1]?.routeId,
      availability: 'available',
      minPrice: 250000,
      maxPrice: 250000,
    })
    expect(
      filterBookingSlots(mixedSlots, filters).map((slot) => slot.code),
    ).toEqual(['R-001'])
    expect(
      filterBookingSlots(
        mixedSlots,
        bookingBrowserSearchSchema.parse({ q: 'l-' }),
      ).map((slot) => slot.availability),
    ).toEqual(['available', 'reserved', 'blocked'])
    expect(
      filterBookingSlots(
        mixedSlots,
        bookingBrowserSearchSchema.parse({ maxPrice: 1, availability: 'paid' }),
      ),
    ).toEqual(mixedSlots)
    expect(
      filterBookingSlots(
        mixedSlots,
        bookingBrowserSearchSchema.parse({ q: 'missing' }),
      ),
    ).toEqual([])
  })
  it('keeps exact per-slot prices independent of dimensions and filtered visibility', () => {
    const selection = createBookingSlotSelectionStore()
    selection.getState().addBookingSlot(baseSlot.slotId)
    const second = mixedSlots.at(1)
    if (!second) throw new Error('Missing mixed-size fixture')
    selection.getState().addBookingSlot(second.slotId)
    filterBookingSlots(
      mixedSlots,
      bookingBrowserSearchSchema.parse({ q: 'no matches' }),
    )
    const summary = summarizeBookingSelection(
      mixedSlots,
      selection.getState().selectedBookingSlotIds,
    )
    expect(summary.totalPriceIdr).toBe(575000)
    expect(summary.selectedSlots).toHaveLength(2)
    expect(formatSlotDimensions(baseSlot)).toBe('1,2 × 2 m')
    expect(formatSlotDimensions(second)).toBe('2,1 × 2,5 m')
    expect(
      formatSlotDimensions({
        frontageMillimeters: 1234,
        depthMillimeters: 2101,
      }),
    ).toBe('1,234 × 2,101 m')
    expect(formatPriceIdr(summary.totalPriceIdr)).toBe('Rp575.000')
  })
  it('flags claimed, blocked and removed slots without silently discarding selected IDs', () => {
    const ids = [baseSlot.slotId, 'unpublished-id']
    const changed = mixedSlots.map((slot) =>
      slot.slotId === baseSlot.slotId
        ? { ...slot, availability: 'reserved' as const, priceIdr: 400000 }
        : slot,
    )
    const summary = summarizeBookingSelection(changed, ids)
    expect(summary).toMatchObject({
      hasMissingSlots: true,
      hasUnavailableSlots: true,
      totalPriceIdr: 400000,
    })
    expect(summary.selectedSlots.map((slot) => slot.slotId)).toEqual(ids)
    expect(
      summarizeBookingSelection(
        [{ ...baseSlot, availability: 'blocked' }],
        [baseSlot.slotId],
      ).hasUnavailableSlots,
    ).toBe(true)
  })
  it('retains selection, inspection and viewport across consumer/view changes without cross-request state', () => {
    const selection = createBookingSlotSelectionStore()
    const otherCustomer = createBookingSlotSelectionStore()
    selection.getState().addBookingSlot(baseSlot.slotId)
    selection.getState().addBookingSlot(baseSlot.slotId)
    selection.getState().inspectBookingSlot(baseSlot.slotId)
    const viewport = {
      longitude: 110.678,
      latitude: -7.53,
      zoom: 23,
      bearing: 12,
      pitch: 0,
    }
    selection.getState().setMapViewport(viewport)
    expect(selection.getState()).toMatchObject({
      selectedBookingSlotIds: [baseSlot.slotId],
      inspectedBookingSlotId: baseSlot.slotId,
      mapViewport: viewport,
    })
    expect(otherCustomer.getState()).toMatchObject({
      selectedBookingSlotIds: [],
      inspectedBookingSlotId: null,
      mapViewport: null,
    })
    selection.getState().removeBookingSlot(baseSlot.slotId)
    expect(selection.getState().selectedBookingSlotIds).toEqual([])
    selection.getState().addBookingSlot(baseSlot.slotId)
    selection.getState().clearBookingSelection()
    expect(selection.getState().selectedBookingSlotIds).toEqual([])
  })
  it('bounds selection by the existing request limit and still allows removing slots', () => {
    const selection = createBookingSlotSelectionStore()
    for (let index = 0; index <= MAX_BOOKING_SLOT_COUNT; index += 1)
      selection.getState().addBookingSlot(String(index))
    expect(selection.getState().selectedBookingSlotIds).toHaveLength(
      MAX_BOOKING_SLOT_COUNT,
    )
    selection.getState().removeBookingSlot('0')
    selection.getState().addBookingSlot('replacement')
    expect(selection.getState().selectedBookingSlotIds).toContain('replacement')
  })
  it('draws both street sides by their actual polygons and retains hidden selected overlays', () => {
    const second = mixedSlots.at(1)
    if (!second) throw new Error('Missing right-side fixture')
    const features = bookingSlotMapFeatures(
      mixedSlots,
      [baseSlot.slotId],
      [second.slotId],
    )
    expect(features.features).toHaveLength(2)
    expect(features.features[0]).toMatchObject({
      id: baseSlot.slotId,
      geometry: baseSlot.footprint,
      properties: { isSelected: true, isMatching: false },
    })
    expect(features.features[1]?.properties).toMatchObject({
      isSelected: false,
      isMatching: true,
    })
    expect(bookingSlotBounds([])).toBeUndefined()
    expect(bookingSlotBounds([baseSlot])).toEqual([
      [110, -7.001],
      [110.001, -7],
    ])
  })
})
