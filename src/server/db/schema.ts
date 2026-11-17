import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {
  MAX_BOOKING_TOTAL_PRICE_IDR,
  MAX_SLOT_PRICE_IDR,
} from '#/shared/booking-limits'

// EWKT is the write boundary. Public reads explicitly serialize GeoJSON instead.
const polygon = customType<{ data: string }>({
  dataType: () => 'geometry(Polygon,4326)',
})
const lineString = customType<{ data: string }>({
  dataType: () => 'geometry(LineString,4326)',
})
const instant = (name: string) => timestamp(name, { withTimezone: true })
const money = (name: string) => bigint(name, { mode: 'number' })

export const bookingWindowState = pgEnum('booking_window_state', [
  'closed',
  'open',
])
export const layoutState = pgEnum('layout_state', [
  'draft',
  'published',
  'retired',
])
export const bookingOrderState = pgEnum('booking_order_state', [
  'reserved',
  'cancelled',
])
export const prototypePaymentState = pgEnum('prototype_payment_state', [
  'not_integrated',
])
export const reservationState = pgEnum('reservation_state', [
  'reserved',
  'released',
])
export const auditActorKind = pgEnum('audit_actor_kind', [
  'guest',
  'admin',
  'system',
])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    timezone: varchar('timezone', { length: 100 }).notNull(),
    startsAt: instant('starts_at').notNull(),
    endsAt: instant('ends_at').notNull(),
    bookingOpensAt: instant('booking_opens_at').notNull(),
    bookingClosesAt: instant('booking_closes_at').notNull(),
    bookingWindowState: bookingWindowState('booking_window_state')
      .notNull()
      .default('closed'),
    defaultSlotFrontageMillimeters: integer(
      'default_slot_frontage_mm',
    ).notNull(),
    defaultSlotDepthMillimeters: integer('default_slot_depth_mm').notNull(),
    defaultSlotPriceIdr: money('default_slot_price_idr').notNull(),
    isIllustrative: boolean('is_illustrative').notNull().default(false),
    bookingStartedAt: instant('booking_started_at'),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (event) => [
    check('event_dates_valid', sql`${event.endsAt} > ${event.startsAt}`),
    check(
      'event_booking_window_valid',
      sql`${event.bookingClosesAt} > ${event.bookingOpensAt} AND ${event.bookingClosesAt} <= ${event.endsAt}`,
    ),
    check(
      'event_defaults_valid',
      sql`${event.defaultSlotFrontageMillimeters} > 0 AND ${event.defaultSlotDepthMillimeters} > 0 AND ${event.defaultSlotPriceIdr} BETWEEN 1 AND ${sql.raw(String(MAX_SLOT_PRICE_IDR))}`,
    ),
  ],
)

export const layoutVersions = pgTable(
  'layout_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    version: integer('version').notNull(),
    revision: integer('revision').notNull().default(1),
    state: layoutState('state').notNull().default('draft'),
    approvalNote: text('approval_note'),
    publishedAt: instant('published_at'),
  },
  (layout) => [
    unique('layout_event_identity').on(layout.id, layout.eventId),
    unique('layout_event_version').on(layout.eventId, layout.version),
    uniqueIndex('one_published_layout_per_event')
      .on(layout.eventId)
      .where(sql`${layout.state} = 'published'`),
    check(
      'layout_revision_positive',
      sql`${layout.version} > 0 AND ${layout.revision} > 0`,
    ),
    check(
      'published_layout_timestamp',
      sql`${layout.state} <> 'published' OR ${layout.publishedAt} IS NOT NULL`,
    ),
  ],
)

export const inventoryRoutes = pgTable(
  'routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    displayOrder: integer('display_order').notNull(),
  },
  (route) => [
    unique('route_layout_identity').on(route.id, route.layoutId, route.eventId),
    foreignKey({
      columns: [route.layoutId, route.eventId],
      foreignColumns: [layoutVersions.id, layoutVersions.eventId],
    }),
  ],
)

export const boothRows = pgTable(
  'booth_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    routeId: uuid('route_id').notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    footprintSide: varchar('footprint_side', { length: 5 }).notNull(),
    centerline: lineString('centerline').notNull(),
  },
  (row) => [
    unique('row_layout_identity').on(row.id, row.layoutId, row.eventId),
    foreignKey({
      columns: [row.routeId, row.layoutId, row.eventId],
      foreignColumns: [
        inventoryRoutes.id,
        inventoryRoutes.layoutId,
        inventoryRoutes.eventId,
      ],
    }),
    check('row_side_valid', sql`${row.footprintSide} IN ('left', 'right')`),
    check(
      'row_geometry_valid',
      sql`ST_IsValid(${row.centerline}) AND ST_IsSimple(${row.centerline}) AND NOT ST_IsEmpty(${row.centerline}) AND ST_Length(${row.centerline}::geography) > 0`,
    ),
    index('row_centerline_gist').using('gist', row.centerline),
  ],
)

