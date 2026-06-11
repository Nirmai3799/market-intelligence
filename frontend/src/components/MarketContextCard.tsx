import type { MarketContext } from '../types'

interface Props {
  context: MarketContext
}

function SectorBar({ sector, change_pct }: { sector: string; change_pct: number }) {
  const isUp = change_pct >= 0
  const barWidth = Math.min(100, Math.abs(change_pct) * 10)
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-gray-400 text-xs w-28 flex-shrink-0">{sector}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-14 text-right ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{change_pct.toFixed(2)}%
      </span>
    </div>
  )
}

function FGMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  let color = 'bg-red-500'
  if (score > 75) color = 'bg-green-500'
  else if (score > 55) color = 'bg-green-400'
  else if (score > 45) color = 'bg-yellow-400'
  else if (score > 25) color = 'bg-orange-400'
  return (
    <div className="mt-1">
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Extreme Fear</span>
        <span>Extreme Greed</span>
      </div>
    </div>
  )
}

export default function MarketContextCard({ context: ctx }: Props) {
  const { vix, fear_and_greed: fg, sectors } = ctx

  const vixColor = (vix.value ?? 0) > 30 ? 'text-red-400' : (vix.value ?? 0) > 20 ? 'text-yellow-400' : 'text-green-400'
  const fgColor = (fg.score ?? 50) > 55 ? 'text-green-400' : (fg.score ?? 50) < 45 ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-white font-semibold text-base mb-4">Market Context</h3>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* VIX */}
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">VIX</p>
          <p className={`text-2xl font-bold ${vixColor}`}>
            {vix.value != null ? vix.value : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1 leading-snug">{vix.level}</p>
        </div>

        {/* Fear & Greed */}
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fear & Greed</p>
          <p className={`text-2xl font-bold ${fgColor}`}>
            {fg.score != null ? fg.score : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1 leading-snug">{fg.rating}</p>
        </div>
      </div>

      {/* Fear & Greed meter */}
      {fg.score != null && (
        <div className="mb-5">
          <FGMeter score={fg.score} />
        </div>
      )}

      {/* Sectors */}
      {sectors.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Sector Performance Today</p>
          {sectors.map((s) => (
            <SectorBar key={s.etf} sector={s.sector} change_pct={s.change_pct} />
          ))}
        </div>
      )}
    </div>
  )
}
