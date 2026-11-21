import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  readBookingSubmissionRecoveryKey,
  saveBookingSubmissionRecoveryKey,
  clearBookingSubmissionRecoveryKey,
} from './booking-submission-recovery'
import type { ReactNode } from 'react'
import type {
  BookingCustomerDetails,
  BookingCustomerField,
  BookingCheckoutReviewInput,
} from './booking-checkout.schema'

const EMPTY_CUSTOMER_DETAILS: BookingCustomerDetails = {
  contactName: '',
  sellingDescription: '',
  email: '',
  phone: '',
  note: '',
}

const BookingCheckoutDraftContext = createContext<{
  customer: BookingCustomerDetails
  updateCustomerField: (field: BookingCustomerField, value: string) => void
  prepareSubmissionKey: () => string
  submissionRecoveryKey: string | null
  clearSubmissionRecovery: () => void
  reservationIntent: BookingCheckoutReviewInput | null
  setReservationIntent: (intent: BookingCheckoutReviewInput | null) => void
} | null>(null)

export function BookingCheckoutDraftProvider({
  children,
}: {
  children: ReactNode
}) {
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER_DETAILS)
  const [reservationIntent, setReservationIntent] =
    useState<BookingCheckoutReviewInput | null>(null)
  const submission = useRef<string | null>(null)
  const [submissionRecoveryKey, setSubmissionRecoveryKey] = useState<
    string | null
  >(null)
  useEffect(() => {
    const key = readBookingSubmissionRecoveryKey()
    submission.current = key
    setSubmissionRecoveryKey(key)
  }, [])
  const clearSubmissionRecovery = useCallback(() => {
    submission.current = null
    setSubmissionRecoveryKey(null)
    clearBookingSubmissionRecoveryKey()
  }, [])
  return (
    <BookingCheckoutDraftContext.Provider
      value={{
        customer,
        reservationIntent,
        setReservationIntent,
        updateCustomerField: (field, value) =>
          setCustomer((previous) => ({ ...previous, [field]: value })),
        submissionRecoveryKey,
        clearSubmissionRecovery,
        prepareSubmissionKey: () => {
          const key =
            submission.current ??
            readBookingSubmissionRecoveryKey() ??
            crypto.randomUUID()
          submission.current = key
          saveBookingSubmissionRecoveryKey(key)
          return key
        },
      }}
    >
      {children}
    </BookingCheckoutDraftContext.Provider>
  )
}

export function useBookingCheckoutDraft() {
  const draft = useContext(BookingCheckoutDraftContext)
  if (!draft) throw new Error('Checkout requires its booking draft provider.')
  return draft
}