export const approvedStretches = pgTable(
  'approved_stretches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    rowId: uuid('row_id').notNull(),
    startMillimeters: integer('start_mm').notNull(),
    endMillimeters: integer('end_mm').notNull(),
    defaultFrontageMillimeters: integer('default_frontage_mm').notNull(),
    defaultDepthMillimeters: integer('default_depth_mm').notNull(),
    isApproved: boolean('is_approved').notNull().default(false),
    approvalNote: text('approval_note'),
    footprint: polygon('footprint').notNull(),
  },
  (stretch) => [
    unique('stretch_layout_identity').on(
      stretch.id,
      stretch.layoutId,
      stretch.eventId,
    ),
    foreignKey({
      columns: [stretch.rowId, stretch.layoutId, stretch.eventId],
      foreignColumns: [boothRows.id, boothRows.layoutId, boothRows.eventId],
    }),
    check(
      'stretch_interval_valid',
      sql`${stretch.startMillimeters} >= 0 AND ${stretch.endMillimeters} > ${stretch.startMillimeters}`,
    ),
    check(
      'stretch_defaults_valid',
      sql`${stretch.defaultFrontageMillimeters} > 0 AND ${stretch.defaultDepthMillimeters} > 0`,
    ),
    check(
      'stretch_geometry_valid',
      sql`ST_IsValid(${stretch.footprint}) AND NOT ST_IsEmpty(${stretch.footprint}) AND ST_Area(${stretch.footprint}::geography) > 0`,
    ),
    index('stretch_footprint_gist').using('gist', stretch.footprint),
  ],
)

export const exclusions = pgTable(
  'exclusions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    rowId: uuid('row_id').notNull(),
    startMillimeters: integer('start_mm').notNull(),
    endMillimeters: integer('end_mm').notNull(),
    reason: text('reason').notNull(),
    footprint: polygon('footprint'),
  },
  (exclusion) => [
    foreignKey({
      columns: [exclusion.rowId, exclusion.layoutId, exclusion.eventId],
      foreignColumns: [boothRows.id, boothRows.layoutId, boothRows.eventId],
    }),
    check(
      'exclusion_interval_valid',
      sql`${exclusion.startMillimeters} >= 0 AND ${exclusion.endMillimeters} > ${exclusion.startMillimeters}`,
    ),
    check(
      'exclusion_reason_required',
      sql`length(trim(${exclusion.reason})) > 0`,
    ),
    check(
      'exclusion_geometry_valid',
      sql`${exclusion.footprint} IS NULL OR (ST_IsValid(${exclusion.footprint}) AND NOT ST_IsEmpty(${exclusion.footprint}) AND ST_Area(${exclusion.footprint}::geography) > 0)`,
    ),
    index('exclusion_footprint_gist').using('gist', exclusion.footprint),
  ],
)

