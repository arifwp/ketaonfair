import { z } from 'zod'

export const bookingBrowserSearchSchema = z.object({
  basemap: z
    .enum(['street', 'satellite'])
    .catch('satellite')
    .default('satellite'),
  q: z.string().max(80).catch('').default(''),
})

export type BookingBrowserSearch = z.infer<typeof bookingBrowserSearchSchema>
