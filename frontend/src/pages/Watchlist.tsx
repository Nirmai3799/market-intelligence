import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../api/client'
import type { WatchlistItem } from '../types'

export default function Watchlist() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [ticker, setTicker] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const fetchList = async () => {
    try {
      const res = await getWatchlist()
      setItems(res.data)
      setError('')
    } catch {
      setError('Could not load watchlist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const handleAdd = async () => {
    if (!ticker.trim()) return
    setAdding(true)
    setError('')
    try {
      await addToWatchlist(ticker.toUpperCase(), note || undefined)
      setTicker('')
      setNote('')
      await fetchList()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to add ticker.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await removeFromWatchlist(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('Failed to remove item.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-white text-2xl font-bold mb-6">Watchlist</h1>

        {/* Add form */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
          <p className="text-gray-400 text-sm font-medium mb-3">Add Ticker</p>
          <div className="flex gap-3 flex-wrap">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ticker (e.g. NVDA)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-32 text-sm"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional — e.g. earnings play)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 flex-1 text-sm min-w-48"
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

        {loading && <p className="text-gray-600 text-center py-12">Loading watchlist...</p>}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-gray-700">
            <p className="text-lg">Your watchlist is empty</p>
            <p className="text-sm mt-1">Add tickers you want to keep an eye on</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => {
              const isUp = (item.change_pct ?? 0) >= 0
              return (
                <div
                  key={item.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-700 transition"
                >
                  {/* Left: ticker + name + note */}
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{item.ticker}</span>
                        <span className="text-gray-500 text-sm truncate max-w-[160px]">{item.name}</span>
                      </div>
                      {item.note && (
                        <p className="text-gray-600 text-xs mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: price + change + actions */}
                  <div className="flex items-center gap-4">
                    {item.price != null ? (
                      <div className="text-right">
                        <p className="text-white font-semibold">${item.price}</p>
                        <p className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? '+' : ''}{item.change_pct?.toFixed(2)}%
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">—</p>
                    )}

                    <button
                      onClick={() => navigate(`/?ticker=${item.ticker}`)}
                      className="text-blue-500 hover:text-blue-400 text-xs border border-blue-900 hover:border-blue-700 px-3 py-1 rounded-lg transition"
                    >
                      Analyze
                    </button>

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-gray-700 hover:text-red-400 transition text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
