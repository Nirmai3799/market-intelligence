import { useState, useEffect } from 'react'
import { getAlerts, createAlert, deleteAlert, checkAlerts } from '../api/client'
import type { Alert } from '../types'

const CONDITIONS = [
  { value: 'price_above',      label: 'Price rises above $' },
  { value: 'price_below',      label: 'Price drops below $' },
  { value: 'change_pct_above', label: 'Daily change exceeds +%' },
  { value: 'change_pct_below', label: 'Daily change falls below -%' },
]

function fmt(alert: Alert) {
  const val = alert.condition.includes('pct')
    ? `${alert.threshold}%`
    : `$${alert.threshold}`
  const label = CONDITIONS.find((c) => c.value === alert.condition)?.label ?? alert.condition
  return { label, val }
}

function AlertRow({ alert, onDelete }: { alert: Alert; onDelete: (id: number) => void }) {
  const fired = !!alert.triggered_at
  const { label, val } = fmt(alert)

  return (
    <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition ${
      fired
        ? 'border-yellow-800/60 bg-yellow-950/20'
        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${
          fired ? 'bg-yellow-900/60 text-yellow-300' : 'bg-blue-950 text-blue-400'
        }`}>
          {alert.ticker}
        </span>
        <div className="min-w-0">
          <p className="text-gray-300 text-sm">
            {label} <span className="text-white font-semibold">{val}</span>
          </p>
          {fired && alert.triggered_at && (
            <p className="text-yellow-600 text-xs mt-0.5">
              Triggered {new Date(alert.triggered_at).toLocaleString()}
            </p>
          )}
          {!fired && (
            <p className="text-gray-700 text-xs mt-0.5">Watching · will notify when hit</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(alert.id)}
        className="shrink-0 ml-4 w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-950/30 transition text-lg leading-none"
        title="Delete alert"
      >
        ×
      </button>
    </div>
  )
}

function TriggeredBanner({ items }: { items: { message: string; ticker: string }[] }) {
  if (!items.length) return null
  return (
    <div className="mb-6 bg-yellow-950/30 border border-yellow-800/60 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <p className="text-yellow-300 font-semibold text-sm">
          {items.length} alert{items.length > 1 ? 's' : ''} just triggered
        </p>
      </div>
      {items.map((t, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-yellow-600 text-sm shrink-0">•</span>
          <p className="text-yellow-200 text-sm">{t.message}</p>
        </div>
      ))}
    </div>
  )
}

export default function Alerts() {
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [ticker, setTicker]       = useState('')
  const [condition, setCondition] = useState('price_below')
  const [threshold, setThreshold] = useState('')
  const [triggered, setTriggered] = useState<{ message: string; ticker: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [checking, setChecking]   = useState(false)
  const [adding, setAdding]       = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [error, setError]         = useState('')

  const fetchAlerts = async () => {
    try {
      const res = await getAlerts()
      setAlerts(res.data)
      return res.data as Alert[]
    } catch {
      setError('Could not load alerts.')
      return []
    } finally {
      setLoading(false)
    }
  }

  const runCheck = async (silent = false) => {
    if (!silent) setChecking(true)
    setTriggered([])
    try {
      const res = await checkAlerts()
      if (res.data.triggered?.length) {
        setTriggered(res.data.triggered)
      }
      setLastChecked(new Date())
      await fetchAlerts()
    } catch {
      if (!silent) setError('Check failed.')
    } finally {
      if (!silent) setChecking(false)
    }
  }

  // On page load: fetch alerts, then silently check prices
  useEffect(() => {
    fetchAlerts().then((loaded) => {
      const hasActive = loaded.some((a: Alert) => a.is_active)
      if (hasActive) runCheck(true)
    })
  }, [])

  const handleAdd = async () => {
    if (!ticker || !threshold) return
    setAdding(true)
    setError('')
    try {
      await createAlert(ticker.toUpperCase(), condition, parseFloat(threshold))
      setTicker('')
      setThreshold('')
      await fetchAlerts()
    } catch {
      setError('Failed to create alert.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      setError('Failed to delete alert.')
    }
  }

  const activeAlerts  = alerts.filter((a) => a.is_active)
  const pastAlerts    = alerts.filter((a) => !a.is_active)

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Price Alerts</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-600 text-xs">Auto-checked every 5 min while server runs</span>
              {lastChecked && (
                <span className="text-gray-700 text-xs">
                  · last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => runCheck(false)}
            disabled={checking || activeAlerts.length === 0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-sm font-medium border border-gray-700 transition"
          >
            {checking ? 'Checking...' : 'Check Now'}
          </button>
        </div>

        {/* Triggered banner */}
        <TriggeredBanner items={triggered} />

        {/* New alert form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-6">
          <p className="text-white text-sm font-medium mb-4">New Alert</p>
          <div className="flex gap-3 flex-wrap">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ticker (e.g. AAPL)"
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-32 text-sm"
            />
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={condition.includes('pct') ? 'e.g. 3' : 'e.g. 180'}
              type="number"
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-28 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !ticker || !threshold}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition"
            >
              {adding ? 'Adding...' : 'Add Alert'}
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-3">
            Example: NVDA · Price drops below · $800 → you get notified when NVDA falls under $800
          </p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {loading && <p className="text-gray-600 text-center py-12">Loading alerts...</p>}

        {/* Active alerts */}
        {!loading && activeAlerts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Watching</p>
              <span className="bg-blue-950 text-blue-400 text-xs px-2 py-0.5 rounded-full">{activeAlerts.length}</span>
            </div>
            <div className="space-y-2">
              {activeAlerts.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* Triggered history */}
        {!loading && pastAlerts.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-3">Triggered History</p>
            <div className="space-y-2">
              {pastAlerts.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="text-center py-20 text-gray-700">
            <p className="text-4xl mb-4">🔔</p>
            <p className="text-xl font-medium text-gray-600">No alerts yet</p>
            <p className="text-sm mt-2">
              Add one above — e.g. alert me when AAPL drops below $180
            </p>
          </div>
        )}

        {!loading && activeAlerts.length === 0 && alerts.length > 0 && (
          <div className="mt-6 text-center text-gray-700 text-sm">
            All alerts have triggered. Add new ones above.
          </div>
        )}
      </div>
    </div>
  )
}
