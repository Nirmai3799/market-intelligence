import type { Synthesis } from '../types'
import { currencySymbol, fmtMoney } from '../utils/currency'

interface Props {
  data: Synthesis
  currency?: string
}

const ZONE_STYLES: Record<string, { border: string; badge: string; score: string }> = {
  'Strong Buy': { border: 'border-green-500',  badge: 'bg-green-500/20 text-green-300 border border-green-500/40',  score: 'text-green-400' },
  'Buy':        { border: 'border-green-700',  badge: 'bg-green-700/20 text-green-400 border border-green-700/40',  score: 'text-green-400' },
  'Hold / Watch':{ border: 'border-yellow-600', badge: 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/40', score: 'text-yellow-400' },
  'Avoid / Exit':{ border: 'border-red-700',   badge: 'bg-red-700/20 text-red-400 border border-red-700/40',        score: 'text-red-400' },
  'Short':      { border: 'border-red-500',    badge: 'bg-red-500/20 text-red-300 border border-red-500/40',        score: 'text-red-400' },
}

function ScoreBar({ score }: { score: number }) {
  // score range roughly -15 to +15; map to 0–100%
  const pct = Math.min(100, Math.max(0, ((score + 15) / 30) * 100))
  const color = score >= 4 ? 'bg-green-500' : score >= -3 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Bearish</span>
        <span className="font-bold text-white">Score: {score > 0 ? '+' : ''}{score}</span>
        <span>Bullish</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
        {/* midpoint marker */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600" />
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function SynthesisCard({ data, currency }: Props) {
  const sym    = currencySymbol(currency)
  const styles = ZONE_STYLES[data.zone] ?? ZONE_STYLES['Hold / Watch']

  return (
    <div className={`bg-gray-900 rounded-2xl border-2 ${styles.border} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-base mb-1">Decision Synthesis</h3>
          <p className="text-gray-500 text-xs">Combined fundamental + technical score</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${styles.badge}`}>
          {data.zone}
        </span>
      </div>

      {/* Score bar */}
      <ScoreBar score={data.score} />

      {/* Action */}
      <div className="mt-4 bg-gray-800/60 rounded-xl px-4 py-3 border-l-2 border-blue-500">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Recommended action</p>
        <p className="text-white text-sm font-medium">{data.action}</p>
      </div>

      {/* Signals grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {data.bullish_signals.length > 0 && (
          <div>
            <p className="text-green-400 text-xs uppercase tracking-wider font-medium mb-2">Bullish signals</p>
            <ul className="space-y-1.5">
              {data.bullish_signals.map((s, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-2">
                  <span className="text-green-500 shrink-0 mt-0.5">▲</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.bearish_signals.length > 0 && (
          <div>
            <p className="text-red-400 text-xs uppercase tracking-wider font-medium mb-2">Bearish signals</p>
            <ul className="space-y-1.5">
              {data.bearish_signals.map((s, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-2">
                  <span className="text-red-500 shrink-0 mt-0.5">▼</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ATR levels */}
      {(data.stop_loss || data.target_2) && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-gray-600 text-xs mb-1">Stop-Loss</p>
            <p className="text-red-400 font-bold text-sm">{fmtMoney(data.stop_loss, currency)}</p>
            <p className="text-gray-600 text-xs">2× ATR</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-gray-600 text-xs mb-1">Target 1</p>
            <p className="text-yellow-400 font-bold text-sm">{fmtMoney(data.target_1, currency)}</p>
            <p className="text-gray-600 text-xs">1:1 R:R</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-gray-600 text-xs mb-1">Target 2</p>
            <p className="text-green-400 font-bold text-sm">{fmtMoney(data.target_2, currency)}</p>
            <p className="text-gray-600 text-xs">R:R = 1:{data.rr_ratio}</p>
          </div>
        </div>
      )}

      {/* Non-negotiable rules */}
      {data.rules.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-2">Non-negotiable rules</p>
          <div className="space-y-2">
            {data.rules.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`text-xs font-bold mt-0.5 shrink-0 ${r.pass ? 'text-green-400' : 'text-red-400'}`}>
                  {r.pass ? '✓' : '✗'}
                </span>
                <div>
                  <span className={`text-xs font-medium ${r.pass ? 'text-green-400' : 'text-red-400'}`}>{r.rule}</span>
                  <span className="text-gray-600 text-xs ml-2">— {r.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
