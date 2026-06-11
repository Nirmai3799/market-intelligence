import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getPrice = (ticker: string) => api.get(`/prices/${ticker}`)
export const getNews = (ticker: string) => api.get(`/news/${ticker}`)
export const getSnapshot = (ticker: string) => api.get(`/snapshot/${ticker}`)
export const getAnalysis = (ticker: string) => api.get(`/analyze/${ticker}`)

export const loginUser = (email: string, password: string) =>
  api.post('/auth/login', { email, password })
export const registerUser = (email: string, password: string) =>
  api.post('/auth/register', { email, password })

export const getPortfolioSummary = () => api.get('/portfolio/summary')
export const addHolding = (ticker: string, shares: number, avg_buy_price: number) =>
  api.post('/portfolio/holdings', { ticker, shares, avg_buy_price })
export const removeHolding = (id: number) => api.delete(`/portfolio/holdings/${id}`)

export const getAnalystData    = (ticker: string) => api.get(`/analyst/${ticker}`)
export const getYoutube        = (ticker: string) => api.get(`/youtube/${ticker}?max_videos=3`)
export const summarizeYoutube  = (url: string) => api.post('/youtube/summarize', { url })
export const getMarketPulse    = () => api.get('/youtube/market-pulse')
export const getChart          = (ticker: string, period = '3mo') => api.get(`/chart/${ticker}?period=${period}`)
export const getEconomicCal    = (days = 14) => api.get(`/economic/calendar?days=${days}`)
export const runScreener       = (body: object) => api.post('/screener/scan', body)
export const compareTickets    = (tickers: string) => api.get(`/compare?tickers=${tickers}`)
export const sendChat          = (ticker: string, ctx: object, messages: object[]) =>
  api.post('/chat', { ticker, analysis_context: ctx, messages })
export const getPortfolioAI    = () => api.get('/portfolio/ai-analysis')

export const getWatchlist = () => api.get('/watchlist')
export const addToWatchlist = (ticker: string, note?: string) =>
  api.post('/watchlist', { ticker, note })
export const removeFromWatchlist = (id: number) => api.delete(`/watchlist/${id}`)

export const getAlerts = () => api.get('/alerts')
export const createAlert = (ticker: string, condition: string, threshold: number) =>
  api.post('/alerts', { ticker, condition, threshold })
export const deleteAlert = (id: number) => api.delete(`/alerts/${id}`)
export const checkAlerts = () => api.get('/alerts/check')
