# Market Intelligence

An AI-powered market research platform. Type a ticker, get live prices, technical indicators, analyst consensus, macro context, and a plain-English AI verdict — all in under 15 seconds. Ask follow-up questions, scan the market for setups, compare stocks side-by-side, track your portfolio, and analyze YouTube videos for market sentiment.

---

## Architecture

```
Browser (React + TypeScript)  localhost:5173
          │
          │  HTTP / JSON (axios)
          │
FastAPI Backend (Python)       localhost:8000
          │
    ┌─────┼─────────────────────┐
    │     │                     │
Supabase  Upstash           External APIs
(PostgreSQL)  (Redis)       ┌─ Finnhub  (real-time prices, analyst data)
                            ├─ yfinance (52W range, technicals, market cap)
                            ├─ Anthropic Claude Haiku  (AI analysis + chat)
                            ├─ NewsAPI + Yahoo RSS  (latest headlines)
                            ├─ yt-dlp + youtube-transcript-api  (YouTube)
                            └─ CNN Fear & Greed  (market sentiment)
```

**Frontend** — React 19 + TypeScript + Tailwind CSS + Vite. All UI, charts, and user interaction.  
**Backend** — FastAPI (Python). All data fetching, business logic, AI calls, and auth.  
**Supabase** — Managed PostgreSQL in the cloud. Stores users, portfolio, watchlist, alerts.  
**Upstash** — Managed Redis in the cloud. Caches expensive API calls to avoid redundant fetches.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| HTTP client | Axios |
| Routing | React Router v7 |
| Build tool | Vite 8 |
| Backend framework | FastAPI |
| Language | Python 3.12 |
| ORM | SQLAlchemy |
| Database | PostgreSQL (Supabase cloud) |
| Cache | Redis (Upstash cloud) |
| Auth | JWT (HS256, 7-day expiry) + bcrypt |
| AI model | Claude Haiku (`claude-haiku-4-5-20251001`) |
| Real-time prices | Finnhub API |
| Market data | yfinance |
| News | NewsAPI + Yahoo Finance RSS |
| YouTube | yt-dlp + youtube-transcript-api v1.x |

---

## Features

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Main analysis view — price, chart, technicals, market context, analyst data, news, AI chat |
| Portfolio | `/portfolio` | Holdings tracker with P&L and AI portfolio health analysis |
| Watchlist | `/watchlist` | Saved tickers with live prices |
| Alerts | `/alerts` | Price and % move alerts that trigger automatically |
| Screener | `/screener` | Technical scanner across 40 major stocks |
| Compare | `/compare` | Side-by-side multi-ticker comparison table |
| YouTube | `/youtube` | Video analyzer (paste any URL) + Market Pulse from top finance channels |

---

## How to Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- A `.env` file in the project root (see below)

### 1 — Clone and set up environment variables

Create a `.env` file in `market-intelligence/` (the project root):

```env
DATABASE_URL="postgresql://postgres:yourpassword@db.yourproject.supabase.co:5432/postgres"
REDIS_URL="rediss://default:yourtoken@your-upstash-host.upstash.io:6379"
ANTHROPIC_API_KEY="sk-ant-api03-..."
NEWSAPI_KEY="your_newsapi_key"
FINNHUB_API_KEY="your_finnhub_key"
JWT_SECRET="any-long-random-string-change-this"
APP_ENV="development"
APP_PORT=8000
```

> **Never commit `.env` to git.** It contains all your API keys and database credentials.

### 2 — Set up the backend

```bash
cd market-intelligence

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create database tables
cd backend
python setup_db.py
cd ..
```

### 3 — Start the backend server

```bash
cd backend
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

### 4 — Set up and start the frontend

Open a second terminal:

```bash
cd market-intelligence/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 5 — Open the app

Go to `http://localhost:5173` in your browser. Register an account, then search any ticker.

---

## Project Structure

