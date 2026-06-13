import type { Technicals } from '../types'
import { currencySymbol, fmtMoney } from '../utils/currency'

interface Props {
  technicals: Technicals
  currentPrice: number
  currency?: string
}

function RSIBar({ rsi }: { rsi: number }) {
  const pct   = Math.min(100, Math.max(0, rsi))
  const color = rsi > 70 ? 'bg-red-500' : rsi < 30 ? 'bg-green-500' : 'bg-blue-500'
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Oversold (30)</span>
        <span className="font-bold text-white">{rsi}</span>
        <span>Overbought (70)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StochBar({ k, d }: { k: number; d: number | null }) {
  const pct   = Math.min(100, Math.max(0, k))
  const color = k > 80 ? 'bg-red-500' : k < 20 ? 'bg-green-500' : 'bg-purple-500'
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Oversold (20)</span>
        <span className="font-bold text-white">%K {k} {d != null ? `/ %D ${d}` : ''}</span>
        <span>Overbought (80)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-600 text-xs uppercase tracking-wider font-medium mt-5 mb-2">{children}</p>
}

export default function TechnicalCard({ technicals: t, currentPrice, currency }: Props) {
  const sym        = currencySymbol(currency)
  const macdColor  = t.macd_histogram > 0 ? 'text-green-400' : 'text-red-400'
  const trendColor = t.ma_trend?.startsWith('Bullish') ? 'text-green-400' : 'text-red-400'
  const biasColor  = t.trend_bias === 'Bullish' ? 'text-green-400' : t.trend_bias === 'Bearish' ? 'text-red-400' : 'text-yellow-400'
  const obvColor   = t.obv_trend === 'Rising' ? 'text-green-400' : 'text-red-400'
  const volColor   = t.vol_trend_signal?.includes('Strong') ? 'text-green-400'
                   : t.vol_trend_signal?.includes('Distribution') || t.vol_trend_signal?.includes('suspect') ? 'text-red-400'
                   : 'text-gray-400'

  // Bollinger Band position
  const bbRange     = t.bollinger_upper - t.bollinger_lower
  const bbPct       = bbRange > 0 ? ((currentPrice - t.bollinger_lower) / bbRange) * 100 : 50
  const clampedPct  = Math.min(98, Math.max(2, bbPct))

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-white font-semibold text-base mb-4">Technical Indicators</h3>

      {/* RSI */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-sm font-medium">RSI (14)</span>
          <span className={`text-sm font-bold ${t.rsi > 70 ? 'text-red-400' : t.rsi < 30 ? 'text-green-400' : 'text-blue-400'}`}>{t.rsi_signal}</span>
        </div>
        <RSIBar rsi={t.rsi} />
      </div>

      {/* Stochastic */}
      {t.stoch_k != null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-sm font-medium">Stochastic (14,3)</span>
            <span className={`text-sm font-bold ${t.stoch_k > 80 ? 'text-red-400' : t.stoch_k < 20 ? 'text-green-400' : 'text-purple-400'}`}>{t.stoch_signal}</span>
          </div>
          <StochBar k={t.stoch_k} d={t.stoch_d} />
        </div>
      )}

      {/* Bollinger Bands */}
      <div className="mb-4">
        <p className="text-gray-400 text-sm font-medium mb-2">Bollinger Bands (20, 2σ)</p>
        <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 opacity-40 rounded-full" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-lg"
            style={{ left: `calc(${clampedPct}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{fmtMoney(t.bollinger_lower, currency)}</span>
          <span className="text-gray-500 text-xs">{t.bollinger_position}</span>
          <span>{fmtMoney(t.bollinger_upper, currency)}</span>
        </div>
      </div>

      {/* Momentum section */}
      <SectionLabel>Momentum</SectionLabel>
      <div>
        <Row label="MACD"           value={t.macd_signal}          accent={macdColor} />
        <Row label="MACD Histogram" value={String(t.macd_histogram)} accent={macdColor} />
        {t.roc != null && (
          <Row label="ROC (14-day)" value={`${t.roc > 0 ? '+' : ''}${t.roc}%`}
               accent={t.roc > 0 ? 'text-green-400' : 'text-red-400'} />
        )}
      </div>

      {/* Trend section */}
      <SectionLabel>Trend Structure</SectionLabel>
      <div>
        <Row label="Primary Trend"  value={t.trend_structure}                              accent={biasColor} />
        <Row label="MA Trend"       value={t.ma_trend?.split('—')[0]?.trim() ?? t.ma_trend} accent={trendColor} />
        {t.sma_50  && <Row label="50-Day MA"  value={`${sym}${t.sma_50}`}  />}
        {t.sma_200 && <Row label="200-Day MA" value={`${sym}${t.sma_200}`} />}
      </div>

      {/* Volume section */}
      <SectionLabel>Volume & Flow</SectionLabel>
      <div>
        <Row label="Volume Trend" value={t.vol_trend_signal ?? '—'} accent={volColor} />
        <Row label="5d/20d Vol Ratio" value={`${t.vol_ratio_5d}×`}
             accent={t.vol_ratio_5d > 1.1 ? 'text-green-400' : t.vol_ratio_5d < 0.9 ? 'text-red-400' : 'text-gray-400'} />
        <Row label="OBV Trend"    value={t.obv_trend ?? '—'}        accent={obvColor} />
      </div>

      {/* Volatility section */}
      <SectionLabel>Volatility</SectionLabel>
      <div>
        <Row label="ATR (14)"    value={`${sym}${t.atr} (${t.atr_pct}% of price)`} />
        <Row label="Fibonacci"   value={t.fib_context ?? '—'} accent="text-yellow-400" />
      </div>

      {/* Fibonacci levels */}
      {t.fib_levels && (
        <div className="mt-3">
          <p className="text-gray-600 text-xs uppercase tracking-wider font-medium mb-2">Fibonacci Levels (52-week)</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(t.fib_levels).map(([pct, level]) => (
              <div key={pct} className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
                <p className="text-gray-600 text-xs">{pct}%</p>
                <p className="text-white text-xs font-medium">{fmtMoney(level, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {t.next_earnings && (
        <>
          <SectionLabel>Events</SectionLabel>
          <Row label="Next Earnings" value={t.next_earnings} accent="text-yellow-400" />
        </>
      )}
    </div>
  )
}
