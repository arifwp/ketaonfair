import type {
  BookingCustomerDetails,
  BookingCustomerErrors,
  BookingCustomerField,
} from '../booking-checkout.schema'

const CUSTOMER_FIELDS = [
  {
    name: 'contactName',
    label: 'Nama kamu',
    type: 'text',
    autoComplete: 'name',
    maxLength: 200,
  },
  {
    name: 'sellingDescription',
    label: 'Mau jualan apa?',
    type: 'text',
    autoComplete: 'off',
    maxLength: 200,
    hint: 'Ceritain singkat, misalnya es teh dan camilan.',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    maxLength: 254,
  },
  {
    name: 'phone',
    label: 'Nomor WhatsApp',
    type: 'tel',
    autoComplete: 'tel',
    maxLength: 40,
    hint: 'Kode Indonesia +62. Bisa tulis 08 atau +62, nanti dirapihin otomatis.',
  },
] as const

const INPUT_CLASS_NAME =
  'mt-2 min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive'

export function BookingCheckoutCustomerFields({
  customer,
  errors,
  isPending,
  onChange,
  onBlur,
}: {
  customer: BookingCustomerDetails
  errors: BookingCustomerErrors
  isPending: boolean
  onChange: (field: BookingCustomerField, value: string) => void
  onBlur: (field: BookingCustomerField) => void
}) {
  return (
    <fieldset disabled={isPending} className="space-y-5">
      <legend className="mb-5 text-lg font-bold">Kenalan dulu, yuk</legend>
      <p className="text-sm text-muted-foreground">
        Isi data kontakmu dan rencana jualan. Nggak perlu bikin akun.
      </p>
      {CUSTOMER_FIELDS.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={`checkout-${field.name}`}
            className="text-sm font-semibold"
          >
            {field.label}
          </label>
          <input
            id={`checkout-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            inputMode={
              field.type === 'tel'
                ? 'tel'
                : field.type === 'email'
                  ? 'email'
                  : 'text'
            }
            maxLength={field.maxLength}
            required
            value={customer[field.name]}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={[
              `checkout-${field.name}-hint`,
              errors[field.name] ? `checkout-${field.name}-error` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            className={INPUT_CLASS_NAME}
            onChange={(event) => onChange(field.name, event.target.value)}
            onBlur={() => onBlur(field.name)}
          />
          <p
            id={`checkout-${field.name}-hint`}
            className="mt-2 text-sm text-muted-foreground"
          >
            {'hint' in field
              ? field.hint
              : field.name === 'email'
                ? 'Pakai email aktifmu, ya.'
                : 'Nama yang bisa dihubungi panitia.'}
          </p>
          {errors[field.name] && (
            <p
              id={`checkout-${field.name}-error`}
              className="mt-2 text-sm font-semibold text-destructive"
            >
              {errors[field.name]}
            </p>
          )}
        </div>
      ))}
      <div>
        <label htmlFor="checkout-note" className="text-sm font-semibold">
          Catatan{' '}
          <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id="checkout-note"
          name="note"
          rows={3}
          maxLength={1000}
          value={customer.note}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? 'checkout-note-error' : undefined}
          className={INPUT_CLASS_NAME}
          onChange={(event) => onChange('note', event.target.value)}
          onBlur={() => onBlur('note')}
        />
        {errors.note && (
          <p
            id="checkout-note-error"
            className="mt-2 text-sm font-semibold text-destructive"
          >
            {errors.note}
          </p>
        )}
      </div>
    </fieldset>
  )
}
