import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createBookingDatabase } from '#/server/db/booking-database.server'
import { migrateBookingDatabase } from '#/server/db/migrate-booking-database.server'
import {
  approvedStretches,
  bookingOrderItems,
  bookingOrders,
  events,
  exclusions,
  guestSessions,
  layoutVersions,
  reservations,
  slotClaims,
  slots,
} from '#/server/db/schema'
import { readPublishedBookingInventory } from '#/server/services/published-booking-inventory.server'
import { readBookingQuote } from '#/server/services/booking-quote.server'
import {
  ILLUSTRATIVE_EVENT_ID,
  ILLUSTRATIVE_LAYOUT_ID,
  seedIllustrativeBookingInventory,
} from '../../db/seeds/illustrative-booking-inventory'
import type { PublishedBookingInventory } from '#/features/slot-inventory/slot-inventory.schema'

const pooledUrl = process.env.TEST_DATABASE_URL
const directUrl = process.env.TEST_DATABASE_URL_UNPOOLED
const branchId = process.env.TEST_DATABASE_BRANCH_ID
if (!pooledUrl || !directUrl || !branchId?.startsWith('br-')) {
  throw new Error(
    'Integration tests require TEST_DATABASE_URL, TEST_DATABASE_URL_UNPOOLED and TEST_DATABASE_BRANCH_ID on a disposable Neon branch. Tests never fall back to DATABASE_URL.',
  )
}
if (
  new URL(directUrl).hostname.includes('-pooler.') ||
  new URL(pooledUrl).hostname.replace('-pooler.', '.') !==
    new URL(directUrl).hostname ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).hostname.replace('-pooler.', '.') ===
      new URL(directUrl).hostname)
) {
  throw new Error(
    'Test connections must target one separate branch, with a direct migration connection.',
  )
}
const connection = createBookingDatabase(pooledUrl)
const database = connection.database
let inventory: PublishedBookingInventory

function slotByCode(code: string) {
  const slot = inventory.slots.find((candidate) => candidate.code === code)
  if (!slot) throw new Error(`Missing fixture slot ${code}`)
  return slot
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  return postgresErrorCode(error.cause)
}

async function expectDatabaseConflict(
  operation: () => Promise<unknown>,
  code = '23514',
) {
  let failure: unknown
  try {
    await operation()
  } catch (error) {
    failure = error
  }
  expect(postgresErrorCode(failure)).toBe(code)
}

async function createReservationFixture(slotCode: string) {
  const slot = slotByCode(slotCode)
  const guestSessionId = randomUUID()
  const bookingOrderId = randomUUID()
  const reservationId = randomUUID()
  await database.transaction(async (transaction) => {
    await transaction.insert(guestSessions).values({
      id: guestSessionId,
      tokenHash: randomUUID().replaceAll('-', '').repeat(2),
      expiresAt: new Date(Date.now() + 86400000),
    })
    await transaction.insert(bookingOrders).values({
      id: bookingOrderId,
      eventId: ILLUSTRATIVE_EVENT_ID,
      layoutId: ILLUSTRATIVE_LAYOUT_ID,
      guestSessionId,
      bookingReference: `TEST-${randomUUID().slice(0, 18)}`,
      idempotencyKey: randomUUID(),
      submissionPayloadHash: 'a'.repeat(64),
      contactName: 'Integration fixture',
      businessName: 'Synthetic test only',
      email: 'fixture@example.invalid',
      phone: '0000000000',
      totalPriceIdr: slot.priceIdr,
      layoutRevision: inventory.layoutRevision,
    })
    await transaction.insert(bookingOrderItems).values({
      bookingOrderId,
      slotId: slot.slotId,
      eventId: ILLUSTRATIVE_EVENT_ID,
      layoutId: ILLUSTRATIVE_LAYOUT_ID,
      slotCode: slot.code,
      routeName: slot.routeName,
      frontageMillimeters: slot.frontageMillimeters,
      depthMillimeters: slot.depthMillimeters,
      unitPriceIdr: slot.priceIdr,
      slotRevision: slot.revision,
      footprint: sql`(SELECT footprint FROM slots WHERE id = ${slot.slotId})`,
    })
    await transaction.insert(reservations).values({
      id: reservationId,
      bookingOrderId,
      eventId: ILLUSTRATIVE_EVENT_ID,
      layoutId: ILLUSTRATIVE_LAYOUT_ID,
    })
  })
  return { guestSessionId, bookingOrderId, reservationId, slotId: slot.slotId }
}

beforeAll(async () => {
  await migrateBookingDatabase(directUrl)
  await seedIllustrativeBookingInventory(database)
  const result = await readPublishedBookingInventory(
    database,
    ILLUSTRATIVE_EVENT_ID,
  )
  if (result.status !== 'published')
    throw new Error('Seed did not publish inventory.')
  inventory = result.inventory
})

