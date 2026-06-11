import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { runScreener } from '../api/client'

interface ScreenerResult {
  ticker: string
  name: string
  price: number
  change_pct: number
  rsi: number
  rsi_signal: string
  macd_signal: string
  above_200ma: boolean | null
}

const PRESETS = [
  {
    label: 'Oversold Dip Buys',
    desc: 'RSI < 35, still above 200-day MA (long-term uptrend + short-term pullback)',
    criteria: { rsi_max: 35, above_200ma: true },
  },
  {
    label: 'Momentum Breakouts',
    desc: 'Bullish MACD, above 200-day MA (trend following)',
    criteria: { macd_signal: 'bullish', above_200ma: true },
  },
  {
    label: 'Oversold Anywhere',
    desc: 'RSI < 30 (extreme oversold — potential bounce candidates)',
    criteria: { rsi_max: 30 },
  },
  {
    label: 'Overbought Shorts',
    desc: 'RSI > 70 (extended — watch for pullback or reversal)',
    criteria: { rsi_min: 70 },
  },
  {
    label: "Today's Big Movers",
    desc: 'Up more than 2% today',
    criteria: { change_min: 2 },
  },
]

export default function Screener() {
  const navigate = useNavigate()
  const [results, setResults] = useState<ScreenerResult[]>([])
  const [scanned, setScanned] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [mode, setMode] = useState<'universe' | 'watchlist'>('universe')
  const [error, setError] = useState('')

  const runScan = async (criteria: object, presetLabel: string) => {
    setLoading(true)
    setError('')
    setActivePreset(presetLabel)
    setResults([])
    try {
      const res = await runScreener({ ...criteria, mode })
      setResults(res.data.results)
      setScanned(res.data.scanned)
    } catch {
      setError('Scan failed. Make sure you are logged in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Stock Screener</h1>
            <p className="text-gray-600 text-sm mt-1">Filter the market by technical conditions</p>
          </div>
          <div className="flex gap-2">
            {(['universe', 'watchlist'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-sm px-4 py-2 rounded-xl border transition ${
                  mode === m
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {m === 'universe' ? '40 Major Stocks' : 'My Watchlist'}
              </button>
            ))}
          </div>
        </div>

        {/* Preset scans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => runScan(p.criteria, p.label)}
              disabled={loading}
              className={`text-left p-4 rounded-xl border transition ${
                activePreset === p.label
                  ? 'border-blue-600 bg-blue-950/30'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-600'
              } disabled:opacity-50`}
            >
              <p className="text-white text-sm font-medium">{p.label}</p>
              <p className="text-gray-600 text-xs mt-1 leading-snug">{p.desc}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {loading && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Scanning {mode === 'universe' ? '40 tickers' : 'watchlist'}...</p>
            <p className="text-gray-700 text-sm mt-1">Fetching live technicals for each — takes ~15 seconds</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-gray-600 text-sm mb-3">
              {results.length} match{results.length !== 1 ? 'es' : ''} out of {scanned} scanned
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-600 text-xs uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left pb-2 pr-4">Ticker</th>
                    <th className="text-right pb-2 pr-4">Price</th>
                    <th className="text-right pb-2 pr-4">Today</th>
                    <th className="text-right pb-2 pr-4">RSI</th>
                    <th className="text-left pb-2 pr-4">MACD</th>
                    <th className="text-left pb-2">vs 200MA</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const isUp = r.change_pct >= 0
                    const rsiColor = r.rsi > 70 ? 'text-red-400' : r.rsi < 30 ? 'text-green-400' : 'text-gray-300'
                    return (
                      <tr key={r.ticker} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                        <td className="py-3 pr-4">
                          <div>
                            <span className="text-white font-semibold">{r.ticker}</span>
                            <p className="text-gray-600 text-xs truncate max-w-[140px]">{r.name}</p>
                          </div>
                        </td>
                        <td className="text-right pr-4 text-white">${r.price}</td>
                        <td className={`text-right pr-4 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? '+' : ''}{r.change_pct?.toFixed(2)}%
                        </td>
                        <td className={`text-right pr-4 font-medium ${rsiColor}`}>{r.rsi}</td>
                        <td className={`pr-4 ${r.macd_signal?.includes('Bullish') ? 'text-green-400' : 'text-red-400'}`}>
                          {r.macd_signal?.split(' ')[0]}
                        </td>
                        <td>
                          {r.above_200ma === true  && <span className="text-green-400">Above</span>}
                          {r.above_200ma === false && <span className="text-red-400">Below</span>}
                          {r.above_200ma === null  && <span className="text-gray-600">—</span>}
                        </td>
                        <td className="pl-4">
                          <button
                            onClick={() => navigate(`/?ticker=${r.ticker}`)}
                            className="text-xs text-blue-500 hover:text-blue-400 border border-blue-900 hover:border-blue-700 px-2.5 py-1 rounded-lg transition"
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && results.length === 0 && activePreset && (
          <div className="text-center py-16 text-gray-700">
            <p className="text-lg">No matches found</p>
            <p className="text-sm mt-1">Try a different preset or switch to a broader scan universe</p>
          </div>
        )}
      </div>
    </div>
  )
}
