import type { PublishedBookingSlot } from './slot-inventory.schema'
import type { FeatureCollection, Polygon } from 'geojson'

export function bookingMapNavigationBounds(camera: {
  longitude: number
  latitude: number
  zoom: number
  width: number
  height: number
}): [number, number, number, number] {
  const worldSizePixels = 512 * 2 ** camera.zoom
  const centerX = (camera.longitude + 180) / 360
  const latitudeRadians = (camera.latitude * Math.PI) / 180
  const centerY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2
  // The fitted viewport bounds panning; raw narrow street bounds would cut off the route.
  const halfWidth = (camera.width / worldSizePixels) * 0.55
  const halfHeight = (camera.height / worldSizePixels) * 0.55
  const latitudeAt = (positionY: number) =>
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * positionY))) * 180) / Math.PI
  return [
    (centerX - halfWidth) * 360 - 180,
    latitudeAt(centerY + halfHeight),
    (centerX + halfWidth) * 360 - 180,
    latitudeAt(centerY - halfHeight),
  ]
}

export function bookingSlotBounds(slots: readonly PublishedBookingSlot[]) {
  const coordinates = slots.flatMap((slot) => slot.footprint.coordinates.flat())
  if (coordinates.length === 0) return undefined
  return [
    [
      Math.min(...coordinates.map(([longitude]) => longitude)),
      Math.min(...coordinates.map(([, latitude]) => latitude)),
    ],
    [
      Math.max(...coordinates.map(([longitude]) => longitude)),
      Math.max(...coordinates.map(([, latitude]) => latitude)),
    ],
  ] satisfies [[number, number], [number, number]]
}

export function bookingSlotMapFeatures(
  slots: readonly PublishedBookingSlot[],
  selectedIds: readonly string[],
  matchingSlotIds: readonly string[],
): FeatureCollection<Polygon> {
  const selected = new Set(selectedIds)
  const matching = new Set(matchingSlotIds)
  return {
    type: 'FeatureCollection',
    features: slots
      .filter((slot) => matching.has(slot.slotId) || selected.has(slot.slotId))
      .map((slot) => ({
        type: 'Feature',
        id: slot.slotId,
        geometry: slot.footprint,
        properties: {
          slotId: slot.slotId,
          code: slot.code,
          availability: slot.availability,
          isSelected: selected.has(slot.slotId),
          isMatching: matching.has(slot.slotId),
        },
      })),
  }
}
