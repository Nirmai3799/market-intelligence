import type { Technicals } from '../types'
import { currencySymbol, fmtMoney } from '../utils/currency'

interface Props {
  technicals: Technicals
  currentPrice: number
  currency?: string
}

function RSIBar({ rsi }: { rsi: number }) {
  const pct = Math.min(100, Math.max(0, rsi))
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

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-medium ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

export default function TechnicalCard({ technicals: t, currentPrice, currency }: Props) {
  const sym = currencySymbol(currency)
  const macdColor = t.macd_histogram > 0 ? 'text-green-400' : 'text-red-400'
  const rsiColor = t.rsi > 70 ? 'text-red-400' : t.rsi < 30 ? 'text-green-400' : 'text-blue-400'
  const trendColor = t.ma_trend?.startsWith('Bullish') ? 'text-green-400' : 'text-red-400'

  // Bollinger Band position as a percentage for the price marker
  const bbRange = t.bollinger_upper - t.bollinger_lower
  const bbPct = bbRange > 0 ? ((currentPrice - t.bollinger_lower) / bbRange) * 100 : 50
  const clampedPct = Math.min(98, Math.max(2, bbPct))

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-white font-semibold text-base mb-4">Technical Indicators</h3>

      {/* RSI */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-sm font-medium">RSI (14)</span>
          <span className={`text-sm font-bold ${rsiColor}`}>{t.rsi_signal}</span>
        </div>
        <RSIBar rsi={t.rsi} />
      </div>

      {/* Bollinger Bands */}
      <div className="mb-5">
        <p className="text-gray-400 text-sm font-medium mb-2">Bollinger Bands (20, 2σ)</p>
        <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
          {/* The "band" fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 opacity-40 rounded-full" />
          {/* Price dot */}
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

      {/* Rows */}
      <div>
        <Row
          label="MACD"
          value={t.macd_signal}
          accent={macdColor}
        />
        <Row label="MACD Histogram" value={String(t.macd_histogram)} />
        <Row
          label="MA Trend"
          value={t.ma_trend?.split('—')[0]?.trim() ?? t.ma_trend}
          accent={trendColor}
        />
        {t.sma_50  && <Row label="50-Day MA"  value={`${sym}${t.sma_50}`}  />}
        {t.sma_200 && <Row label="200-Day MA" value={`${sym}${t.sma_200}`} />}
        {t.next_earnings && (
          <Row
            label="Next Earnings"
            value={t.next_earnings}
            accent="text-yellow-400"
          />
        )}
      </div>
    </div>
  )
}
