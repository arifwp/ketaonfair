const idrNumberFormatter = new Intl.NumberFormat('id-ID')

export function formatPriceIdr(priceIdr: number) {
  return `Rp${idrNumberFormatter.format(priceIdr)}`
}
