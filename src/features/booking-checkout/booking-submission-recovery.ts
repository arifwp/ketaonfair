const BOOKING_SUBMISSION_RECOVERY_STORAGE_KEY = 'ketaon-booking-submission'

// Only the opaque idempotency key is stored. Authorization stays in HttpOnly cookies.
export function readBookingSubmissionRecoveryKey() {
  try {
    const key = sessionStorage.getItem(BOOKING_SUBMISSION_RECOVERY_STORAGE_KEY)
    return key &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        key,
      )
      ? key
      : null
  } catch {
    return null
  }
}

export function saveBookingSubmissionRecoveryKey(key: string) {
  try {
    sessionStorage.setItem(BOOKING_SUBMISSION_RECOVERY_STORAGE_KEY, key)
  } catch {
    /* In-memory retry remains available if storage is blocked. */
  }
}

export function clearBookingSubmissionRecoveryKey() {
  try {
    sessionStorage.removeItem(BOOKING_SUBMISSION_RECOVERY_STORAGE_KEY)
  } catch {
    /* Storage may be unavailable. */
  }
}
