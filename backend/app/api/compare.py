import concurrent.futures
from fastapi import APIRouter

router = APIRouter(prefix="/compare", tags=["compare"])


@router.get("")
def compare(tickers: str):
    """
    Side-by-side comparison of multiple tickers.
    Pass as comma-separated: /compare?tickers=AAPL,MSFT,NVDA
    """
    from app.services.market_data import get_ticker_data
    from app.services.technical_analysis import get_technicals

    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:6]

    def fetch_one(t: str) -> dict:
        try:
            price = get_ticker_data(t)
            tech  = get_technicals(t)
            return {
                "ticker":      t,
                "name":        price.get("name", t),
                "price":       price.get("price"),
                "change_pct":  price.get("change_pct"),
                "market_cap":  price.get("market_cap"),
                "volume":      price.get("volume"),
                "rsi":         tech.get("rsi"),
                "rsi_signal":  tech.get("rsi_signal"),
                "macd_signal": tech.get("macd_signal"),
                "ma_trend":    tech.get("ma_trend"),
                "sma_50":      tech.get("sma_50"),
                "sma_200":     tech.get("sma_200"),
                "next_earnings": tech.get("next_earnings"),
                "week_52_high": price.get("week_52_high"),
                "week_52_low":  price.get("week_52_low"),
            }
        except Exception:
            return {"ticker": t, "error": "Failed to fetch"}

    with concurrent.futures.ThreadPoolExecutor() as pool:
        results = list(pool.map(fetch_one, ticker_list))

    return {"tickers": results}
