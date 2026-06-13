import type { Analysis } from '../types'
import { currencySymbol } from '../utils/currency'

const sentimentStyle = {
  Bullish: 'text-green-400',
  Neutral: 'text-yellow-400',
  Bearish: 'text-red-400',
}

const riskStyle = {
  Low: 'bg-green-950 text-green-400',
  Medium: 'bg-yellow-950 text-yellow-400',
  High: 'bg-red-950 text-red-400',
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-gray-300 text-xs flex gap-1.5">
          <span className={`${color} mt-0.5 shrink-0`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AnalysisCard({ data, ticker, currency }: { data: Analysis; ticker: string; currency?: string }) {
  const sym = currencySymbol(currency)
  // Claude always writes $ in watch levels — replace with actual currency symbol
  const watchLevels = data.watch_levels?.map(l => sym !== '$' ? l.replace(/\$/g, sym) : l)
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-xs font-medium tracking-wider uppercase">AI Analysis — {ticker}</p>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-lg ${sentimentStyle[data.sentiment]}`}>{data.sentiment}</span>
          <span className="text-gray-500 text-sm">{data.confidence}% confidence</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-gray-300 text-sm leading-relaxed mb-4">{data.summary}</p>

      {/* One-liner callout */}
      <div className="bg-gray-800 rounded-lg px-4 py-3 mb-5 border-l-2 border-blue-500">
        <p className="text-white text-sm">{data.one_liner}</p>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Key Drivers</p>
          <BulletList items={data.key_drivers} color="text-blue-400" />
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Technical Signals</p>
          <BulletList items={data.technical_signals} color="text-purple-400" />
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Market Signals</p>
          <BulletList items={data.market_signals} color="text-yellow-400" />
        </div>
      </div>

      {/* Risk + watch levels */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs px-2.5 py-1 rounded-full ${riskStyle[data.risk_level]}`}>
          Risk: {data.risk_level}
        </span>
        {watchLevels?.map((level, i) => (
          <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
            {level}
          </span>
        ))}
      </div>
    </div>
  )
}
