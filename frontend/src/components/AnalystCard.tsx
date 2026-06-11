import type { AnalystData } from '../types'

interface Props {
  data: AnalystData
  currentPrice: number
  ticker: string
}

// ── Analyst Ratings Bar ───────────────────────────────────────────────────────
function RatingsBar({ buy_pct, hold_pct, sell_pct, consensus, total }: {
  buy_pct: number; hold_pct: number; sell_pct: number; consensus: string; total: number
}) {
  const consensusColor =
    consensus === 'Strong Buy' ? 'text-green-400' :
    consensus === 'Buy'        ? 'text-green-300' :
    consensus === 'Sell'       ? 'text-red-400'   : 'text-yellow-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`text-base font-bold ${consensusColor}`}>{consensus}</span>
        <span className="text-gray-600 text-xs">{total} analysts</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-green-500 rounded-l-full" style={{ width: `${buy_pct}%` }} title={`Buy ${buy_pct}%`} />
        <div className="bg-yellow-500" style={{ width: `${hold_pct}%` }} title={`Hold ${hold_pct}%`} />
        <div className="bg-red-500 rounded-r-full" style={{ width: `${sell_pct}%` }} title={`Sell ${sell_pct}%`} />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span className="text-green-500">Buy {buy_pct}%</span>
        <span className="text-yellow-500">Hold {hold_pct}%</span>
        <span className="text-red-500">Sell {sell_pct}%</span>
      </div>
    </div>
  )
}

// ── Price Target Range ────────────────────────────────────────────────────────
function PriceTargetBar({ low, mean, high, current }: {
  low: number; mean: number; high: number; current: number
}) {
  const range = high - low
  const currentPct = range > 0 ? Math.min(100, Math.max(0, (current - low) / range * 100)) : 50
  const meanPct    = range > 0 ? Math.min(100, Math.max(0, (mean   - low) / range * 100)) : 50
  const upside = mean > 0 ? ((mean - current) / current * 100).toFixed(1) : null

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-400 text-sm font-medium">Price Target</span>
        {upside && (
          <span className={`text-xs font-semibold ${parseFloat(upside) > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {parseFloat(upside) > 0 ? '+' : ''}{upside}% to mean
          </span>
        )}
      </div>
      <div className="relative h-3 bg-gray-800 rounded-full">
        {/* Mean marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-400 opacity-80"
          style={{ left: `${meanPct}%` }}
          title={`Mean $${mean}`}
        />
        {/* Current price dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-gray-400 shadow"
          style={{ left: `calc(${currentPct}% - 6px)` }}
          title={`Current $${current}`}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Low ${low}</span>
        <span className="text-blue-400">Mean ${mean}</span>
        <span>High ${high}</span>
      </div>
    </div>
  )
}

// ── Earnings History ──────────────────────────────────────────────────────────
function EarningsRow({ period, actual_eps, estimated_eps, surprise_pct, beat }: {
  period: string; actual_eps: number | null; estimated_eps: number | null
  surprise_pct: number | null; beat: boolean | null
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-xs w-20">{period}</span>
      <span className="text-gray-400 text-xs">Est: {estimated_eps != null ? `$${estimated_eps}` : '—'}</span>
      <span className="text-white text-xs font-medium">Act: {actual_eps != null ? `$${actual_eps}` : '—'}</span>
      <span className={`text-xs font-semibold w-16 text-right ${
        beat === true ? 'text-green-400' : beat === false ? 'text-red-400' : 'text-gray-600'
      }`}>
        {beat === true ? `Beat ${surprise_pct != null ? `+${surprise_pct}%` : ''}` :
         beat === false ? `Miss ${surprise_pct != null ? `${surprise_pct}%` : ''}` : '—'}
      </span>
    </div>
  )
}

// ── Insider Transaction Row ───────────────────────────────────────────────────
function InsiderRow({ name, type, shares, value, date }: {
  name: string; type: string; shares: number; value: number | null; date: string
}) {
  const isBuy = type === 'Buy'
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isBuy ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
          {type}
        </span>
        <span className="text-gray-400 text-xs truncate max-w-[120px]">{name}</span>
      </div>
      <div className="text-right">
        <p className="text-white text-xs">{shares.toLocaleString()} shares</p>
        {value && <p className="text-gray-600 text-xs">${(value / 1000).toFixed(0)}K</p>}
      </div>
    </div>
  )
}

// ── Main Card ─────────────────────────────────────────────────────────────────
export default function AnalystCard({ data, currentPrice, ticker }: Props) {
  const { analyst_ratings: r, price_target: pt, earnings_history: eh,
          insider_transactions: it, short_interest: si } = data

  const hasRatings  = r && r.total_analysts > 0
  const hasTarget   = pt && pt.mean > 0
  const hasEarnings = eh && eh.length > 0
  const hasInsider  = it && it.length > 0
  const hasShort    = si && si.short_pct_float != null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-5">
      <h3 className="text-white font-semibold text-base">Wall St Intelligence — {ticker}</h3>

      {/* Analyst Ratings */}
      {hasRatings && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Analyst Consensus</p>
          <RatingsBar
            buy_pct={r.buy_pct} hold_pct={r.hold_pct} sell_pct={r.sell_pct}
            consensus={r.consensus} total={r.total_analysts}
          />
        </div>
      )}

      {/* Price Target */}
      {hasTarget && (
        <PriceTargetBar low={pt.low} mean={pt.mean} high={pt.high} current={currentPrice} />
      )}

      {/* Short Interest */}
      {hasShort && (
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Short Interest</p>
            <p className="text-white font-bold text-lg mt-0.5">{si.short_pct_float}%</p>
            <p className="text-gray-500 text-xs mt-0.5">{si.level}</p>
          </div>
          {si.short_ratio && (
            <div className="text-right">
              <p className="text-gray-500 text-xs">Days to cover</p>
              <p className="text-white font-bold text-lg">{si.short_ratio}</p>
            </div>
          )}
        </div>
      )}

      {/* Earnings History */}
      {hasEarnings && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Earnings History</p>
          {eh.map((e, i) => (
            <EarningsRow key={i} {...e} />
          ))}
        </div>
      )}

      {/* Insider Transactions */}
      {hasInsider && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Recent Insider Activity</p>
          {it.slice(0, 5).map((t, i) => (
            <InsiderRow key={i} {...t} />
          ))}
        </div>
      )}

      {!hasRatings && !hasTarget && !hasEarnings && !hasInsider && !hasShort && (
        <p className="text-gray-600 text-sm text-center py-4">No analyst data available for {ticker}</p>
      )}
    </div>
  )
}
