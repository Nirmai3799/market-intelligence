import yfinance as yf
from fastapi import HTTPException


def get_technicals(ticker: str) -> dict:
    """
    Calculate RSI, MACD, Bollinger Bands, and moving averages
    using 200 days of historical price data from yfinance.
    """
    try:
        hist = yf.Ticker(ticker).history(period="200d")

        if hist.empty or len(hist) < 30:
            raise HTTPException(404, f"Not enough historical data for {ticker}")

        close = hist["Close"]

        # ── RSI (14) ─────────────────────────────────────────────────────────
        delta = close.diff()
        gain = delta.where(delta > 0, 0.0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
        rsi = float((100 - (100 / (1 + gain / loss))).iloc[-1])

        if rsi > 70:
            rsi_signal = "Overbought — stock may be due for a pullback"
        elif rsi < 30:
            rsi_signal = "Oversold — stock may be due for a bounce"
        else:
            rsi_signal = "Neutral"

        # ── MACD (12, 26, 9) ─────────────────────────────────────────────────
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        macd_hist = float((macd_line - signal_line).iloc[-1])
        macd_signal = "Bullish momentum" if macd_hist > 0 else "Bearish momentum"

        # ── Bollinger Bands (20, 2σ) ──────────────────────────────────────────
        sma20 = close.rolling(20).mean()
        std20 = close.rolling(20).std()
        bb_upper = float((sma20 + 2 * std20).iloc[-1])
        bb_middle = float(sma20.iloc[-1])
        bb_lower = float((sma20 - 2 * std20).iloc[-1])
        current = float(close.iloc[-1])

        bb_width = bb_upper - bb_lower
        if bb_width > 0:
            bb_pct = (current - bb_lower) / bb_width * 100
            if bb_pct > 80:
                bb_position = "Near upper band — extended, watch for reversal"
            elif bb_pct < 20:
                bb_position = "Near lower band — potential bounce zone"
            else:
                bb_position = "Mid-range — no extreme signal"
        else:
            bb_position = "Bands too tight to read"

        # ── Moving Averages ───────────────────────────────────────────────────
        sma50 = float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else None
        sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else None

        if sma50 and sma200:
            if sma50 > sma200:
                ma_trend = "Bullish — MA50 above MA200 (Golden Cross territory)"
            else:
                ma_trend = "Bearish — MA50 below MA200 (Death Cross territory)"
        else:
            ma_trend = "Insufficient data for MA trend"

        # ── Earnings ──────────────────────────────────────────────────────────
        next_earnings = None
        try:
            cal = yf.Ticker(ticker).calendar
            if cal is not None:
                dates = cal.get("Earnings Date") if isinstance(cal, dict) else None
                if dates and len(dates) > 0:
                    next_earnings = str(dates[0])
        except Exception:
            pass

        return {
            "rsi": round(rsi, 2),
            "rsi_signal": rsi_signal,
            "macd_histogram": round(macd_hist, 4),
            "macd_signal": macd_signal,
            "bollinger_upper": round(bb_upper, 2),
            "bollinger_middle": round(bb_middle, 2),
            "bollinger_lower": round(bb_lower, 2),
            "bollinger_position": bb_position,
            "sma_50": round(sma50, 2) if sma50 else None,
            "sma_200": round(sma200, 2) if sma200 else None,
            "ma_trend": ma_trend,
            "next_earnings": next_earnings,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to calculate technicals for '{ticker}': {str(e)}")
