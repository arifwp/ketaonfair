import { useEffect, useRef, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { recoverBookingSubmission } from '#/features/booking-orders/booking-order.functions'
import { useBookingSelection } from '#/features/slot-inventory/booking-selection'
import { publishedBookingInventoryQueryOptions } from '#/features/slot-inventory/slot-inventory.queries'
import { useBookingCheckoutDraft } from '../booking-checkout-draft'
import {
  bookingCustomerDetailsSchema,
  getBookingCustomerErrors,
} from '../booking-checkout.schema'
import { getReviewedBookingQuote } from '../booking-checkout-review'
import {
  establishBookingGuest,
  reserveBookingSelection,
} from '../booking-reservation.functions'
import { bookingQuoteQueryOptions } from '../booking-quote.queries'
import { BookingCheckoutCustomerFields } from './booking-checkout-customer-fields'
import { BookingCheckoutQuoteSummary } from './booking-checkout-quote-summary'
import { BookingCheckoutQuoteProblem } from './booking-checkout-quote-problem'
import type { FormEvent } from 'react'
import type {
  BookingCustomerErrors,
  BookingCustomerField,
} from '../booking-checkout.schema'

const checkoutRoute = getRouteApi('/booking/checkout')

export function BookingCheckoutPage() {
  const { eventId } = checkoutRoute.useLoaderData()
  const navigate = checkoutRoute.useNavigate()
  const { selectedBookingSlotIds, removeBookingSlot } = useBookingSelection()
  const {
    customer,
    updateCustomerField,
    prepareSubmissionKey,
    reservationIntent,
    setReservationIntent,
    submissionRecoveryKey,
    clearSubmissionRecovery,
  } = useBookingCheckoutDraft()
  const [errors, setErrors] = useState<BookingCustomerErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const isSubmitting = useRef(false)
  const queryClient = useQueryClient()
  const inventoryQuery = useQuery(
    publishedBookingInventoryQueryOptions(eventId),
  )
  const inventory =
    inventoryQuery.data?.status === 'published'
      ? inventoryQuery.data.inventory
      : undefined
  const quoteOptions = bookingQuoteQueryOptions(
    eventId,
    selectedBookingSlotIds,
    inventory?.layoutId,
    inventory?.layoutRevision,
  )
  const quoteQuery = useQuery(quoteOptions)
  const guestQuery = useQuery({
    queryKey: ['booking', 'guest-session'],
    enabled: selectedBookingSlotIds.length > 0 || reservationIntent !== null,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const guest = await establishBookingGuest({
        signal: AbortSignal.timeout(15_000),
      })
      if (guest.didCreateSession)
        queryClient.removeQueries({ queryKey: ['private-booking-order'] })
      if (guest.didCreateSession)
        queryClient.removeQueries({ queryKey: ['private-booking-recovery'] })
      return guest
    },
  })
  const reservation = useMutation({
    mutationFn: reserveBookingSelection,
    retry: false,
    gcTime: 0,
  })
  const recoveryQuery = useQuery({
    queryKey: ['private-booking-recovery', submissionRecoveryKey],
    enabled: submissionRecoveryKey !== null,
    retry: 1,
    gcTime: 0,
    queryFn: () =>
      recoverBookingSubmission({
        data: { submissionKey: submissionRecoveryKey ?? '' },
      }),
  })
  useEffect(() => {
    if (recoveryQuery.data?.status !== 'found') return
    void navigate({
      to: '/booking/orders/$bookingOrderId',
      params: { bookingOrderId: recoveryQuery.data.bookingOrderId },
      replace: true,
    }).then(clearSubmissionRecovery)
  }, [recoveryQuery.data, navigate, clearSubmissionRecovery])
  const quote =
    quoteQuery.data?.status === 'quoted' ? quoteQuery.data : undefined
  const hasReadError =
    inventoryQuery.isError ||
    quoteQuery.isError ||
    quoteQuery.fetchStatus === 'paused'
  const isFormLocked = reservation.isPending || reservationIntent !== null
  const reservationConflict =
    reservation.data?.status === 'slots_unavailable' ||
    reservation.data?.status === 'booking_closed' ||
    reservation.data?.status === 'not_found'
      ? reservation.data
      : undefined
  const quoteProblem = reservationIntent
    ? undefined
    : (reservationConflict ??
      (quoteQuery.data?.status !== 'quoted' ? quoteQuery.data : undefined))

  function handleQuoteRetry() {
    reservation.reset()
    void inventoryQuery.refetch()
    if (inventory) void quoteQuery.refetch()
  }

  function handleCustomerChange(field: BookingCustomerField, value: string) {
    updateCustomerField(field, value)
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  function handleCustomerBlur(field: BookingCustomerField) {
    const validation = bookingCustomerDetailsSchema.safeParse(customer)
    setErrors((previous) => ({
      ...previous,
      [field]: validation.success
        ? undefined
        : getBookingCustomerErrors(validation.error)[field],
    }))
  }

  async function handleReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting.current) return
    if (!guestQuery.data || guestQuery.isError) {
      void guestQuery.refetch()
      return
    }
    if (!reservationIntent && !quote) {
      handleQuoteRetry()
      return
    }
    let input = reservationIntent
    if (!input) {
      const validation = bookingCustomerDetailsSchema.safeParse(customer)
      if (!validation.success) {
        const nextErrors = getBookingCustomerErrors(validation.error)
        setErrors(nextErrors)
        const firstField = Object.keys(nextErrors)[0]
        const firstInput = firstField
          ? formRef.current?.elements.namedItem(firstField)
          : null
        if (firstInput instanceof HTMLElement) firstInput.focus()
        return
      }
      if (!quote) return
      const reviewedQuote = getReviewedBookingQuote(quote)
      input = {
        customer: validation.data,
        reviewedQuote,
        submissionKey: prepareSubmissionKey(),
      }
      setReservationIntent(input)
    }
    isSubmitting.current = true
    try {
      const result = await reservation.mutateAsync({
        data: input,
        signal: AbortSignal.timeout(20_000),
      })
      // A transport failure leaves the exact intent locked for same-key recovery.
      // A domain response establishes whether this intent created an order.
      setReservationIntent(null)
      if (result.status === 'reserved') {
        for (const slot of input.reviewedQuote.items)
          removeBookingSlot(slot.slotId)
        void queryClient.invalidateQueries({
          queryKey: publishedBookingInventoryQueryOptions(eventId).queryKey,
        })
        await navigate({
          to: '/booking/orders/$bookingOrderId',
          params: { bookingOrderId: result.bookingOrderId },
          replace: true,
        })
        clearSubmissionRecovery()
      } else if (result.status === 'quote_changed') {
        queryClient.setQueryData(quoteOptions.queryKey, result.quote)
      } else if (result.status === 'session_required') {
        void guestQuery.refetch()
      } else if (result.status === 'idempotency_conflict') {
        void recoveryQuery.refetch()
      } else {
        void queryClient.invalidateQueries({
          queryKey: publishedBookingInventoryQueryOptions(eventId).queryKey,
        })
      }
    } catch {
      // Keep the immutable request until the backend resolves its outcome.
    } finally {
      isSubmitting.current = false
    }
  }

  const isRetryingRead = (!quote && hasReadError) || guestQuery.isError
  const isButtonDisabled =
    reservation.isPending ||
    (!reservationIntent &&
      !isRetryingRead &&
      (!quote || !guestQuery.data || Boolean(quoteProblem))) ||
    reservation.data?.status === 'idempotency_conflict'
  const buttonLabel = reservation.isPending
    ? 'Lagi nyimpen pesanan...'
    : reservationIntent
      ? 'Cek hasil pesanan'
      : isRetryingRead
        ? 'Coba cek lagi'
        : guestQuery.isPending
          ? 'Lagi nyiapin pesanan...'
          : reservation.data?.status === 'quote_changed'
            ? 'Pesan dengan harga terbaru'
            : `Pesan ${selectedBookingSlotIds.length} slot`

  return (
    <main className="min-h-dvh bg-muted/40 pb-[max(2rem,env(safe-area-inset-bottom))] text-foreground">
      <header className="border-b bg-background px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/booking"
            search={{ basemap: 'satellite', q: '' }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold text-primary! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Balik ke peta
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            Pilihan udah pas?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Isi datamu, terus cek detail dan harganya sebelum pesan.
          </p>
        </div>
      </header>
      {selectedBookingSlotIds.length === 0 && !reservationIntent ? (
        <section
          className="mx-auto mt-8 max-w-lg px-4"
          aria-labelledby="checkout-empty-heading"
        >
          <h2 id="checkout-empty-heading" className="text-lg font-bold">
            Keranjangmu masih kosong, nih.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih slot di peta dulu. Kalau halaman dimuat ulang, pilihan
            sebelumnya perlu dipilih lagi.
          </p>
          {submissionRecoveryKey && (
            <Button
              variant="secondary"
              className="mt-4"
              disabled={recoveryQuery.isFetching}
              onClick={() => void recoveryQuery.refetch()}
            >
              {recoveryQuery.isFetching
                ? 'Lagi cek pesanan...'
                : 'Cek hasil pesanan sebelumnya'}
            </Button>
          )}
          <Link
            to="/booking"
            search={{ basemap: 'satellite', q: '' }}
            className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Pilih slot di peta
          </Link>
        </section>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => void handleReservation(event)}
          aria-label="Data pemesan dan pilihan slot"
          className="mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-2 md:items-start"
        >
          <section className="rounded-xl border bg-background p-4 sm:p-6">
            <BookingCheckoutCustomerFields
              customer={customer}
              errors={errors}
              isPending={isFormLocked}
              onChange={handleCustomerChange}
              onBlur={handleCustomerBlur}
            />
          </section>
          <div className="space-y-4">
            {quote && (
              <BookingCheckoutQuoteSummary
                quote={quote}
                isPending={isFormLocked}
                onRemove={(slotId) => {
                  removeBookingSlot(slotId)
                  reservation.reset()
                }}
              />
            )}
            {(inventoryQuery.isPending ||
              (quoteQuery.isPending && inventory && !hasReadError)) && (
              <p role="status" className="p-4 text-sm">
                Lagi cek slot dan harga terbaru...
              </p>
            )}
            <BookingCheckoutQuoteProblem
              problem={quoteProblem}
              slotCodeById={
                new Map(
                  inventory?.slots.map((slot) => [slot.slotId, slot.code]),
                )
              }
              isPending={isFormLocked}
              onRemoveUnavailable={(slotIds) => {
                for (const slotId of slotIds) removeBookingSlot(slotId)
                reservation.reset()
              }}
              onRetry={handleQuoteRetry}
            />
            {reservation.data?.status === 'quote_changed' && (
              <p role="alert" className="p-4 text-sm font-semibold">
                Harga atau ukuran berubah. Cek detail terbaru sebelum pesan
                lagi, ya.
              </p>
            )}
            {reservation.data?.status === 'rate_limited' && (
              <p role="alert" className="p-4 text-sm">
                Permintaanmu terlalu cepat. Tunggu sebentar, lalu coba lagi.
              </p>
            )}
            {reservation.data?.status === 'idempotency_conflict' && (
              <p role="alert" className="p-4 text-sm">
                Permintaan ini beda dari pesanan sebelumnya. Hubungi panitia
                buat cek pesananmu.
              </p>
            )}
            {reservationIntent && !reservation.isPending && (
              <p role="alert" className="p-4 text-sm">
                Hasil pesananmu belum bisa dipastikan. Cek hasilnya dulu sebelum
                mengubah pilihan atau data, ya.
              </p>
            )}
            <div className="rounded-xl border bg-background p-4 sm:p-6">
              <Button
                type="submit"
                className="min-h-12 w-full"
                disabled={isButtonDisabled}
              >
                {(reservation.isPending || guestQuery.isPending) && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                {buttonLabel}
              </Button>
            </div>
          </div>
        </form>
      )}
    </main>
  )
}