```
market-intelligence/
├── .env                          # Secrets — never commit
├── requirements.txt              # Python dependencies
├── backend/
│   ├── setup_db.py               # Creates all DB tables
│   └── app/
│       ├── main.py               # FastAPI app entry point, all routers registered
│       ├── core/
│       │   └── config.py         # Reads .env into settings object
│       ├── models/               # SQLAlchemy ORM table definitions
│       │   ├── user.py
│       │   ├── holding.py
│       │   ├── watchlist.py
│       │   └── alert.py
│       ├── api/                  # HTTP route handlers (thin layer)
│       │   ├── analysis.py       # GET /analyze/{ticker}
│       │   ├── analyst.py        # GET /analyst/{ticker}
│       │   ├── auth.py           # POST /auth/login, /auth/register
│       │   ├── alerts.py         # CRUD /alerts
│       │   ├── chart.py          # GET /chart/{ticker}
│       │   ├── chat.py           # POST /chat
│       │   ├── compare.py        # GET /compare
│       │   ├── economic.py       # GET /economic/calendar
│       │   ├── market.py         # GET /market/context
│       │   ├── news.py           # GET /news/{ticker}
│       │   ├── portfolio.py      # CRUD /portfolio + AI analysis
│       │   ├── prices.py         # GET /prices/{ticker}
│       │   ├── screener.py       # POST /screener/scan
│       │   ├── snapshot.py       # GET /snapshot/{ticker}
│       │   ├── technicals.py     # GET /technicals/{ticker}
│       │   ├── watchlist.py      # CRUD /watchlist
│       │   └── youtube.py        # GET /youtube/{ticker}, POST /youtube/summarize, GET /youtube/market-pulse
│       └── services/             # All business logic lives here
│           ├── ai_engine.py
│           ├── alert_service.py
│           ├── analyst_data.py
│           ├── auth_service.py
│           ├── chart_service.py
│           ├── chat_service.py
│           ├── economic_calendar.py
│           ├── market_context.py
│           ├── market_data.py
│           ├── news_service.py
│           ├── portfolio_ai.py
│           ├── portfolio_service.py
│           ├── screener_service.py
│           ├── snapshot_service.py
│           ├── technical_analysis.py
│           ├── watchlist_service.py
│           └── youtube_service.py
└── frontend/
    └── src/
        ├── api/
        │   └── client.ts         # All API calls in one place
        ├── components/           # Reusable UI blocks
        ├── pages/                # Full-page views
        └── types.ts              # TypeScript interfaces
```

---

## Backend Services — What Each One Does

### `market_data.py`
Fetches live price data for a ticker by combining two sources in parallel.

- **Finnhub `/quote`** — real-time price, today's change %, day high/low. Updates every few seconds during market hours.
- **yfinance** — fills in what Finnhub doesn't have: 52-week high/low, market cap, company name, pre-market and after-hours prices.

Returns everything merged into one object. If Finnhub fails, falls back to yfinance alone.

---

### `technical_analysis.py`
Downloads 6 months of daily price history via yfinance and computes all technical indicators using pure pandas math (no external TA libraries).

| Indicator | What it measures | Signal |
|---|---|---|
| RSI (14-day) | Momentum — how fast price is moving | >70 overbought, <30 oversold |
| MACD (12/26/9) | Trend direction — fast vs slow EMA crossover | Above zero = bullish momentum |
| Bollinger Bands (20-day, 2σ) | Price extremes vs recent average | Near upper band = stretched, near lower = compressed |
| SMA 50 / SMA 200 | Long-term trend | 50 above 200 = Golden Cross (bullish) |
| Next earnings date | When next volatility event is | Pulled from yfinance calendar |

---

### `market_context.py`
Fetches the macro backdrop — what the overall market environment looks like before you even analyze a stock.

- **VIX (`^VIX` via yfinance)** — the "fear index." Below 15 = calm, 20–30 = anxious, above 30 = panic. A high VIX drags all stocks down regardless of individual fundamentals.
- **Fear & Greed Index (CNN)** — composite of 7 market signals into a 0–100 score. Contrarian signal: buy extreme fear, be cautious in extreme greed.
- **10 sector ETFs** (XLK, XLF, XLE, XLV, XLI, XLY, XLP, XLU, XLRE, XLB) — shows which sectors are winning and losing today. Tells you if your stock is being dragged by its sector.

---

### `snapshot_service.py`
The orchestrator. Runs four data fetches simultaneously using Python's `ThreadPoolExecutor` so total wait time is the slowest single call, not the sum of all calls.

```
Thread 1: get_ticker_data()     → live price
Thread 2: get_ticker_news()     → latest headlines
Thread 3: get_technicals()      → RSI, MACD, Bollinger Bands, MAs
Thread 4: get_market_context()  → VIX, Fear & Greed, sectors

All four run at the same time → results merged → passed to AI engine
```

