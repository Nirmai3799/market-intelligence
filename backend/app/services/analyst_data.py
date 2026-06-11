"""
Analyst Intelligence Service
=============================
Fetches 5 data points from Finnhub (already have the key) + yfinance:

  1. Analyst Ratings    — how many Wall St analysts say Buy / Hold / Sell
  2. Price Target       — where analysts think the stock is going (low/mean/high)
  3. Earnings History   — last 4 quarters: did they beat or miss EPS estimates?
  4. Insider Trading    — recent Form 4 filings: executives buying or selling their own stock
  5. Short Interest     — what % of shares are being bet AGAINST the stock

All 5 run in parallel so the total wait time is the slowest single call (~1-2s).
"""

import concurrent.futures
import json
import urllib.request

import yfinance as yf

from app.core.config import settings

_BASE = "https://finnhub.io/api/v1"


def _fget(path: str):
    """Generic Finnhub GET — returns parsed JSON or None on any error."""
    try:
        url = f"{_BASE}{path}&token={settings.FINNHUB_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


# ── 1. Analyst Ratings ────────────────────────────────────────────────────────

def get_analyst_ratings(ticker: str) -> dict:
    """
    Finnhub returns monthly snapshots of analyst consensus.
    We take the most recent month.

    buy + strongBuy  →  Bulls
    sell + strongSell →  Bears
    hold             →  Neutral
    """
    data = _fget(f"/stock/recommendation?symbol={ticker}")
    if not data or not isinstance(data, list) or not data:
        return {}

    r = data[0]
    bulls = r.get("buy", 0) + r.get("strongBuy", 0)
    bears = r.get("sell", 0) + r.get("strongSell", 0)
    neutral = r.get("hold", 0)
    total = bulls + bears + neutral

    if total == 0:
        return {}

    buy_pct  = round(bulls   / total * 100, 1)
    sell_pct = round(bears   / total * 100, 1)
    hold_pct = round(neutral / total * 100, 1)

    if buy_pct >= 60:
        consensus = "Strong Buy"
    elif buy_pct >= 40:
        consensus = "Buy"
    elif sell_pct >= 40:
        consensus = "Sell"
    else:
        consensus = "Hold"

    return {
        "period":          r.get("period"),
        "buy":             bulls,
        "hold":            neutral,
        "sell":            bears,
        "total_analysts":  total,
        "buy_pct":         buy_pct,
        "hold_pct":        hold_pct,
        "sell_pct":        sell_pct,
        "consensus":       consensus,
    }


# ── 2. Price Target ───────────────────────────────────────────────────────────

def get_price_target(ticker: str) -> dict:
    """
    Finnhub aggregates price targets from all covering analysts.
    mean = average target, high = most bullish, low = most bearish.
    """
    data = _fget(f"/stock/price-target?symbol={ticker}")
    if not data or not data.get("targetMean"):
        return {}

    return {
        "mean":         round(data.get("targetMean", 0), 2),
        "high":         round(data.get("targetHigh", 0), 2),
        "low":          round(data.get("targetLow",  0), 2),
        "median":       round(data.get("targetMedian", 0), 2),
        "last_updated": data.get("lastUpdated"),
    }


# ── 3. Earnings History ───────────────────────────────────────────────────────

def get_earnings_history(ticker: str, periods: int = 4) -> list:
    """
    Last N quarterly earnings reports.
    Each entry shows the actual EPS vs the analyst estimate, and the surprise %.
    Traders use this to judge management credibility and estimate reliability.
    """
    data = _fget(f"/stock/earnings?symbol={ticker}&limit={periods}")
    if not data or not isinstance(data, list):
        return []

    results = []
    for e in data[:periods]:
        actual   = e.get("actual")
        estimate = e.get("estimate")
        surprise = e.get("surprisePercent")

        beat = None
        if actual is not None and estimate is not None:
            beat = actual >= estimate

        results.append({
            "period":        e.get("period"),
            "actual_eps":    actual,
            "estimated_eps": estimate,
            "surprise_pct":  round(surprise, 1) if surprise is not None else None,
            "beat":          beat,
        })

    return results


# ── 4. Insider Trading ────────────────────────────────────────────────────────

def get_insider_transactions(ticker: str, limit: int = 6) -> list:
    """
    SEC Form 4 filings via Finnhub.
    When a CEO or CFO buys their OWN stock with their OWN money, that's a
    strong bullish signal — they literally have skin in the game.
    Selling is more ambiguous (could be estate planning, diversification, etc.)
    """
    data = _fget(f"/stock/insider-transactions?symbol={ticker}")
    if not data or not isinstance(data, dict):
        return []

    results = []
    for t in (data.get("data") or [])[:limit]:
        change = t.get("change", 0)
        if change == 0:
            continue

        price  = t.get("transactionPrice") or 0
        shares = abs(change)
        value  = round(price * shares) if price else None

        results.append({
            "name":   t.get("name", "Unknown"),
            "type":   "Buy" if change > 0 else "Sell",
            "shares": shares,
            "price":  price,
            "value":  value,
            "date":   t.get("transactionDate"),
        })

    return results


# ── 5. Short Interest ─────────────────────────────────────────────────────────

def get_short_interest(ticker: str) -> dict:
    """
    Short interest from yfinance.
    shortPercentOfFloat = what fraction of tradable shares are bet against it.
    shortRatio (days to cover) = how many trading days it would take ALL
    short sellers to buy back their shares at average volume. High ratio
    = if stock rises, shorts are trapped and forced to buy, amplifying the move
    (short squeeze).
    """
    try:
        info = yf.Ticker(ticker).info
        pct_raw = info.get("shortPercentOfFloat")
        ratio   = info.get("shortRatio")
        shares  = info.get("sharesShort")

        pct = None
        if pct_raw is not None:
            pct = round(pct_raw * 100 if pct_raw < 1 else pct_raw, 1)

        level = None
        if pct is not None:
            if pct > 20:
                level = "Very high — short squeeze candidate"
            elif pct > 10:
                level = "High — significant bearish bets"
            elif pct > 5:
                level = "Moderate"
            else:
                level = "Low"

        return {
            "shares_short":    shares,
            "short_ratio":     round(ratio, 1) if ratio else None,
            "short_pct_float": pct,
            "level":           level,
        }
    except Exception:
        return {}


# ── Combined ──────────────────────────────────────────────────────────────────

def get_analyst_data(ticker: str) -> dict:
    """Fetch all 5 data points in parallel."""
    ticker = ticker.upper()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        rf = pool.submit(get_analyst_ratings,     ticker)
        tf = pool.submit(get_price_target,        ticker)
        ef = pool.submit(get_earnings_history,    ticker)
        inf = pool.submit(get_insider_transactions, ticker)
        sf = pool.submit(get_short_interest,      ticker)

        return {
            "analyst_ratings":      rf.result(),
            "price_target":         tf.result(),
            "earnings_history":     ef.result(),
            "insider_transactions": inf.result(),
            "short_interest":       sf.result(),
        }