afterAll(async () => {
  await connection.close()
})

describe('published illustrative inventory and authoritative quotes', () => {
  it('seeds 60 mixed-size/priced slots, two route groups and persistent access gaps', async () => {
    expect(inventory.event.isIllustrative).toBe(true)
    expect(inventory.slots).toHaveLength(60)
    expect(new Set(inventory.slots.map((slot) => slot.routeId)).size).toBe(2)
    expect(inventory.exclusions).toHaveLength(2)
    expect(
      inventory.slots.filter((slot) => slot.availability === 'available'),
    ).toHaveLength(58)
    expect(
      inventory.slots.filter((slot) => slot.availability === 'blocked'),
    ).toHaveLength(2)
    expect(
      new Set(inventory.slots.map((slot) => slot.frontageMillimeters)),
    ).toEqual(new Set([1200, 1500, 2100]))
    expect(slotByCode('A-001').priceIdr).toBe(325000)
    expect(slotByCode('A-003').priceIdr).toBe(250000)
    expect(await seedIllustrativeBookingInventory(database)).toEqual({
      status: 'already_seeded',
    })
    const publicPayload = JSON.stringify(inventory)
    for (const privateField of [
      'guestSession',
      'tokenHash',
      'email',
      'phone',
      'bookingReference',
      'contactName',
    ]) {
      expect(publicPayload).not.toContain(privateField)
    }
  })

  it('returns exact independent prices, dimensions and revisions without allocating', async () => {
    const first = slotByCode('A-001')
    const second = slotByCode('A-003')
    const quote = await readBookingQuote(database, {
      eventId: ILLUSTRATIVE_EVENT_ID,
      slotIds: [first.slotId, second.slotId],
    })
    expect(quote.status).toBe('quoted')
    if (quote.status !== 'quoted') throw new Error('Expected quote')
    expect(quote.totalPriceIdr).toBe(575000)
    expect(quote.paymentState).toBe('not_integrated')
    expect(quote.layoutRevision).toBe(1)
    expect(
      quote.items.map((item) => [
        item.frontageMillimeters,
        item.depthMillimeters,
        item.priceIdr,
      ]),
    ).toEqual([
      [1200, 2000, 325000],
      [2100, 2500, 250000],
    ])
    expect(
      await database
        .select()
        .from(slotClaims)
        .where(
          and(
            inArray(slotClaims.slotId, [first.slotId, second.slotId]),
            isNull(slotClaims.releasedAt),
          ),
        ),
    ).toHaveLength(0)

    await database
      .update(slots)
      .set({ priceOverrideIdr: 330000, revision: 2 })
      .where(eq(slots.id, first.slotId))
    try {
      const refreshed = await readBookingQuote(database, {
        eventId: ILLUSTRATIVE_EVENT_ID,
        slotIds: [first.slotId],
      })
      expect(refreshed.status === 'quoted' && refreshed.totalPriceIdr).toBe(
        330000,
      )
      expect(quote.items.at(0)?.priceIdr).toBe(325000)
    } finally {
      await database
        .update(slots)
        .set({ priceOverrideIdr: 325000, revision: 1 })
        .where(eq(slots.id, first.slotId))
    }
  })

  it('reports missing, blocked, closed and unpublished inventory honestly', async () => {
    expect(await readPublishedBookingInventory(database, randomUUID())).toEqual(
      { status: 'not_found' },
    )
    const blockedSlotId = slotByCode('A-030').slotId
    expect(
      await readBookingQuote(database, {
        eventId: ILLUSTRATIVE_EVENT_ID,
        slotIds: [blockedSlotId],
      }),
    ).toEqual({ status: 'slots_unavailable', slotIds: [blockedSlotId] })
    await database
      .update(events)
      .set({ bookingWindowState: 'closed' })
      .where(eq(events.id, ILLUSTRATIVE_EVENT_ID))
    try {
      expect(
        await readBookingQuote(database, {
          eventId: ILLUSTRATIVE_EVENT_ID,
          slotIds: [slotByCode('A-001').slotId],
        }),
      ).toEqual({ status: 'booking_closed' })
    } finally {
      await database
        .update(events)
        .set({ bookingWindowState: 'open' })
        .where(eq(events.id, ILLUSTRATIVE_EVENT_ID))
    }
    await database
      .update(layoutVersions)
      .set({ state: 'draft' })
      .where(eq(layoutVersions.id, ILLUSTRATIVE_LAYOUT_ID))
    try {
      expect(
        await readPublishedBookingInventory(database, ILLUSTRATIVE_EVENT_ID),
      ).toEqual({ status: 'not_found' })
    } finally {
      await database
        .update(layoutVersions)
        .set({ state: 'published' })
        .where(eq(layoutVersions.id, ILLUSTRATIVE_LAYOUT_ID))
    }
  })
})