---

### `ai_engine.py`
Assembles all collected data into a structured prompt and sends it to Claude Haiku. The prompt includes: current price and change, all technical indicator readings with their signals, VIX level and Fear & Greed score, top sector performance, and the 5 latest news headlines.

Claude returns structured JSON with:
- `sentiment` — Bullish / Neutral / Bearish
- `confidence` — 0–100%
- `summary` — 2–3 sentence plain-English read
- `key_drivers` — why the stock is moving
- `technical_signals` — what the charts say
- `market_signals` — how the macro affects this stock
- `risk_level` — Low / Medium / High
- `watch_levels` — support and resistance prices to monitor
- `one_liner` — one punchy summary sentence

---

### `analyst_data.py`
Pulls 5 types of professional Wall Street intelligence from Finnhub, all in parallel.

| Data | Source | What it tells you |
|---|---|---|
| Analyst ratings | Finnhub `/stock/recommendation` | How many analysts say Buy / Hold / Sell right now |
| Price targets | Finnhub `/stock/price-target` | Mean, high, low 12-month price targets; upside % vs current |
| Earnings history | Finnhub `/stock/earnings` | Last 4 quarters — did they beat or miss EPS estimates |
| Insider transactions | Finnhub `/stock/insider-transactions` | Form 4 filings — executives buying or selling their own stock |
| Short interest | yfinance | % of float being bet against; high = potential short squeeze risk |

---

### `chart_service.py`
Fetches daily OHLCV (Open, High, Low, Close, Volume) price history and pre-computes the 20-day simple moving average server-side. Returns clean data ready for the frontend chart.

Available periods: 1 month, 3 months, 6 months, 1 year.

---

### `news_service.py`
Fetches the latest news for a ticker from two sources and deduplicates:
- **NewsAPI** — broad coverage, includes financial news outlets
- **Yahoo Finance RSS** — direct financial news feed

Returns the 5 most recent, deduplicated by title.

---

### `market_context.py` (economic calendar part)
Actually handled by `economic_calendar.py` — fetches US economic events for the next 14 days from Finnhub's calendar endpoint. Filters to US-only events, promotes Fed meetings, CPI releases, and NFP (jobs report) to high impact. Shown as a banner at the top of the Dashboard.

---

### `chat_service.py`
Powers the "Ask the Analyst" chat panel on the Dashboard. Takes the full analysis context (price, technicals, market context, analyst data, news) already loaded for the current ticker and maintains a conversation with Claude Haiku.

Because the full data context is injected into every message, Claude answers questions like "Why is RSI low?" with reference to the actual numbers — not a generic answer. The conversation history is preserved within the session.

---

### `portfolio_service.py`
Handles CRUD operations for the portfolio. Fetches live current prices for all holdings via yfinance and computes per-position P&L:

```
cost_basis       = shares × avg_buy_price
current_value    = shares × current_price
gain_loss        = current_value − cost_basis
gain_loss_pct    = (gain_loss / cost_basis) × 100
```

Aggregates to portfolio totals.

---

