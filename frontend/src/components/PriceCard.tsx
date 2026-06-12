import type { PriceData } from '../types'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',   INR: '₹',  GBP: '£',  EUR: '€',
  JPY: '¥',   CNY: '¥',  CAD: 'C$', AUD: 'A$',
  HKD: 'HK$', SGD: 'S$', KRW: '₩',  CHF: 'Fr',
  TWD: 'NT$', BRL: 'R$', MXN: '$',  SEK: 'kr',
  NOK: 'kr',  DKK: 'kr', ZAR: 'R',  TRY: '₺',
}

function sym(currency: string | undefined) {
  return CURRENCY_SYMBOLS[currency ?? 'USD'] ?? (currency ? currency + ' ' : '$')
}

function fmtPrice(value: number | undefined | null, currency: string | undefined) {
  if (value == null) return '—'
  // JPY, KRW and similar integer currencies don't use decimals
  const decimals = ['JPY', 'KRW', 'IDR'].includes(currency ?? '') ? 0 : 2
  return sym(currency) + value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtCap(marketCap: number | undefined, currency: string | undefined) {
  if (!marketCap) return '—'
  const s = sym(currency)
  if (marketCap >= 1e12) return s + (marketCap / 1e12).toFixed(2) + 'T'
  if (marketCap >= 1e9)  return s + (marketCap / 1e9).toFixed(1)  + 'B'
  if (marketCap >= 1e6)  return s + (marketCap / 1e6).toFixed(1)  + 'M'
  return s + marketCap.toLocaleString()
}

function ExtendedHoursTag({ label, price, changePct, currency }: {
  label: string; price: number; changePct: number; currency?: string
}) {
  const up = changePct >= 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-300">{fmtPrice(price, currency)}</span>
      <span className={up ? 'text-green-400' : 'text-red-400'}>
        {up ? '+' : ''}{changePct.toFixed(2)}%
      </span>
    </div>
  )
}

export default function PriceCard({ data }: { data: PriceData }) {
  const isUp = (data.change_pct ?? 0) >= 0
  const hasPreMarket  = data.pre_market_price != null && data.pre_market_price > 0
  const hasPostMarket = data.post_market_price != null && data.post_market_price > 0
  const cur = data.currency

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider uppercase">{data.ticker}</p>
          <h2 className="text-white font-semibold">{data.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {cur && cur !== 'USD' && (
            <span className="text-gray-600 text-xs border border-gray-700 rounded px-1.5 py-0.5">{cur}</span>
          )}
          <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${isUp ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(data.change_pct ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      <p className="text-4xl font-bold text-white mb-1">
        {fmtPrice(data.price, cur)}
      </p>

      {/* Pre/post market prices */}
      {(hasPreMarket || hasPostMarket) && (
        <div className="flex gap-4 mb-3">
          {hasPreMarket && (
            <ExtendedHoursTag
              label="Pre-market"
              price={data.pre_market_price!}
              changePct={data.pre_market_change_pct ?? 0}
              currency={cur}
            />
          )}
          {hasPostMarket && (
            <ExtendedHoursTag
              label="After-hours"
              price={data.post_market_price!}
              changePct={data.post_market_change_pct ?? 0}
              currency={cur}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Day Range</p>
          <p className="text-gray-300">{fmtPrice(data.day_low, cur)} – {fmtPrice(data.day_high, cur)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Volume</p>
          <p className="text-gray-300">{data.volume ? (data.volume / 1_000_000).toFixed(1) + 'M' : '—'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">52-Week Range</p>
          <p className="text-gray-300">{fmtPrice(data.week_52_low, cur)} – {fmtPrice(data.week_52_high, cur)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Market Cap</p>
          <p className="text-gray-300">{fmtCap(data.market_cap, cur)}</p>
        </div>
      </div>
    </div>
  )
}