describe('persisted booking schedule', () => {
  it('uses changed opening/closing timestamps and rejects an invalid window', async () => {
    const original = (
      await database
        .select()
        .from(events)
        .where(eq(events.id, ILLUSTRATIVE_EVENT_ID))
    ).at(0)
    if (!original) throw new Error('Missing fixture event')
    const input = {
      eventId: ILLUSTRATIVE_EVENT_ID,
      slotIds: [slotByCode('A-001').slotId],
    }
    const now = Date.now()
    try {
      await database
        .update(events)
        .set({
          bookingOpensAt: new Date(now + 3600000),
          bookingClosesAt: new Date(now + 7200000),
        })
        .where(eq(events.id, original.id))
      expect(await readBookingQuote(database, input)).toEqual({
        status: 'booking_closed',
      })
      await database
        .update(events)
        .set({
          bookingOpensAt: new Date(now - 7200000),
          bookingClosesAt: new Date(now - 3600000),
        })
        .where(eq(events.id, original.id))
      expect(await readBookingQuote(database, input)).toEqual({
        status: 'booking_closed',
      })
      await database
        .update(events)
        .set({
          bookingOpensAt: new Date(now - 3600000),
          bookingClosesAt: new Date(now + 3600000),
        })
        .where(eq(events.id, original.id))
      expect((await readBookingQuote(database, input)).status).toBe('quoted')
      await expectDatabaseConflict(() =>
        database
          .update(events)
          .set({
            bookingOpensAt: new Date(now + 7200000),
            bookingClosesAt: new Date(now + 3600000),
          })
          .where(eq(events.id, original.id)),
      )
    } finally {
      await database
        .update(events)
        .set({
          bookingOpensAt: original.bookingOpensAt,
          bookingClosesAt: original.bookingClosesAt,
        })
        .where(eq(events.id, original.id))
    }
  })
})

