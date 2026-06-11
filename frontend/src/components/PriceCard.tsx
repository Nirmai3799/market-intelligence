import type { PriceData } from '../types'

function ExtendedHoursTag({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up = changePct >= 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-300">${price.toFixed(2)}</span>
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

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider uppercase">{data.ticker}</p>
          <h2 className="text-white font-semibold">{data.name}</h2>
        </div>
        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${isUp ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(data.change_pct ?? 0).toFixed(2)}%
        </span>
      </div>

      <p className="text-4xl font-bold text-white mb-1">
        ${data.price?.toFixed(2)}
      </p>

      {/* Pre/post market prices */}
      {(hasPreMarket || hasPostMarket) && (
        <div className="flex gap-4 mb-3">
          {hasPreMarket && (
            <ExtendedHoursTag
              label="Pre-market"
              price={data.pre_market_price!}
              changePct={data.pre_market_change_pct ?? 0}
            />
          )}
          {hasPostMarket && (
            <ExtendedHoursTag
              label="After-hours"
              price={data.post_market_price!}
              changePct={data.post_market_change_pct ?? 0}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Day Range</p>
          <p className="text-gray-300">${data.day_low?.toFixed(2)} – ${data.day_high?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Volume</p>
          <p className="text-gray-300">{data.volume ? (data.volume / 1_000_000).toFixed(1) + 'M' : '—'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">52-Week Range</p>
          <p className="text-gray-300">${data.week_52_low?.toFixed(2)} – ${data.week_52_high?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs mb-0.5">Market Cap</p>
          <p className="text-gray-300">{data.market_cap ? '$' + (data.market_cap / 1_000_000_000).toFixed(1) + 'B' : '—'}</p>
        </div>
      </div>
    </div>
  )
}
