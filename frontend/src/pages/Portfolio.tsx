import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { getPortfolioSummary, addHolding, removeHolding, getPortfolioAI } from '../api/client'
import PortfolioTable from '../components/PortfolioTable'
import { currencySymbol, fmtMoney } from '../utils/currency'
import type { PortfolioSummary, Holding } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIAnalysis {
  overall_health: string
  health_reason: string
  summary: string
  strengths: string[]
  risks: string[]
  recommendations: string[]
  diversification_score: number
  diversification_note: string
  one_liner: string
}

// ─── Chart colours ────────────────────────────────────────────────────────────

const SLICE_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ec4899', '#f97316', '#84cc16', '#a78bfa', '#22d3ee',
]

// ─── Tooltip components ───────────────────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: string } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-white font-medium">{d.name}</p>
      <p className="text-gray-400">${d.value.toLocaleString()}</p>
      <p className="text-blue-400">{d.payload.pct}% of portfolio</p>
    </div>
  )
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className={`font-medium ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {v >= 0 ? '+' : ''}{v.toFixed(2)}%
      </p>
    </div>
  )
}

// ─── Charts section ───────────────────────────────────────────────────────────

function PortfolioCharts({ holdings, totalValue }: { holdings: Holding[]; totalValue: number }) {
  if (holdings.length < 2) return null

  // Allocation data for donut
  const allocationData = holdings.map((h) => ({
    name: h.ticker,
    value: Math.round(h.current_value * 100) / 100,
    pct: ((h.current_value / totalValue) * 100).toFixed(1),
  }))

  // P&L data for bar chart
  const plData = holdings
    .map((h) => ({ ticker: h.ticker, pnl: h.gain_loss_pct }))
    .sort((a, b) => b.pnl - a.pnl)

  // Sector data
  const sectorMap: Record<string, number> = {}
  holdings.forEach((h) => {
    const s = h.sector || 'Other'
    sectorMap[s] = (sectorMap[s] || 0) + h.current_value
  })
  const sectorData = Object.entries(sectorMap)
    .map(([sector, value]) => ({ sector, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-5 mb-6">
      {/* Row 1: Donut + P&L bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Allocation donut */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="text-white font-semibold mb-1">Portfolio Allocation</h3>
          <p className="text-gray-600 text-xs mb-4">By current value</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationData.map((_, i) => (
                  <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {allocationData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                <span className="text-gray-400 text-xs">{d.name}</span>
                <span className="text-gray-600 text-xs">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gain / Loss bars */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="text-white font-semibold mb-1">Gain / Loss by Position</h3>
          <p className="text-gray-600 text-xs mb-4">Total return % since purchase</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={plData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="ticker"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={42}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {plData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Sector breakdown */}
      {sectorData.length > 1 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="text-white font-semibold mb-1">Sector Breakdown</h3>
          <p className="text-gray-600 text-xs mb-4">Portfolio value by sector</p>
          <div className="space-y-2.5">
            {sectorData.map((s) => {
              const pct = (s.value / totalValue) * 100
              return (
                <div key={s.sector}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{s.sector}</span>
                    <span className="text-gray-500">${s.value.toLocaleString()} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

function AISection({ holdings }: { holdings: Holding[] }) {
  const [analysis, setAnalysis]   = useState<AIAnalysis | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPortfolioAI()
      setAnalysis(res.data.analysis)
    } catch {
      setError('Failed to get AI analysis.')
    } finally {
      setLoading(false)
    }
  }

  if (!holdings.length) return null

  const healthColor = (h: string) =>
    h === 'Good' ? 'text-green-400' : h === 'Fair' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">AI Portfolio Analysis</h2>
        <button
          onClick={run}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition"
        >
          {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Analyze with Claude'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-500">Claude is reviewing your portfolio...</p>
        </div>
      )}

      {!loading && analysis && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xl font-bold ${healthColor(analysis.overall_health)}`}>
                  {analysis.overall_health}
                </span>
                <span className="text-gray-500 text-sm">Portfolio Health</span>
              </div>
              <p className="text-gray-400 text-sm">{analysis.health_reason}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-gray-600 text-xs mb-0.5">Diversification</p>
              <p className="text-white font-bold text-2xl">{analysis.diversification_score}<span className="text-gray-600 text-sm">/10</span></p>
              <p className="text-gray-600 text-xs">{analysis.diversification_note}</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl px-4 py-3 border-l-2 border-blue-500">
            <p className="text-gray-300 text-sm italic">"{analysis.one_liner}"</p>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-green-400 text-xs uppercase tracking-wider font-medium mb-2">Strengths</p>
              <ul className="space-y-1.5">
                {analysis.strengths?.map((s, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-green-600 shrink-0">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-red-400 text-xs uppercase tracking-wider font-medium mb-2">Risks</p>
              <ul className="space-y-1.5">
                {analysis.risks?.map((r, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-red-600 shrink-0">!</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-blue-400 text-xs uppercase tracking-wider font-medium mb-2">Recommendations</p>
            <ul className="space-y-1.5">
              {analysis.recommendations?.map((r, i) => (
                <li key={i} className="text-gray-400 text-sm flex gap-2">
                  <span className="text-blue-500 shrink-0">→</span>{r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [ticker, setTicker]   = useState('')
  const [shares, setShares]   = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [adding, setAdding]   = useState(false)

  const fetchSummary = async () => {
    try {
      const res = await getPortfolioSummary()
      setSummary(res.data)
      setError('')
    } catch {
      setError('Could not load portfolio. Make sure you are logged in.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSummary() }, [])

  const handleAdd = async () => {
    if (!ticker || !shares || !avgPrice) return
    setAdding(true)
    try {
      await addHolding(ticker.toUpperCase(), parseFloat(shares), parseFloat(avgPrice))
      setTicker('')
      setShares('')
      setAvgPrice('')
      await fetchSummary()
    } catch {
      setError('Failed to add holding.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await removeHolding(id)
      await fetchSummary()
    } catch {
      setError('Failed to remove holding.')
    }
  }

  const isUp = (summary?.total_gain_loss ?? 0) >= 0

  // Detect if holdings span multiple currencies
  const uniqueCurrencies = summary
    ? [...new Set(summary.holdings.map((h) => h.currency || 'USD'))]
    : ['USD']
  const isMixed = uniqueCurrencies.length > 1

  // Per-currency totals for mixed portfolios
  const currencyTotals = isMixed && summary
    ? uniqueCurrencies.map((cur) => {
        const group = summary.holdings.filter((h) => (h.currency || 'USD') === cur)
        const invested = group.reduce((s, h) => s + h.cost_basis, 0)
        const value = group.reduce((s, h) => s + h.current_value, 0)
        return { cur, sym: currencySymbol(cur), invested, value, gl: value - invested }
      })
    : null

  // Single-currency symbol for non-mixed portfolios
  const singleSym = isMixed ? '$' : currencySymbol(uniqueCurrencies[0])

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-white text-2xl font-bold mb-6">My Portfolio</h1>

        {/* Summary stat cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Total Invested</p>
              {isMixed && currencyTotals ? (
                <div className="space-y-0.5">
                  {currencyTotals.map((t) => (
                    <p key={t.cur} className="text-white text-base font-bold">{fmtMoney(t.invested, t.cur)}</p>
                  ))}
                </div>
              ) : (
                <p className="text-white text-xl font-bold">{fmtMoney(summary.total_invested, uniqueCurrencies[0])}</p>
              )}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Current Value</p>
              {isMixed && currencyTotals ? (
                <div className="space-y-0.5">
                  {currencyTotals.map((t) => (
                    <p key={t.cur} className="text-white text-base font-bold">{fmtMoney(t.value, t.cur)}</p>
                  ))}
                </div>
              ) : (
                <p className="text-white text-xl font-bold">{fmtMoney(summary.total_current_value, uniqueCurrencies[0])}</p>
              )}
            </div>
            <div className={`bg-gray-900 rounded-xl p-4 border ${isUp ? 'border-green-900' : 'border-red-900'}`}>
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Total P&L</p>
              {isMixed && currencyTotals ? (
                <div className="space-y-0.5">
                  {currencyTotals.map((t) => {
                    const up = t.gl >= 0
                    return (
                      <p key={t.cur} className={`text-base font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
                        {up ? '+' : '-'}{t.sym}{Math.abs(t.gl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <p className={`text-xl font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? '+' : '-'}{singleSym}{Math.abs(summary.total_gain_loss).toLocaleString()}
                </p>
              )}
            </div>
            <div className={`bg-gray-900 rounded-xl p-4 border ${isUp ? 'border-green-900' : 'border-red-900'}`}>
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Total Return</p>
              <p className={`text-xl font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{summary.total_gain_loss_pct.toFixed(2)}%
              </p>
              {isMixed && <p className="text-gray-600 text-xs mt-0.5">weighted avg</p>}
            </div>
          </div>
        )}

        {/* Charts — only shown when 2+ holdings */}
        {summary && summary.holdings.length >= 2 && (
          <PortfolioCharts
            holdings={summary.holdings}
            totalValue={summary.total_current_value}
          />
        )}

        {/* Add holding */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <p className="text-gray-400 text-sm font-medium mb-3">Add Holding</p>
          <div className="flex gap-3 flex-wrap">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ticker"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-28 text-sm"
            />
            <input
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="Shares"
              type="number"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-28 text-sm"
            />
            <input
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="Avg price ($)"
              type="number"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-36 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {loading && <p className="text-gray-600 text-center py-12">Loading portfolio...</p>}

        {!loading && summary && summary.holdings.length > 0 && (
          <PortfolioTable holdings={summary.holdings} onDelete={handleDelete} />
        )}

        {!loading && summary && summary.holdings.length === 0 && (
          <div className="text-center py-16 text-gray-700">
            <p className="text-xl">No holdings yet</p>
            <p className="text-sm mt-2">Add your first position above — e.g. AAPL, 10 shares at $180</p>
          </div>
        )}

        {/* AI Analysis */}
        {!loading && summary && <AISection holdings={summary.holdings} />}
      </div>
    </div>
  )
}