export const slots = pgTable(
  'slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    approvedStretchId: uuid('approved_stretch_id').notNull(),
    code: varchar('code', { length: 40 }).notNull(),
    displayOrder: integer('display_order').notNull(),
    startMillimeters: integer('start_mm').notNull(),
    endMillimeters: integer('end_mm').notNull(),
    baseFrontageMillimeters: integer('base_frontage_mm').notNull(),
    baseDepthMillimeters: integer('base_depth_mm').notNull(),
    frontageOverrideMillimeters: integer('frontage_override_mm'),
    depthOverrideMillimeters: integer('depth_override_mm'),
    basePriceIdr: money('base_price_idr').notNull(),
    priceOverrideIdr: money('price_override_idr'),
    footprint: polygon('footprint').notNull(),
    isBlocked: boolean('is_blocked').notNull().default(false),
    blockedReason: text('blocked_reason'),
    revision: integer('revision').notNull().default(1),
  },
  (slot) => [
    unique('slot_layout_identity').on(slot.id, slot.layoutId, slot.eventId),
    unique('slot_code_per_layout').on(slot.layoutId, slot.code),
    foreignKey({
      columns: [slot.approvedStretchId, slot.layoutId, slot.eventId],
      foreignColumns: [
        approvedStretches.id,
        approvedStretches.layoutId,
        approvedStretches.eventId,
      ],
    }),
    check(
      'slot_dimensions_valid',
      sql`${slot.baseFrontageMillimeters} > 0 AND ${slot.baseDepthMillimeters} > 0 AND (${slot.frontageOverrideMillimeters} IS NULL OR ${slot.frontageOverrideMillimeters} > 0) AND (${slot.depthOverrideMillimeters} IS NULL OR ${slot.depthOverrideMillimeters} > 0)`,
    ),
    check(
      'slot_interval_matches_frontage',
      sql`${slot.startMillimeters} >= 0 AND ${slot.endMillimeters} - ${slot.startMillimeters} = COALESCE(${slot.frontageOverrideMillimeters}, ${slot.baseFrontageMillimeters})`,
    ),
    check(
      'slot_prices_valid',
      sql`${slot.basePriceIdr} BETWEEN 1 AND ${sql.raw(String(MAX_SLOT_PRICE_IDR))} AND (${slot.priceOverrideIdr} IS NULL OR ${slot.priceOverrideIdr} BETWEEN 1 AND ${sql.raw(String(MAX_SLOT_PRICE_IDR))})`,
    ),
    check(
      'slot_block_reason_valid',
      sql`(${slot.isBlocked} AND length(trim(${slot.blockedReason})) > 0 AND ${slot.blockedReason} IS NOT NULL) OR (NOT ${slot.isBlocked} AND ${slot.blockedReason} IS NULL)`,
    ),
    check('slot_revision_positive', sql`${slot.revision} > 0`),
    check(
      'slot_geometry_valid',
      sql`ST_IsValid(${slot.footprint}) AND NOT ST_IsEmpty(${slot.footprint}) AND ST_Area(${slot.footprint}::geography) > 0`,
    ),
    index('slot_footprint_gist').using('gist', slot.footprint),
  ],
)

export const guestSessions = pgTable(
  'guest_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    createdAt: instant('created_at').notNull().defaultNow(),
    expiresAt: instant('expires_at').notNull(),
  },
  (guest) => [
    check('guest_token_hash_valid', sql`${guest.tokenHash} ~ '^[a-f0-9]{64}$'`),
    check('guest_expiry_valid', sql`${guest.expiresAt} > ${guest.createdAt}`),
  ],
)

