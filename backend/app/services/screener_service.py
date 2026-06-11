"""
Stock Screener
==============
Scans a universe of major US stocks and ETFs, applies technical filters,
and returns matching tickers with key stats.

Think of it as a filter on top of the whole market:
  "Show me every stock where RSI is under 30 AND price is above the 200-day MA"
  = oversold stocks still in a long-term uptrend = classic dip-buy candidates

Two scan modes:
  1. scan_watchlist()  — only the user's saved watchlist tickers (fast, ~3s)
  2. scan_universe()   — 40 major tickers from across the market (~15-20s)
"""

import concurrent.futures

# 40 major tickers spanning all sectors + key ETFs
UNIVERSE = [
    # Mega-cap tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
    # Finance
    "JPM", "BAC", "GS", "V", "MA",
    # Healthcare
    "JNJ", "UNH", "ABBV", "MRK",
    # Consumer
    "WMT", "COST", "HD", "PG",
    # Energy
    "CVX", "XOM",
    # Semiconductors
    "AMD", "INTC", "QCOM",
    # Tech/growth
    "CRM", "ORCL", "NFLX", "PYPL", "SQ", "SHOP", "COIN",
    # Index ETFs
    "SPY", "QQQ", "IWM",
    # Sector ETFs
    "XLK", "XLF", "XLE", "XLV",
]


def _check_ticker(ticker: str, criteria: dict) -> dict | None:
    """
    Fetch technicals + price for one ticker and check if it passes all criteria.
    Returns None if it fails any filter.
    """
    from app.services.technical_analysis import get_technicals
    from app.services.market_data import get_ticker_data

    try:
        tech  = get_technicals(ticker)
        price = get_ticker_data(ticker)

        rsi      = tech.get("rsi", 50)
        macd_h   = tech.get("macd_histogram", 0)
        sma50    = tech.get("sma_50")
        sma200   = tech.get("sma_200")
        current  = price.get("price", 0)
        chg_pct  = price.get("change_pct", 0) or 0

        # Apply each active filter
        if criteria.get("rsi_max") is not None and rsi > criteria["rsi_max"]:
            return None
        if criteria.get("rsi_min") is not None and rsi < criteria["rsi_min"]:
            return None
        if criteria.get("macd_signal") == "bullish"  and macd_h <= 0: return None
        if criteria.get("macd_signal") == "bearish"  and macd_h >= 0: return None
        if criteria.get("above_200ma") and sma200 and current < sma200: return None
        if criteria.get("below_200ma") and sma200 and current > sma200: return None
        if criteria.get("change_min") is not None and chg_pct < criteria["change_min"]: return None
        if criteria.get("change_max") is not None and chg_pct > criteria["change_max"]: return None

        return {
            "ticker":      ticker,
            "name":        price.get("name", ticker),
            "price":       current,
            "change_pct":  chg_pct,
            "rsi":         rsi,
            "rsi_signal":  tech.get("rsi_signal"),
            "macd_signal": tech.get("macd_signal"),
            "above_200ma": (current > sma200) if sma200 else None,
            "sma_50":      sma50,
            "sma_200":     sma200,
        }
    except Exception:
        return None


def scan(criteria: dict, tickers: list[str]) -> list:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda t: _check_ticker(t, criteria), tickers))
    matches = [r for r in results if r is not None]
    return sorted(matches, key=lambda x: x["rsi"])
