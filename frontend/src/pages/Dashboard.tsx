import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAnalysis, getAnalystData, getEconomicCal, getFundamentals } from '../api/client'
import PriceCard from '../components/PriceCard'
import AnalysisCard from '../components/AnalysisCard'
import NewsCard from '../components/NewsCard'
import TechnicalCard from '../components/TechnicalCard'
import MarketContextCard from '../components/MarketContextCard'
import AnalystCard from '../components/AnalystCard'
import FundamentalsCard from '../components/FundamentalsCard'
import ChartCard from '../components/ChartCard'
import ChatPanel from '../components/ChatPanel'
import type { PriceData, Analysis, NewsArticle, Technicals, MarketContext, AnalystData, Fundamentals } from '../types'

interface EconEvent {
  event: string
  date: string
  impact: string
  estimate: string | null
  previous: string | null
}

const EXCHANGES = [
  { code: 'AUTO', label: 'Any market',      suffix: '',    flag: '🌍' },
  { code: 'US',   label: 'US (NYSE/NASDAQ)',suffix: '',    flag: '🇺🇸' },
  { code: 'NSE',  label: 'India (NSE)',      suffix: '.NS', flag: '🇮🇳' },
  { code: 'BSE',  label: 'India (BSE)',      suffix: '.BO', flag: '🇮🇳' },
  { code: 'LSE',  label: 'UK (LSE)',         suffix: '.L',  flag: '🇬🇧' },
  { code: 'FRA',  label: 'Germany (Xetra)', suffix: '.DE', flag: '🇩🇪' },
  { code: 'TSE',  label: 'Japan (TSE)',      suffix: '.T',  flag: '🇯🇵' },
  { code: 'TSX',  label: 'Canada (TSX)',     suffix: '.TO', flag: '🇨🇦' },
  { code: 'ASX',  label: 'Australia (ASX)', suffix: '.AX', flag: '🇦🇺' },
  { code: 'HKEX', label: 'Hong Kong (HKEX)',suffix: '.HK', flag: '🇭🇰' },
  { code: 'SGX',  label: 'Singapore (SGX)', suffix: '.SI', flag: '🇸🇬' },
]

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const [input, setInput]               = useState('')
  const [exchange, setExchange]         = useState(EXCHANGES[0])
  const [ticker, setTicker]             = useState('')
  const [price, setPrice]               = useState<PriceData | null>(null)
  const [analysis, setAnalysis]         = useState<Analysis | null>(null)
  const [technicals, setTechnicals]     = useState<Technicals | null>(null)
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null)
  const [analystData, setAnalystData]       = useState<AnalystData | null>(null)
  const [fundamentals, setFundamentals]     = useState<Fundamentals | null>(null)
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false)
  const [fullContext, setFullContext]    = useState<object | null>(null)
  const [news, setNews]                 = useState<NewsArticle[]>([])
  const [econEvents, setEconEvents]     = useState<EconEvent[]>([])
  const [loading, setLoading]           = useState(false)
  const [analystLoading, setAnalystLoading] = useState(false)
  const [error, setError]               = useState('')

  // Support ?ticker=AAPL from Watchlist / Screener "Analyze" button
  useEffect(() => {
    const t = searchParams.get('ticker')
    if (t) { setInput(t); }
  }, [searchParams])

  // Load economic calendar once on mount
  useEffect(() => {
    getEconomicCal(14)
      .then((res) => setEconEvents(res.data.filter((e: EconEvent) => e.impact === 'high').slice(0, 5)))
      .catch(() => {})
  }, [])

  const handleAnalyze = async (tickerOverride?: string, exchangeOverride?: typeof EXCHANGES[0]) => {
    const raw = (tickerOverride ?? input).trim().toUpperCase()
    if (!raw) return
    const ex = exchangeOverride ?? exchange
    // Append suffix only if the ticker doesn't already have an exchange dot
    const t = (ex.suffix && !raw.includes('.')) ? raw + ex.suffix : raw

    setLoading(true)
    setAnalystLoading(true)
    setError('')
    setTicker(t)
    setPrice(null)
    setAnalysis(null)
    setTechnicals(null)
    setMarketContext(null)
    setAnalystData(null)
    setFundamentals(null)
    setFullContext(null)
    setNews([])

    getAnalysis(t)
      .then((res) => {
        const d = res.data
        setPrice(d.price ?? null)
        setAnalysis(d.analysis)
        setTechnicals(d.technicals ?? null)
        setMarketContext(d.market_context ?? null)
        setNews(d.news ?? [])
        setFullContext(d)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(msg || 'Failed to fetch data. Check the ticker symbol and try again.')
      })
      .finally(() => setLoading(false))

    getAnalystData(t)
      .then((res) => setAnalystData(res.data))
      .catch(() => setAnalystData(null))
      .finally(() => setAnalystLoading(false))

    setFundamentalsLoading(true)
    getFundamentals(t)
      .then((res) => setFundamentals(res.data))
      .catch(() => setFundamentals(null))
      .finally(() => setFundamentalsLoading(false))
  }

  const impactColor = (impact: string) =>
    impact === 'high' ? 'bg-red-900 text-red-300' : impact === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-800 text-gray-500'

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Economic calendar banner — high impact events this week */}
        {econEvents.length > 0 && (
          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex gap-3 flex-wrap items-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider shrink-0">Upcoming</span>
            {econEvents.map((e, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${impactColor(e.impact)}`}>
                  {e.date.slice(5)}
                </span>
                <span className="text-gray-400 text-xs">{e.event}</span>
              </span>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-2 mb-8">
          {/* Exchange / country selector */}
          <div className="relative">
            <select
              value={exchange.code}
              onChange={(e) => setExchange(EXCHANGES.find(x => x.code === e.target.value) ?? EXCHANGES[0])}
              className="appearance-none h-full bg-gray-900 border border-gray-700 rounded-xl pl-3 pr-7 py-3 text-white focus:outline-none focus:border-blue-500 transition text-sm cursor-pointer"
              title="Select stock exchange"
            >
              {EXCHANGES.map((ex) => (
                <option key={ex.code} value={ex.code}>
                  {ex.flag} {ex.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder={exchange.suffix ? `Ticker (e.g. RELIANCE, TCS, INFY)` : 'Ticker — AAPL, NVDA, SPY, TSLA...'}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-7 py-3 rounded-xl font-medium transition"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
        )}

        {loading && (
          <div className="text-center py-24 text-gray-600">
            <p className="text-lg text-gray-500">Fetching prices, technicals, market context, and asking Claude...</p>
            <p className="text-sm mt-1">This takes 5–15 seconds</p>
          </div>
        )}

        {!loading && analysis && (
          <div className="space-y-5">
            {/* Row 1: Price + AI Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {price && price.price && <PriceCard data={price} />}
              <AnalysisCard data={analysis} ticker={ticker} currency={price?.currency} />
            </div>

            {/* Row 2: Chart */}
            <ChartCard ticker={ticker} currency={price?.currency} />

            {/* Row 3: Technicals + Market Context */}
            {(technicals || marketContext) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {technicals && price && (
                  <TechnicalCard technicals={technicals} currentPrice={price.price} currency={price.currency} />
                )}
                {marketContext && <MarketContextCard context={marketContext} />}
              </div>
            )}

            {/* Row 4: Analyst Intelligence */}
            {analystLoading && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 text-center">
                <p className="text-gray-600 text-sm">Loading Wall St intelligence...</p>
              </div>
            )}
            {!analystLoading && analystData && price && (
              <AnalystCard data={analystData} currentPrice={price.price} ticker={ticker} />
            )}

            {/* Row 5: Fundamental Analysis */}
            {fundamentalsLoading && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 text-center">
                <p className="text-gray-600 text-sm">Loading fundamentals...</p>
              </div>
            )}
            {!fundamentalsLoading && fundamentals && <FundamentalsCard data={fundamentals} />}

            {/* Row 6: News */}
            {news.length > 0 && <NewsCard articles={news} />}

            {/* Row 6: AI Chat */}
            {fullContext && (
              <ChatPanel ticker={ticker} analysisContext={fullContext} />
            )}
          </div>
        )}

        {!loading && !analysis && !error && (
          <div className="text-center py-24">
            <p className="text-2xl text-gray-700 font-medium mb-2">Market Intelligence</p>
            <p className="text-gray-600 text-sm">Type a ticker to get live prices, chart, technicals, analyst data, and AI analysis</p>
            <div className="flex justify-center gap-3 mt-6">
              {['QQQ', 'AAPL', 'NVDA', 'SPY'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setInput(t); handleAnalyze(t) }}
                  className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-gray-800 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
