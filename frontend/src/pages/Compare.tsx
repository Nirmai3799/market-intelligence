import { useState } from 'react'
import { compareTickets } from '../api/client'

interface CompareRow {
  ticker: string
  name: string
  price: number
  change_pct: number
  market_cap: number
  rsi: number
  rsi_signal: string
  macd_signal: string
  ma_trend: string
  sma_50: number | null
  sma_200: number | null
  next_earnings: string | null
  week_52_high: number
  week_52_low: number
  error?: string
}

function Cell({ value, accent }: { value: string; accent?: string }) {
  return <td className={`text-right py-3 px-3 text-sm ${accent ?? 'text-gray-300'}`}>{value}</td>
}

export default function Compare() {
  const [input, setInput]     = useState('AAPL,MSFT,NVDA')
  const [rows, setRows]       = useState<CompareRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleCompare = async () => {
    setLoading(true)
    setError('')
    setRows([])
    try {
      const res = await compareTickets(input)
      setRows(res.data.tickers)
    } catch {
      setError('Failed to fetch comparison data.')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number | null | undefined, prefix = '') =>
    n != null ? `${prefix}${n.toLocaleString()}` : '—'

  const fmtMCap = (n: number | null | undefined) => {
    if (!n) return '—'
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
    return `$${(n / 1e6).toFixed(0)}M`
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-white text-2xl font-bold mb-6">Compare Stocks</h1>

        <div className="flex gap-3 mb-8">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            placeholder="Enter tickers separated by commas — AAPL,MSFT,NVDA"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={handleCompare}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-7 py-3 rounded-xl font-medium transition"
          >
            {loading ? 'Loading...' : 'Compare'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {loading && (
          <div className="text-center py-16">
            <p className="text-gray-500">Fetching data for all tickers...</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-600 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-2 px-3">Ticker</th>
                  <th className="text-right py-2 px-3">Price</th>
                  <th className="text-right py-2 px-3">Today</th>
                  <th className="text-right py-2 px-3">Mkt Cap</th>
                  <th className="text-right py-2 px-3">RSI</th>
                  <th className="text-right py-2 px-3">MACD</th>
                  <th className="text-right py-2 px-3">MA Trend</th>
                  <th className="text-right py-2 px-3">52W Range</th>
                  <th className="text-right py-2 px-3">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (r.error) {
                    return (
                      <tr key={r.ticker} className="border-b border-gray-800/50">
                        <td className="py-3 px-3 text-white font-bold">{r.ticker}</td>
                        <td colSpan={8} className="text-red-400 text-sm px-3">Failed to fetch</td>
                      </tr>
                    )
                  }

                  const isUp   = (r.change_pct ?? 0) >= 0
                  const rsiCol = r.rsi > 70 ? 'text-red-400' : r.rsi < 30 ? 'text-green-400' : 'text-gray-300'
                  const macdCol = r.macd_signal?.includes('Bullish') ? 'text-green-400' : 'text-red-400'
                  const trendCol = r.ma_trend?.startsWith('Bullish') ? 'text-green-400' : 'text-red-400'
                  const week52Pct = r.week_52_high && r.week_52_low
                    ? Math.round((r.price - r.week_52_low) / (r.week_52_high - r.week_52_low) * 100)
                    : null

                  return (
                    <tr key={r.ticker} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                      <td className="py-3 px-3">
                        <p className="text-white font-bold">{r.ticker}</p>
                        <p className="text-gray-600 text-xs truncate max-w-[120px]">{r.name}</p>
                      </td>
                      <Cell value={`$${r.price}`} />
                      <Cell
                        value={`${isUp ? '+' : ''}${r.change_pct?.toFixed(2)}%`}
                        accent={isUp ? 'text-green-400' : 'text-red-400'}
                      />
                      <Cell value={fmtMCap(r.market_cap)} />
                      <Cell value={String(r.rsi)} accent={rsiCol} />
                      <Cell value={r.macd_signal?.split(' ')[0] ?? '—'} accent={macdCol} />
                      <Cell value={r.ma_trend?.split('—')[0]?.trim() ?? '—'} accent={trendCol} />
                      <td className="text-right py-3 px-3 text-sm">
                        {week52Pct != null ? (
                          <div>
                            <div className="w-20 h-1.5 bg-gray-800 rounded-full ml-auto mb-1">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, week52Pct))}%` }}
                              />
                            </div>
                            <span className="text-gray-500 text-xs">{week52Pct}% of range</span>
                          </div>
                        ) : '—'}
                      </td>
                      <Cell value={r.next_earnings ?? '—'} accent="text-yellow-400" />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-16 text-gray-700">
            <p>Enter 2–6 tickers above separated by commas</p>
            <p className="text-sm mt-1">Example: AAPL,MSFT,NVDA,GOOGL</p>
          </div>
        )}
      </div>
    </div>
  )
}