### `portfolio_ai.py`
Takes all holdings, builds a detailed text description (each ticker's weight in portfolio, P&L, sector), and sends to Claude Haiku for a holistic portfolio review.

Returns:
- `overall_health` — Good / Fair / Poor
- `diversification_score` — 1–10
- `strengths`, `risks`, `recommendations`
- `one_liner` — one sentence TL;DR

---

### `screener_service.py`
Scans a universe of 40 major stocks and ETFs (or your personal watchlist) against technical criteria using 8 parallel threads.

Available filter criteria:
- `rsi_max` / `rsi_min` — find oversold or overbought stocks
- `macd_signal` — `"bullish"` or `"bearish"`
- `above_200ma` / `below_200ma` — long-term trend filter
- `change_min` / `change_max` — today's price move %

Five preset scans are built into the UI: Oversold Dip Buys, Momentum Breakouts, Oversold Anywhere, Overbought Shorts, Today's Big Movers.

---

### `alert_service.py`
Checks all active alerts against current live prices. Fetches all unique tickers in parallel, evaluates each alert condition, and marks alerts as triggered (sets `is_active=False`, records `triggered_at`) when conditions are met.

Alert conditions: `price_above`, `price_below`, `change_pct_above`, `change_pct_below`.

---

### `watchlist_service.py`
Stores tickers the user wants to monitor without owning. Fetches live prices for all watchlist tickers in parallel when the page loads. Prevents duplicate tickers per user.

---

### `auth_service.py`
Handles user registration and login.

- **Registration** — hashes password with bcrypt, stores in `users` table
- **Login** — verifies password against stored hash, issues a JWT token (7-day expiry)
- **Protected routes** — FastAPI dependency reads the `Authorization: Bearer <token>` header, decodes the JWT, and injects the current user into the route handler

---

### `youtube_service.py`
Three distinct capabilities:

**1 — Per-ticker search** (`get_youtube_insights`)  
Searches YouTube for `"{ticker} stock analysis"` using yt-dlp, fetches English transcripts via youtube-transcript-api, returns title, channel, URL, and transcript excerpt for up to 3 videos.

**2 — Video URL analyzer** (`summarize_video`)  
Takes any YouTube URL, extracts the video ID, fetches the full transcript (up to 4,000 characters), and sends to Claude Haiku for a structured breakdown: summary, 5 key points, tickers mentioned, tone (Bullish/Bearish/Neutral/Mixed), confidence %, and one-liner verdict.

**3 — Market Pulse** (`get_market_pulse`)  
Fetches the latest video from 6 curated finance channels in parallel (Patrick Boyle, Andrei Jikh, Graham Stephan, Meet Kevin, The Plain Bagel, Joseph Carlson), sends all transcripts to Claude in one batch, and returns: overall market sentiment score (0–100), market summary, shared themes, and per-creator one-liners.

---

## Frontend Components

### Pages

| Page | What it does |
|---|---|
| `Dashboard.tsx` | Search bar, economic calendar banner, all analysis cards rendered in sequence as parallel API calls complete |
| `Portfolio.tsx` | Holdings table, add/delete positions, P&L summary cards, AI analysis button |
| `Watchlist.tsx` | Saved tickers with live prices, notes, Analyze button navigates to Dashboard |
| `Alerts.tsx` | Create and delete price alerts, check which have triggered |
| `Screener.tsx` | 5 preset scan buttons, mode toggle (40 stocks vs watchlist), results table with Analyze links |
| `Compare.tsx` | Comma-separated ticker input, side-by-side table with price, technicals, 52-week range bar, earnings |
| `Youtube.tsx` | URL input for video summarizer + Market Pulse section with sentiment bar and per-channel cards |
| `Login.tsx` | Login and register forms, stores JWT in localStorage on success |

### Components

| Component | What it renders |
|---|---|
| `PriceCard` | Live price, change %, day range, 52-week range, volume, market cap, pre/after-hours prices |
| `AnalysisCard` | Claude sentiment badge, confidence bar, one-liner, summary, 3-column grid (Key Drivers / Technical Signals / Market Signals) |
| `ChartCard` | Interactive line chart with period selector (1M/3M/6M/1Y), close price line + SMA20 dashed overlay |
| `TechnicalCard` | RSI color bar, Bollinger Band range visual, MACD histogram, MA trend (Golden/Death Cross), next earnings date |
| `MarketContextCard` | VIX with color coding, Fear & Greed gradient meter, sector performance bar chart for all 10 sectors |
| `AnalystCard` | Ratings segmented bar, price target range with upside %, earnings history beat/miss, insider transactions, short interest badge |
| `NewsCard` | Latest headlines with source, relative time, description, clickable link |
| `ChatPanel` | Suggestion chips, chat bubbles (user right / AI left), auto-scroll, sends full analysis context with every message |
| `YoutubeCard` | Video cards with title (linked), channel, quoted transcript excerpt |
| `PortfolioTable` | Holdings rows with cost basis, current value, P&L coloring, delete button |
| `Navbar` | Navigation links, login/logout state |

---

## API Endpoints Reference

### Public (no auth required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/prices/{ticker}` | Live price data |
| `GET` | `/news/{ticker}` | Latest news headlines |
| `GET` | `/analyze/{ticker}` | Full analysis (price + technicals + market context + AI) |
| `GET` | `/analyst/{ticker}` | Wall Street analyst data |
| `GET` | `/chart/{ticker}?period=3mo` | OHLCV price history |
| `GET` | `/technicals/{ticker}` | Technical indicators only |
| `GET` | `/market/context` | VIX + Fear & Greed + sectors |
| `GET` | `/economic/calendar?days=14` | Upcoming macro events |
| `GET` | `/compare?tickers=AAPL,MSFT,NVDA` | Multi-ticker comparison |
| `POST` | `/chat` | AI conversation (body: `{ticker, analysis_context, messages}`) |
| `GET` | `/youtube/{ticker}` | Per-ticker YouTube search |
| `POST` | `/youtube/summarize` | Summarize a YouTube URL |
| `GET` | `/youtube/market-pulse` | Market Pulse from top finance channels |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |

### Protected (requires `Authorization: Bearer <token>` header)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/portfolio/summary` | Holdings with live P&L |
| `POST` | `/portfolio/holdings` | Add a holding |
| `DELETE` | `/portfolio/holdings/{id}` | Remove a holding |
| `GET` | `/portfolio/ai-analysis` | AI portfolio health review |
| `GET` | `/watchlist` | Your watchlist with live prices |
| `POST` | `/watchlist` | Add ticker to watchlist |
| `DELETE` | `/watchlist/{id}` | Remove from watchlist |
| `GET` | `/alerts` | Your price alerts |
| `POST` | `/alerts` | Create an alert |
| `DELETE` | `/alerts/{id}` | Delete an alert |
| `GET` | `/alerts/check` | Check all alerts against live prices |
| `POST` | `/screener/scan` | Run a technical scan |

---

## Environment Variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection String |
| `REDIS_URL` | Upstash → Redis database → Connection details (use `rediss://` for TLS) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `NEWSAPI_KEY` | newsapi.org → Get API Key (free tier = 100 req/day) |
| `FINNHUB_API_KEY` | finnhub.io → Dashboard → API Key (free tier available) |
| `JWT_SECRET` | Any long random string — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |

---

## Data Flow: What Happens on a Single Analysis

When you type `NVDA` and click Analyze:

```
Frontend fires TWO parallel HTTP calls:
  → GET /analyze/NVDA       (main analysis)
  → GET /analyst/NVDA       (analyst data, separate so it doesn't slow main)

Backend /analyze/NVDA:
  snapshot_service spawns 4 threads simultaneously:
    Thread 1 → Finnhub + yfinance    → price, change, 52W range
    Thread 2 → NewsAPI + Yahoo RSS   → 5 latest headlines
    Thread 3 → yfinance 6mo history  → RSI, MACD, Bollinger Bands, MAs
    Thread 4 → VIX + CNN + ETFs      → market context
  All 4 finish → ai_engine builds prompt → Claude Haiku → JSON
  Returns everything in one response (~8–15 seconds)

Backend /analyst/NVDA:
  5 Finnhub calls fire simultaneously:
    → analyst ratings, price targets, earnings history,
      insider transactions, short interest
  Returns merged (~2–4 seconds)

Frontend renders as each resolves:
  Main response arrives → PriceCard, AnalysisCard, ChartCard,
                           TechnicalCard, MarketContextCard, NewsCard
  Analyst response arrives → AnalystCard fills in
  Chat panel appears once fullContext is set
```

---

## Key Design Decisions

**Why two data sources (Finnhub + yfinance)?**
Finnhub gives real-time prices but limited metadata. yfinance gives rich metadata (52W range, market cap, technicals) but slightly delayed prices. Combining both gives the best of each.

**Why parallel fetching everywhere?**
A single analysis touches 4+ external APIs. Sequential fetching would take 20–30 seconds. ThreadPoolExecutor brings that down to the slowest single call (~8–12 seconds).

**Why Claude Haiku and not a larger model?**
Haiku is fast (2–3 seconds) and cheap. For the structured JSON output this app needs, Haiku performs comparably to larger models. Speed matters more than creative output here.

**Why is analyst data a separate parallel call?**
Analyst data loads in ~2 seconds. The main analysis takes 8–15 seconds. If they were sequential, you'd wait for the slower one before seeing anything. Parallel means the analyst card fills in almost immediately after the main analysis loads.

**Why JWT in localStorage instead of httpOnly cookies?**
Simpler to implement and sufficient for a personal tool. For a production app with sensitive financial data, httpOnly cookies would be more secure.
