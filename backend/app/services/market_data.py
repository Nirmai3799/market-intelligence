import urllib.request
import json
import yfinance as yf
from fastapi import HTTPException
from app.core.config import settings


def _finnhub_quote(ticker: str) -> dict | None:
    """
    Fetch real-time quote from Finnhub (no 15-min delay).
    Returns the raw Finnhub quote dict, or None if the call fails.

    Finnhub fields:
      c  = current price
      d  = change ($)
      dp = change (%)
      h  = day high
      l  = day low
      o  = open
      pc = previous close
    """
    if not settings.FINNHUB_API_KEY:
        return None
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={settings.FINNHUB_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        # Finnhub returns c=0 for invalid tickers
        if not data.get("c"):
            return None
        return data
    except Exception:
        return None


def _finnhub_profile(ticker: str) -> dict | None:
    """Fetch company name and market cap from Finnhub."""
    if not settings.FINNHUB_API_KEY:
        return None
    try:
        url = f"https://finnhub.io/api/v1/stock/profile2?symbol={ticker}&token={settings.FINNHUB_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def resolve_ticker(ticker: str) -> str:
    """
    Auto-detect the correct exchange suffix.
    If 'RELIANCE' has no price data, tries 'RELIANCE.NS' (NSE) then 'RELIANCE.BO' (BSE).
    Returns the first working variant, or the original ticker if none found.
    """
    ticker = ticker.upper().strip()
    if "." in ticker:
        return ticker  # already explicit (AAPL, RELIANCE.NS, etc.)
    for candidate in (ticker, ticker + ".NS", ticker + ".BO"):
        try:
            price = getattr(yf.Ticker(candidate).fast_info, "last_price", None)
            if price and price > 0:
                return candidate
        except Exception:
            continue
    return ticker


def get_ticker_data(ticker: str) -> dict:
    """
    Fetch live price and market data.

    Strategy:
    - Finnhub   → real-time price, change, day high/low (no 15-min delay)
    - yfinance  → 52-week range, volume, avg volume, market cap, company name
                  (these don't need to be real-time)

    Falls back to yfinance-only if Finnhub is unavailable.
    Automatically appends .NS / .BO for Indian stocks if needed.
    """
    ticker = resolve_ticker(ticker.upper().strip())

    try:
        # ── Real-time quote from Finnhub ──────────────────────────────────────
        fq = _finnhub_quote(ticker)

        # ── Supplementary data from yfinance ─────────────────────────────────
        info = yf.Ticker(ticker).info

        if fq:
            price = fq["c"]
            change = round(fq["d"], 2)
            change_pct = round(fq["dp"], 2)
            prev_close = fq["pc"]
            day_high = fq["h"]
            day_low = fq["l"]
        else:
            # Fallback: yfinance only (15-min delay during market hours)
            price = info.get("currentPrice") or info.get("regularMarketPrice")
            if not price:
                raise HTTPException(404, f"Ticker '{ticker}' not found.")
            prev_close = info.get("previousClose", 0)
            change = round(price - prev_close, 2) if prev_close else None
            change_pct = round((change / prev_close) * 100, 2) if prev_close and change else None
            day_high = info.get("dayHigh")
            day_low = info.get("dayLow")

        if not price:
            raise HTTPException(404, f"Ticker '{ticker}' not found. Check the symbol and try again.")

        # Pre/post market prices from yfinance info
        pre_price  = info.get("preMarketPrice")
        post_price = info.get("postMarketPrice")
        pre_chg    = info.get("preMarketChangePercent")
        post_chg   = info.get("postMarketChangePercent")

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName", ticker),
            "price": price,
            "currency": info.get("currency", "USD"),
            "change": change,
            "change_pct": change_pct,
            "previous_close": prev_close,
            "day_high": day_high,
            "day_low": day_low,
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "market_cap": info.get("marketCap"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "pre_market_price": round(float(pre_price), 2) if pre_price else None,
            "pre_market_change_pct": round(float(pre_chg) * 100, 2) if pre_chg and abs(pre_chg) < 1 else (round(float(pre_chg), 2) if pre_chg else None),
            "post_market_price": round(float(post_price), 2) if post_price else None,
            "post_market_change_pct": round(float(post_chg) * 100, 2) if post_chg and abs(post_chg) < 1 else (round(float(post_chg), 2) if post_chg else None),
            "sector": info.get("sector"),
            "data_source": "finnhub+yfinance" if fq else "yfinance",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch data for '{ticker}': {str(e)}")