export const bookingOrders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    guestSessionId: uuid('guest_session_id')
      .notNull()
      .references(() => guestSessions.id),
    bookingReference: varchar('booking_reference', { length: 40 })
      .notNull()
      .unique(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    submissionPayloadHash: varchar('submission_payload_hash', {
      length: 64,
    }).notNull(),
    contactName: varchar('contact_name', { length: 200 }).notNull(),
    businessName: varchar('business_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 40 }).notNull(),
    state: bookingOrderState('state').notNull().default('reserved'),
    paymentState: prototypePaymentState('payment_state')
      .notNull()
      .default('not_integrated'),
    totalPriceIdr: money('total_price_idr').notNull(),
    layoutRevision: integer('layout_revision').notNull(),
    reservedAt: instant('reserved_at').notNull().defaultNow(),
    cancelledAt: instant('cancelled_at'),
    cancelledByAdminId: text('cancelled_by_admin_id'),
    cancellationReason: text('cancellation_reason'),
  },
  (order) => [
    unique('order_layout_identity').on(order.id, order.layoutId, order.eventId),
    unique('order_guest_idempotency').on(
      order.guestSessionId,
      order.idempotencyKey,
    ),
    foreignKey({
      columns: [order.layoutId, order.eventId],
      foreignColumns: [layoutVersions.id, layoutVersions.eventId],
    }),
    check(
      'order_total_valid',
      sql`${order.totalPriceIdr} BETWEEN 1 AND ${sql.raw(String(MAX_BOOKING_TOTAL_PRICE_IDR))}`,
    ),
    check('order_revision_valid', sql`${order.layoutRevision} > 0`),
    check(
      'order_payload_hash_valid',
      sql`${order.submissionPayloadHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'order_cancellation_valid',
      sql`(${order.state} = 'reserved' AND ${order.cancelledAt} IS NULL AND ${order.cancelledByAdminId} IS NULL AND ${order.cancellationReason} IS NULL) OR (${order.state} = 'cancelled' AND ${order.cancelledAt} >= ${order.reservedAt} AND ${order.cancelledAt} IS NOT NULL AND ${order.cancelledByAdminId} IS NOT NULL AND length(trim(${order.cancelledByAdminId})) > 0 AND ${order.cancellationReason} IS NOT NULL AND length(trim(${order.cancellationReason})) > 0)`,
    ),
  ],
)

export const bookingOrderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingOrderId: uuid('order_id').notNull(),
    slotId: uuid('slot_id').notNull(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    slotCode: varchar('slot_code', { length: 40 }).notNull(),
    routeName: varchar('route_name', { length: 160 }).notNull(),
    frontageMillimeters: integer('frontage_mm').notNull(),
    depthMillimeters: integer('depth_mm').notNull(),
    unitPriceIdr: money('unit_price_idr').notNull(),
    slotRevision: integer('slot_revision').notNull(),
    footprint: polygon('footprint').notNull(),
  },
  (item) => [
    unique('order_item_slot_unique').on(item.bookingOrderId, item.slotId),
    foreignKey({
      columns: [item.bookingOrderId, item.layoutId, item.eventId],
      foreignColumns: [
        bookingOrders.id,
        bookingOrders.layoutId,
        bookingOrders.eventId,
      ],
    }),
    foreignKey({
      columns: [item.slotId, item.layoutId, item.eventId],
      foreignColumns: [slots.id, slots.layoutId, slots.eventId],
    }),
    check(
      'order_item_values_valid',
      sql`${item.frontageMillimeters} > 0 AND ${item.depthMillimeters} > 0 AND ${item.slotRevision} > 0 AND ${item.unitPriceIdr} BETWEEN 1 AND ${sql.raw(String(MAX_SLOT_PRICE_IDR))}`,
    ),
    check(
      'order_item_geometry_valid',
      sql`ST_IsValid(${item.footprint}) AND NOT ST_IsEmpty(${item.footprint}) AND ST_Area(${item.footprint}::geography) > 0`,
    ),
  ],
)

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingOrderId: uuid('order_id').notNull().unique(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    state: reservationState('state').notNull().default('reserved'),
    reservedAt: instant('reserved_at').notNull().defaultNow(),
    releasedAt: instant('released_at'),
  },
  (reservation) => [
    unique('reservation_layout_identity').on(
      reservation.id,
      reservation.layoutId,
      reservation.eventId,
    ),
    foreignKey({
      columns: [
        reservation.bookingOrderId,
        reservation.layoutId,
        reservation.eventId,
      ],
      foreignColumns: [
        bookingOrders.id,
        bookingOrders.layoutId,
        bookingOrders.eventId,
      ],
    }),
    check(
      'reservation_release_valid',
      sql`(${reservation.state} = 'reserved' AND ${reservation.releasedAt} IS NULL) OR (${reservation.state} = 'released' AND ${reservation.releasedAt} IS NOT NULL AND ${reservation.releasedAt} >= ${reservation.reservedAt})`,
    ),
  ],
)

export const slotClaims = pgTable(
  'slot_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id').notNull(),
    slotId: uuid('slot_id').notNull(),
    eventId: uuid('event_id').notNull(),
    layoutId: uuid('layout_id').notNull(),
    reservedAt: instant('reserved_at').notNull().defaultNow(),
    releasedAt: instant('released_at'),
  },
  (claim) => [
    foreignKey({
      columns: [claim.reservationId, claim.layoutId, claim.eventId],
      foreignColumns: [
        reservations.id,
        reservations.layoutId,
        reservations.eventId,
      ],
    }),
    foreignKey({
      columns: [claim.slotId, claim.layoutId, claim.eventId],
      foreignColumns: [slots.id, slots.layoutId, slots.eventId],
    }),
    uniqueIndex('one_active_claim_per_slot')
      .on(claim.slotId)
      .where(sql`${claim.releasedAt} IS NULL`),
    unique('reservation_slot_unique').on(claim.reservationId, claim.slotId),
    check(
      'claim_release_valid',
      sql`${claim.releasedAt} IS NULL OR ${claim.releasedAt} >= ${claim.reservedAt}`,
    ),
  ],
)

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id),
  actorKind: auditActorKind('actor_kind').notNull(),
  actorId: text('actor_id').notNull(),
  operation: varchar('operation', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  previousValues: jsonb('previous_values').$type<Record<string, unknown>>(),
  newValues: jsonb('new_values').$type<Record<string, unknown>>(),
  correlationId: uuid('correlation_id').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
})
