import { useState } from 'react'
import { summarizeYoutube, getMarketPulse } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoSummary {
  title: string
  channel: string
  url: string
  summary: string
  key_points: string[]
  tickers_mentioned: string[]
  tone: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed'
  confidence: number
  one_liner: string
  error?: string
}

interface PulseVideo {
  channel: string
  title: string
  url: string
  one_liner: string
  tone: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed'
}

interface MarketPulse {
  overall_sentiment: string
  sentiment_score: number
  market_summary: string
  key_themes: string[]
  videos: PulseVideo[]
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const YT_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500 shrink-0">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
  </svg>
)

function toneColor(tone: string) {
  if (tone === 'Bullish') return 'text-green-400'
  if (tone === 'Bearish') return 'text-red-400'
  if (tone === 'Mixed')   return 'text-yellow-400'
  return 'text-gray-400'
}

function toneBg(tone: string) {
  if (tone === 'Bullish') return 'bg-green-950 border-green-900 text-green-400'
  if (tone === 'Bearish') return 'bg-red-950 border-red-900 text-red-400'
  if (tone === 'Mixed')   return 'bg-yellow-950 border-yellow-900 text-yellow-400'
  return 'bg-gray-800 border-gray-700 text-gray-400'
}

function SentimentBar({ score }: { score: number }) {
  const clipped = Math.max(0, Math.min(100, score))
  const color = clipped >= 60 ? '#22c55e' : clipped <= 40 ? '#ef4444' : '#eab308'
  return (
    <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all"
        style={{ width: `${clipped}%`, background: `linear-gradient(to right, #ef4444, #eab308, #22c55e)` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-gray-900 shadow"
        style={{ left: `calc(${clipped}% - 6px)`, backgroundColor: color }}
      />
    </div>
  )
}

// ─── URL Summarizer Section ───────────────────────────────────────────────────

function UrlSummarizer() {
  const [url, setUrl]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<VideoSummary | null>(null)
  const [error, setError]         = useState('')

  const handleSummarize = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await summarizeYoutube(trimmed)
      setResult(res.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed. Make sure the video has English captions and is accessible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-1">
        {YT_ICON}
        <h2 className="text-white font-semibold text-lg">Video Analyzer</h2>
      </div>
      <p className="text-gray-600 text-sm mb-5">
        Paste any YouTube video — earnings calls, analyst interviews, macro commentary — and get an AI breakdown.
      </p>

      <div className="flex gap-3 mb-5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSummarize()}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm"
        />
        <button
          onClick={handleSummarize}
          disabled={loading || !url.trim()}
          className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-6 py-3 rounded-xl font-medium text-sm transition"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Fetching transcript and asking Claude...</p>
          <p className="text-gray-700 text-xs mt-1">Takes 10–20 seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="text-white font-semibold hover:text-blue-400 transition leading-snug block mb-0.5">
                {result.title}
              </a>
              <p className="text-gray-500 text-sm">{result.channel}</p>
            </div>
            <span className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium ${toneBg(result.tone)}`}>
              {result.tone}
            </span>
          </div>

          {/* One-liner */}
          <div className="bg-gray-800/60 rounded-xl px-4 py-3 border-l-2 border-red-500">
            <p className="text-gray-300 text-sm italic">"{result.one_liner}"</p>
          </div>

          {/* Summary */}
          <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>

          {/* Key Points */}
          {result.key_points?.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-2">Key Points</p>
              <ul className="space-y-1.5">
                {result.key_points.map((pt, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-red-600 shrink-0">•</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tickers + Confidence */}
          <div className="flex items-center gap-4 flex-wrap">
            {result.tickers_mentioned?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600 text-xs">Tickers:</span>
                {result.tickers_mentioned.map((t) => (
                  <span key={t} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">{t}</span>
                ))}
              </div>
            )}
            <span className="text-gray-600 text-xs ml-auto">
              AI confidence: <span className="text-white">{result.confidence}%</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Market Pulse Section ─────────────────────────────────────────────────────

function MarketPulseSection() {
  const [loading, setLoading]   = useState(false)
  const [pulse, setPulse]       = useState<MarketPulse | null>(null)
  const [error, setError]       = useState('')

  const handleLoad = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getMarketPulse()
      setPulse(res.data)
    } catch {
      setError('Failed to fetch market pulse. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {YT_ICON}
          <h2 className="text-white font-semibold text-lg">Market Pulse</h2>
        </div>
        <button
          onClick={handleLoad}
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-xl border border-gray-700 transition font-medium"
        >
          {loading ? 'Loading...' : pulse ? 'Refresh' : 'Load Pulse'}
        </button>
      </div>
      <p className="text-gray-600 text-sm mb-5">
        Latest videos from 6 top finance channels — analyzed and summarized into a collective market read.
        Takes ~30 seconds.
      </p>

      {loading && (
        <div className="text-center py-10">
          <p className="text-gray-500">Fetching latest videos from Patrick Boyle, Graham Stephan, Meet Kevin...</p>
          <p className="text-gray-700 text-xs mt-1">Searching YouTube + reading transcripts + asking Claude — this takes ~30 seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {!loading && pulse && (
        <div className="space-y-6">
          {/* Overall sentiment */}
          <div className="bg-gray-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className={`text-2xl font-bold ${toneColor(pulse.overall_sentiment)}`}>
                  {pulse.overall_sentiment}
                </span>
                <span className="text-gray-600 text-sm ml-2">Market Sentiment</span>
              </div>
              <span className="text-gray-400 text-sm font-medium">{pulse.sentiment_score}/100</span>
            </div>
            <SentimentBar score={pulse.sentiment_score} />
            <div className="flex justify-between text-gray-700 text-xs mt-1.5">
              <span>Extreme Fear</span>
              <span>Neutral</span>
              <span>Extreme Greed</span>
            </div>
          </div>

          {/* Summary */}
          <p className="text-gray-300 text-sm leading-relaxed">{pulse.market_summary}</p>

          {/* Key Themes */}
          {pulse.key_themes?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-600 text-xs self-center">Themes:</span>
              {pulse.key_themes.map((t, i) => (
                <span key={i} className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Per-channel cards */}
          <div className="space-y-3">
            <p className="text-gray-600 text-xs uppercase tracking-wider font-medium">What each creator is saying</p>
            {pulse.videos.map((v, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-800/50 rounded-xl p-4 border border-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-300 text-sm font-medium">{v.channel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${toneBg(v.tone)}`}>{v.tone}</span>
                  </div>
                  <a href={v.url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 text-xs hover:text-gray-400 transition line-clamp-1 block mb-1.5">
                    {v.title}
                  </a>
                  <p className="text-gray-400 text-sm">{v.one_liner}</p>
                </div>
                <a href={v.url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-gray-600 hover:text-red-500 transition mt-0.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !pulse && !error && (
        <div className="text-center py-10 text-gray-700">
          <p>Click "Load Pulse" to fetch and analyze the latest from top finance creators</p>
          <p className="text-xs mt-1">Patrick Boyle · Andrei Jikh · Graham Stephan · Meet Kevin · The Plain Bagel · Joseph Carlson</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Youtube() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">YouTube Intelligence</h1>
          <p className="text-gray-600 text-sm mt-1">
            Summarize any video or check what top finance creators are saying about the market
          </p>
        </div>

        <div className="space-y-6">
          <UrlSummarizer />
          <MarketPulseSection />
        </div>
      </div>
    </div>
  )
}
