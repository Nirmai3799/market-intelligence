import concurrent.futures

from app.services.market_data import get_ticker_data, resolve_ticker
from app.services.news_service import get_ticker_news
from app.services.technical_analysis import get_technicals
from app.services.market_context import get_market_context


def _safe_fundamentals(ticker: str) -> dict | None:
    try:
        from app.services.fundamental_service import get_fundamentals
        return get_fundamentals(ticker)
    except Exception:
        return None


def get_snapshot(ticker: str) -> dict:
    """
    Build a comprehensive market snapshot for a ticker.
    Fetches price, news, technicals, market context, and fundamentals in parallel.
    Computes synthesis (decision zone) from combined signals.
    """
    ticker = resolve_ticker(ticker.upper())

    with concurrent.futures.ThreadPoolExecutor() as pool:
        price_f = pool.submit(get_ticker_data, ticker)
        news_f  = pool.submit(get_ticker_news, ticker, 5)
        tech_f  = pool.submit(get_technicals, ticker)
        ctx_f   = pool.submit(get_market_context)
        fund_f  = pool.submit(_safe_fundamentals, ticker)

        price_data    = price_f.result()
        news          = news_f.result()
        technicals    = tech_f.result()
        market_context = ctx_f.result()
        fundamentals  = fund_f.result()

    # Derive simple price signals
    change_pct   = price_data.get("change_pct") or 0
    volume       = price_data.get("volume") or 0
    avg_volume   = price_data.get("avg_volume") or 1
    volume_ratio = round(volume / avg_volume, 2) if avg_volume else None

    if volume_ratio is None:
        volume_signal = "unavailable"
    elif volume_ratio > 1.3:
        volume_signal = "above average"
    elif volume_ratio < 0.7:
        volume_signal = "below average"
    else:
        volume_signal = "normal"

    direction = "up" if change_pct > 0 else "down" if change_pct < 0 else "flat"
    move_size = "large" if abs(change_pct) > 3 else "moderate" if abs(change_pct) > 1 else "small"

    # Synthesis — decision zone from combined signals
    from app.services.synthesis_service import compute_synthesis
    synthesis = compute_synthesis(fundamentals, technicals, price_data)

    return {
        "ticker":         ticker,
        "price":          price_data,
        "signals": {
            "direction":     direction,
            "move_size":     move_size,
            "volume_signal": volume_signal,
            "volume_ratio":  volume_ratio,
        },
        "technicals":     technicals,
        "fundamentals":   fundamentals,
        "market_context": market_context,
        "synthesis":      synthesis,
        "news":           news,
        "news_count":     len(news),
    }
