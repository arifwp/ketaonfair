import { Link, useRouter } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export function BookingInventoryPending() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16" role="status">
      <h1 className="text-2xl font-bold">Lagi nyiapin slotmu...</h1>
      <p className="mt-3">Tunggu bentar, ya. Lagi cek slot yang tersedia.</p>
    </section>
  )
}

export function BookingInventoryError() {
  const router = useRouter()
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-bold">Slotnya belum bisa dibuka, nih.</h1>
      <p className="my-4" role="alert">
        Lagi ada kendala pas memuat slot. Coba lagi sebentar, ya.
      </p>
      <Button onClick={() => void router.invalidate()}>Coba lagi</Button>
      <Link to="/" className="ml-4 underline">
        Balik ke acara
      </Link>
    </section>
  )
}
