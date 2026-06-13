const SYMBOLS: Record<string, string> = {
  USD: '$',  INR: '₹',  GBP: '£',  EUR: '€',
  JPY: '¥',  CNY: '¥',  CAD: 'C$', AUD: 'A$',
  HKD: 'HK$',SGD: 'S$', KRW: '₩', CHF: 'Fr',
  TWD: 'NT$',BRL: 'R$', SEK: 'kr', NOK: 'kr',
  DKK: 'kr', ZAR: 'R',  TRY: '₺',  MXN: '$',
}

export function currencySymbol(currency?: string): string {
  return SYMBOLS[currency ?? 'USD'] ?? '$'
}

const NO_DECIMALS = new Set(['JPY', 'KRW', 'IDR', 'VND', 'CLP'])

export function fmtMoney(value: number | undefined | null, currency?: string): string {
  if (value == null) return '—'
  const d = NO_DECIMALS.has(currency ?? '') ? 0 : 2
  return currencySymbol(currency) + value.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}
