import { z } from 'zod'
import { MAX_SLOT_PRICE_IDR } from '#/shared/booking-limits'

const coordinateSchema = z.tuple([z.number(), z.number()])
export const slotFootprintSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordinateSchema)),
})

export const publishedInventoryInputSchema = z.object({ eventId: z.uuid() })

export const publishedBookingSlotSchema = z.object({
  slotId: z.uuid(),
  code: z.string(),
  routeId: z.uuid(),
  routeName: z.string(),
  routeDisplayOrder: z.number().int(),
  displayOrder: z.number().int(),
  frontageMillimeters: z.number().int().positive(),
  depthMillimeters: z.number().int().positive(),
  priceIdr: z.number().int().positive().max(MAX_SLOT_PRICE_IDR),
  revision: z.number().int().positive(),
  availability: z.enum(['available', 'reserved', 'blocked']),
  footprint: slotFootprintSchema,
})

export const publishedBookingInventorySchema = z.object({
  event: z.object({
    eventId: z.uuid(),
    name: z.string(),
    slug: z.string(),
    timezone: z.string(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    bookingOpensAt: z.iso.datetime(),
    bookingClosesAt: z.iso.datetime(),
    bookingWindowState: z.enum(['open', 'closed']),
    isIllustrative: z.boolean(),
  }),
  layoutId: z.uuid(),
  layoutRevision: z.number().int().positive(),
  slots: z.array(publishedBookingSlotSchema),
  exclusions: z.array(
    z.object({
      exclusionId: z.uuid(),
      reason: z.string(),
      footprint: slotFootprintSchema.nullable(),
    }),
  ),
})

export type PublishedBookingInventory = z.infer<
  typeof publishedBookingInventorySchema
>
export type PublishedBookingSlot = z.infer<typeof publishedBookingSlotSchema>

export type PublishedInventoryResult =
  | { status: 'published'; inventory: PublishedBookingInventory }
  | { status: 'not_found' }
