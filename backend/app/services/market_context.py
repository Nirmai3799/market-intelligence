import json
import urllib.request
import yfinance as yf


# ── VIX ───────────────────────────────────────────────────────────────────────

def get_vix() -> dict:
    """Fetch VIX (Volatility Index) — the market's 'fear gauge'."""
    try:
        info = yf.Ticker("^VIX").info
        price = info.get("regularMarketPrice") or info.get("currentPrice") or 0
        change_pct = info.get("regularMarketChangePercent") or 0

        if price < 15:
            level = "Low fear — market is calm/complacent"
        elif price < 20:
            level = "Normal range"
        elif price < 30:
            level = "Elevated fear — caution warranted"
        else:
            level = "Extreme fear — high volatility, risk-off environment"

        return {
            "value": round(float(price), 2),
            "change_pct": round(float(change_pct), 2),
            "level": level,
        }
    except Exception:
        return {"value": None, "change_pct": None, "level": "Unavailable"}


# ── Fear & Greed ──────────────────────────────────────────────────────────────

def get_fear_and_greed() -> dict:
    """
    Fetch CNN's Fear & Greed Index (0 = Extreme Fear, 100 = Extreme Greed).
    CNN exposes a public JSON endpoint — no API key required.
    """
    try:
        url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())

        score = float(data["fear_and_greed"]["score"])
        rating = data["fear_and_greed"]["rating"].replace("_", " ").title()

        return {"score": round(score, 1), "rating": rating}
    except Exception:
        return {"score": None, "rating": "Unavailable"}


# ── Sector performance ────────────────────────────────────────────────────────

SECTOR_ETFS = {
    "XLK": "Technology",
    "XLF": "Financials",
    "XLE": "Energy",
    "XLV": "Healthcare",
    "XLI": "Industrials",
    "XLY": "Consumer Disc.",
    "XLP": "Consumer Staples",
    "XLU": "Utilities",
    "XLRE": "Real Estate",
    "XLB": "Materials",
}


def get_sector_performance() -> list:
    """
    Return today's % change for each S&P 500 sector ETF,
    sorted best → worst.  Each ETF tracks one sector.
    """
    results = []
    for etf, name in SECTOR_ETFS.items():
        try:
            info = yf.Ticker(etf).info
            change_pct = info.get("regularMarketChangePercent") or 0
            results.append({
                "etf": etf,
                "sector": name,
                "change_pct": round(float(change_pct), 2),
            })
        except Exception:
            continue

    return sorted(results, key=lambda x: x["change_pct"], reverse=True)


# ── Combined ──────────────────────────────────────────────────────────────────

def get_market_context() -> dict:
    """Single call that returns VIX + Fear & Greed + all sector performances."""
    return {
        "vix": get_vix(),
        "fear_and_greed": get_fear_and_greed(),
        "sectors": get_sector_performance(),
    }
