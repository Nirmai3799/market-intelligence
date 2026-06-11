export interface PriceData {
  ticker: string
  name: string
  price: number
  currency: string
  change: number
  change_pct: number
  previous_close: number
  day_high: number
  day_low: number
  volume: number
  avg_volume: number
  market_cap: number
  week_52_high: number
  week_52_low: number
  pre_market_price?: number | null
  pre_market_change_pct?: number | null
  post_market_price?: number | null
  post_market_change_pct?: number | null
}

export interface Analysis {
  sentiment: 'Bullish' | 'Neutral' | 'Bearish'
  confidence: number
  summary: string
  key_drivers: string[]
  technical_signals: string[]
  market_signals: string[]
  risk_level: 'Low' | 'Medium' | 'High'
  watch_levels: string[]
  one_liner: string
}

export interface Technicals {
  rsi: number
  rsi_signal: string
  macd_histogram: number
  macd_signal: string
  bollinger_upper: number
  bollinger_middle: number
  bollinger_lower: number
  bollinger_position: string
  sma_50: number | null
  sma_200: number | null
  ma_trend: string
  next_earnings: string | null
}

export interface MarketContext {
  vix: {
    value: number | null
    change_pct: number | null
    level: string
  }
  fear_and_greed: {
    score: number | null
    rating: string
  }
  sectors: Array<{
    etf: string
    sector: string
    change_pct: number
  }>
}

export interface NewsArticle {
  title: string
  source: string
  url: string
  published_at: string
  description: string
}

export interface Holding {
  id: number
  ticker: string
  shares: number
  avg_buy_price: number
  current_price: number
  cost_basis: number
  current_value: number
  gain_loss: number
  gain_loss_pct: number
  change_today_pct: number
  sector?: string | null
}

export interface Alert {
  id: number
  ticker: string
  condition: string
  threshold: number
  is_active: boolean
  triggered_at: string | null
  created_at: string
}

export interface AnalystData {
  analyst_ratings: {
    period: string
    buy: number
    hold: number
    sell: number
    total_analysts: number
    buy_pct: number
    hold_pct: number
    sell_pct: number
    consensus: string
  }
  price_target: {
    mean: number
    high: number
    low: number
    median: number
    last_updated: string
  }
  earnings_history: Array<{
    period: string
    actual_eps: number | null
    estimated_eps: number | null
    surprise_pct: number | null
    beat: boolean | null
  }>
  insider_transactions: Array<{
    name: string
    type: 'Buy' | 'Sell'
    shares: number
    price: number | null
    value: number | null
    date: string
  }>
  short_interest: {
    shares_short: number | null
    short_ratio: number | null
    short_pct_float: number | null
    level: string | null
  }
}

export interface WatchlistItem {
  id: number
  ticker: string
  note: string | null
  added_at: string
  price: number | null
  change: number | null
  change_pct: number | null
  name: string
}

export interface PortfolioSummary {
  holdings: Holding[]
  total_invested: number
  total_current_value: number
  total_gain_loss: number
  total_gain_loss_pct: number
}
