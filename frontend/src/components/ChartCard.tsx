import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import { getChart } from '../api/client'
import { currencySymbol } from '../utils/currency'

interface CandlePoint {
  date: string
  close: number
  high: number
  low: number
  volume: number
  sma20: number | null
}

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y'  },
]

export default function ChartCard({ ticker, currency }: { ticker: string; currency?: string }) {
  const [data, setData]       = useState<CandlePoint[]>([])
  const [period, setPeriod]   = useState('3mo')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getChart(ticker, period)
      .then((res) => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [ticker, period])

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 h-64 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Loading chart...</p>
      </div>
    )
  }

  if (!data.length) return null

  const sym   = currencySymbol(currency)
  const first = data[0].close
  const last  = data[data.length - 1].close
  const isUp  = last >= first
  const lineColor = isUp ? '#22c55e' : '#ef4444'

  const minClose = Math.min(...data.map(d => d.low))
  const maxClose = Math.max(...data.map(d => d.high))
  const padding  = (maxClose - minClose) * 0.05

  const noDecimals = ['JPY', 'KRW', 'IDR'].includes(currency ?? '')

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Price Chart — {ticker}</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-2.5 py-1 rounded-lg transition ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            domain={[minClose - padding, maxClose + padding]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => sym + (noDecimals ? Math.round(v).toLocaleString() : v.toFixed(0))}
            width={54}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            itemStyle={{ color: '#f9fafb', fontSize: 12 }}
            formatter={(val: number) => [sym + (noDecimals ? Math.round(val).toLocaleString() : val.toFixed(2)), '']}
          />
          <Line
            dataKey="sma20"
            stroke="#3b82f6"
            strokeWidth={1}
            dot={false}
            strokeDasharray="4 2"
            name="SMA 20"
            connectNulls
          />
          <Line
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            name="Close"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-500 opacity-70" style={{ borderTop: '1px dashed #3b82f6' }} />
          <span className="text-gray-600 text-xs">SMA 20</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5" style={{ backgroundColor: lineColor }} />
          <span className="text-gray-600 text-xs">Close price</span>
        </div>
      </div>
    </div>
  )
}