describe('database allocation and snapshot invariants (not the B06 reservation service)', () => {
  it('enforces one active claim across two concurrent PostgreSQL transactions', async () => {
    const first = await createReservationFixture('B-001')
    const second = await createReservationFixture('B-001')
    const fixtures = [first, second]
    try {
      const outcomes = await Promise.allSettled(
        fixtures.map((fixture) =>
          database.transaction(async (transaction) => {
            await transaction.insert(slotClaims).values({
              eventId: ILLUSTRATIVE_EVENT_ID,
              layoutId: ILLUSTRATIVE_LAYOUT_ID,
              slotId: fixture.slotId,
              reservationId: fixture.reservationId,
            })
          }),
        ),
      )
      expect(
        outcomes.filter((outcome) => outcome.status === 'fulfilled'),
      ).toHaveLength(1)
      const failure = outcomes.find((outcome) => outcome.status === 'rejected')
      expect(
        failure?.status === 'rejected' && postgresErrorCode(failure.reason),
      ).toBe('23505')
      const refreshed = await readPublishedBookingInventory(
        database,
        ILLUSTRATIVE_EVENT_ID,
      )
      expect(
        refreshed.status === 'published' &&
          refreshed.inventory.slots.find((slot) => slot.slotId === first.slotId)
            ?.availability,
      ).toBe('reserved')
      expect(
        await readBookingQuote(database, {
          eventId: ILLUSTRATIVE_EVENT_ID,
          slotIds: [first.slotId],
        }),
      ).toEqual({ status: 'slots_unavailable', slotIds: [first.slotId] })
    } finally {
      await database.transaction(async (transaction) => {
        const releasedAt = new Date()
        await transaction
          .update(slotClaims)
          .set({ releasedAt })
          .where(
            inArray(
              slotClaims.reservationId,
              fixtures.map((fixture) => fixture.reservationId),
            ),
          )
        await transaction
          .update(reservations)
          .set({ releasedAt, state: 'released' })
          .where(
            inArray(
              reservations.id,
              fixtures.map((fixture) => fixture.reservationId),
            ),
          )
        await transaction
          .update(bookingOrders)
          .set({
            state: 'cancelled',
            cancelledAt: releasedAt,
            cancelledByAdminId: 'integration-fixture-cleanup',
            cancellationReason: 'Release isolated test fixture',
          })
          .where(
            inArray(
              bookingOrders.id,
              fixtures.map((fixture) => fixture.bookingOrderId),
            ),
          )
      })
    }
  })

  it('rejects snapshot edits and cross-event item ownership', async () => {
    const fixture = await createReservationFixture('B-002')
    await expectDatabaseConflict(() =>
      database
        .update(bookingOrders)
        .set({ totalPriceIdr: 1 })
        .where(eq(bookingOrders.id, fixture.bookingOrderId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(bookingOrders)
        .set({ contactName: 'Rewritten customer' })
        .where(eq(bookingOrders.id, fixture.bookingOrderId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(bookingOrderItems)
        .set({ unitPriceIdr: 1 })
        .where(eq(bookingOrderItems.bookingOrderId, fixture.bookingOrderId)),
    )
    await expectDatabaseConflict(() =>
      database
        .delete(bookingOrderItems)
        .where(eq(bookingOrderItems.bookingOrderId, fixture.bookingOrderId)),
    )
    await expectDatabaseConflict(
      () =>
        database.insert(slotClaims).values({
          eventId: randomUUID(),
          layoutId: ILLUSTRATIVE_LAYOUT_ID,
          slotId: fixture.slotId,
          reservationId: fixture.reservationId,
        }),
      '23503',
    )
  })

  it('rejects duplicate guest submission keys and malformed guest token hashes', async () => {
    const fixture = await createReservationFixture('B-003')
    const original = (
      await database
        .select()
        .from(bookingOrders)
        .where(eq(bookingOrders.id, fixture.bookingOrderId))
    ).at(0)
    if (!original) throw new Error('Missing fixture order')
    await expectDatabaseConflict(
      () =>
        database.insert(bookingOrders).values({
          ...original,
          id: randomUUID(),
          bookingReference: `TEST-${randomUUID().slice(0, 18)}`,
        }),
      '23505',
    )
    await expectDatabaseConflict(() =>
      database.insert(guestSessions).values({
        tokenHash: 'plaintext-token',
        expiresAt: new Date(Date.now() + 86400000),
      }),
    )
  })
})

describe('spatial, dimension and price constraints', () => {
  it('rejects invalid polygons, footprint overflow and physical overlap', async () => {
    const slotId = slotByCode('A-001').slotId
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({
          footprint: sql`ST_GeomFromText('POLYGON((0 0,1 1,1 0,0 1,0 0))',4326)`,
        })
        .where(eq(slots.id, slotId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({ footprint: sql`ST_Translate(footprint, 0.01, 0)` })
        .where(eq(slots.id, slotId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({
          footprint: sql`(SELECT footprint FROM slots WHERE id = ${slotByCode('A-002').slotId})`,
        })
        .where(eq(slots.id, slotId)),
    )
  })

  it('rejects slot access-gap intersections and invalid parent edits atomically', async () => {
    const slotId = slotByCode('A-001').slotId
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({ startMillimeters: 20000, endMillimeters: 21200 })
        .where(eq(slots.id, slotId)),
    )
    const sourceSlot = (
      await database.select().from(slots).where(eq(slots.id, slotId))
    ).at(0)
    if (!sourceSlot) throw new Error('Missing fixture slot')
    await expectDatabaseConflict(() =>
      database
        .update(approvedStretches)
        .set({ isApproved: false })
        .where(eq(approvedStretches.id, sourceSlot.approvedStretchId)),
    )
    const stretch = (
      await database
        .select()
        .from(approvedStretches)
        .where(eq(approvedStretches.id, sourceSlot.approvedStretchId))
    ).at(0)
    if (!stretch) throw new Error('Missing fixture stretch')
    await expectDatabaseConflict(() =>
      database.insert(exclusions).values({
        eventId: ILLUSTRATIVE_EVENT_ID,
        layoutId: ILLUSTRATIVE_LAYOUT_ID,
        rowId: stretch.rowId,
        startMillimeters: 0,
        endMillimeters: 1200,
        reason: 'Conflicting fixture gap',
      }),
    )
    const unchanged = (
      await database.select().from(slots).where(eq(slots.id, slotId))
    ).at(0)
    expect(unchanged?.startMillimeters).toBe(0)
    expect(unchanged?.endMillimeters).toBe(1200)
  })

  it('rejects negative/overflow prices and interval/frontage mismatches', async () => {
    const slotId = slotByCode('A-001').slotId
    for (const priceOverrideIdr of [-1, 0, 1_000_000_000_001]) {
      await expectDatabaseConflict(() =>
        database
          .update(slots)
          .set({ priceOverrideIdr })
          .where(eq(slots.id, slotId)),
      )
    }
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({ frontageOverrideMillimeters: 2100 })
        .where(eq(slots.id, slotId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({ depthOverrideMillimeters: -1 })
        .where(eq(slots.id, slotId)),
    )
    await expectDatabaseConflict(() =>
      database
        .update(slots)
        .set({ isBlocked: true, blockedReason: null })
        .where(eq(slots.id, slotId)),
    )
  })
})
