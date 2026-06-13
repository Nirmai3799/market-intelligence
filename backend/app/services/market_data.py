import urllib.request
import json
import yfinance as yf
from fastapi import HTTPException
from app.core.config import settings


# ── Twelve Data exchange suffix map ──────────────────────────────────────────
# Maps yfinance ticker suffix → Twelve Data exchange code
_TD_EXCHANGE: dict[str, str] = {
    ".NS": "NSE",
    ".BO": "BSE",
    ".L":  "LSE",
    ".DE": "XETRA",
    ".TO": "TSX",
    ".AX": "ASX",
    ".HK": "HKEX",
    ".SI": "SGX",
    ".T":  "TSE",
    ".PA": "XPAR",
    ".MC": "BME",
    ".MI": "MIL",
}


def _finnhub_quote(ticker: str) -> dict | None:
    """
    Fetch real-time quote from Finnhub (US stocks, no 15-min delay).
    Finnhub fields: c=price, d=change$, dp=change%, h=high, l=low, pc=prev_close
    """
    if not settings.FINNHUB_API_KEY:
        return None
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={settings.FINNHUB_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        return data if data.get("c") else None
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


def _twelve_data_quote(ticker: str) -> dict | None:
    """
    Fetch real-time quote from Twelve Data for international tickers.
    Converts yfinance suffix (RELIANCE.NS) → Twelve Data format (RELIANCE:NSE).
    Returns None if key not set, ticker not found, or request fails.
    Free tier: 800 calls/day, 8 calls/min — sufficient for personal use.
    """
    if not settings.TWELVE_DATA_API_KEY:
        return None

    # Find which suffix this ticker uses
    suffix = next((s for s in _TD_EXCHANGE if ticker.upper().endswith(s)), None)
    if not suffix:
        return None

    base     = ticker[: -len(suffix)]
    exchange = _TD_EXCHANGE[suffix]
    td_sym   = f"{base}:{exchange}"

    try:
        url = (f"https://api.twelvedata.com/quote"
               f"?symbol={td_sym}&apikey={settings.TWELVE_DATA_API_KEY}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        # Twelve Data returns {"status":"error"} for unknown symbols
        if data.get("status") == "error" or not data.get("close"):
            return None
        return data
    except Exception:
        return None


def resolve_ticker(ticker: str) -> str:
    """
    Validate and auto-detect the correct exchange suffix.
    - If ticker already has a suffix (e.g. NVDM.TO), validate it first.
      If invalid, try the base ticker without suffix (handles NEO vs TSX mix-ups).
    - If no suffix, tries raw → .NS → .BO for Indian stock auto-detection.
    Returns the first working variant, or the original ticker if none found.
    """
    ticker = ticker.upper().strip()
    if "." in ticker:
        base = ticker.split(".")[0]
        candidates = [ticker, base]  # try explicit suffix first, then bare
    else:
        candidates = [ticker, ticker + ".NS", ticker + ".BO"]
    for candidate in candidates:
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

    US stocks  : Finnhub (real-time) → yfinance fallback
    International (.NS/.BO/.L/.DE/.TO etc.):
                  Twelve Data (real-time) → yfinance fallback

    yfinance always fetched for: market cap, 52-week range, sector, volume avg.
    """
    ticker = resolve_ticker(ticker.upper().strip())

    try:
        is_international = "." in ticker
        info = yf.Ticker(ticker).info  # always fetch — provides supplementary data

        if is_international:
            # ── Twelve Data for international real-time prices ─────────────────
            tq = _twelve_data_quote(ticker)

            if tq:
                price      = float(tq["close"])
                change     = round(float(tq["change"]), 2)
                change_pct = round(float(tq["percent_change"]), 2)
                prev_close = float(tq["previous_close"])
                day_high   = float(tq["high"])
                day_low    = float(tq["low"])
                name       = tq.get("name") or info.get("longName") or info.get("shortName", ticker)
                currency   = tq.get("currency") or info.get("currency", "USD")
                volume     = int(tq["volume"])     if tq.get("volume")          else info.get("volume")
                avg_volume = int(tq["average_volume"]) if tq.get("average_volume") else info.get("averageVolume")
                fiftytwo   = tq.get("fifty_two_week", {})
                week_52_high = float(fiftytwo["high"]) if fiftytwo.get("high") else info.get("fiftyTwoWeekHigh")
                week_52_low  = float(fiftytwo["low"])  if fiftytwo.get("low")  else info.get("fiftyTwoWeekLow")
                data_source  = "twelvedata+yfinance"
            else:
                # Fallback: yfinance only (15-min delayed)
                price = info.get("currentPrice") or info.get("regularMarketPrice")
                if not price:
                    raise HTTPException(404, f"Ticker '{ticker}' not found.")
                prev_close = info.get("previousClose", 0)
                change     = round(price - prev_close, 2) if prev_close else None
                change_pct = round((change / prev_close) * 100, 2) if prev_close and change else None
                day_high   = info.get("dayHigh")
                day_low    = info.get("dayLow")
                name       = info.get("longName") or info.get("shortName", ticker)
                currency   = info.get("currency", "USD")
                volume     = info.get("volume")
                avg_volume = info.get("averageVolume")
                week_52_high = info.get("fiftyTwoWeekHigh")
                week_52_low  = info.get("fiftyTwoWeekLow")
                data_source  = "yfinance"

            # International markets don't have US-style pre/post market sessions
            pre_market_price      = None
            pre_market_change_pct = None
            post_market_price     = None
            post_market_change_pct = None

        else:
            # ── Finnhub for US real-time prices ──────────────────────────────
            fq = _finnhub_quote(ticker)

            if fq:
                price      = fq["c"]
                change     = round(fq["d"], 2)
                change_pct = round(fq["dp"], 2)
                prev_close = fq["pc"]
                day_high   = fq["h"]
                day_low    = fq["l"]
                data_source = "finnhub+yfinance"
            else:
                price = info.get("currentPrice") or info.get("regularMarketPrice")
                if not price:
                    raise HTTPException(404, f"Ticker '{ticker}' not found.")
                prev_close = info.get("previousClose", 0)
                change     = round(price - prev_close, 2) if prev_close else None
                change_pct = round((change / prev_close) * 100, 2) if prev_close and change else None
                day_high   = info.get("dayHigh")
                day_low    = info.get("dayLow")
                data_source = "yfinance"

            name       = info.get("longName") or info.get("shortName", ticker)
            currency   = info.get("currency", "USD")
            volume     = info.get("volume")
            avg_volume = info.get("averageVolume")
            week_52_high = info.get("fiftyTwoWeekHigh")
            week_52_low  = info.get("fiftyTwoWeekLow")

            pre_price  = info.get("preMarketPrice")
            post_price = info.get("postMarketPrice")
            pre_chg    = info.get("preMarketChangePercent")
            post_chg   = info.get("postMarketChangePercent")
            pre_market_price       = round(float(pre_price),  2) if pre_price  else None
            pre_market_change_pct  = round(float(pre_chg)  * 100, 2) if pre_chg  is not None else None
            post_market_price      = round(float(post_price), 2) if post_price else None
            post_market_change_pct = round(float(post_chg) * 100, 2) if post_chg is not None else None

        if not price:
            raise HTTPException(404, f"Ticker '{ticker}' not found. Check the symbol and try again.")

        return {
            "ticker":       ticker,
            "name":         name,
            "price":        price,
            "currency":     currency,
            "change":       change,
            "change_pct":   change_pct,
            "previous_close": prev_close,
            "day_high":     day_high,
            "day_low":      day_low,
            "volume":       volume,
            "avg_volume":   avg_volume,
            "market_cap":   info.get("marketCap"),
            "week_52_high": week_52_high,
            "week_52_low":  week_52_low,
            "pre_market_price":       pre_market_price,
            "pre_market_change_pct":  pre_market_change_pct,
            "post_market_price":      post_market_price,
            "post_market_change_pct": post_market_change_pct,
            "sector":       info.get("sector"),
            "data_source":  data_source,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch data for '{ticker}': {str(e)}")
