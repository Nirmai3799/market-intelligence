import pandas as pd
import yfinance as yf
from fastapi import HTTPException


def get_technicals(ticker: str) -> dict:
    """
    Calculate comprehensive technical indicators using 1 year of historical data.
    Includes: RSI, MACD, Stochastic, ATR, OBV, ROC, Volume trend,
              Trend structure, Bollinger Bands, MAs, Fibonacci levels.
    """
    try:
        hist = yf.Ticker(ticker).history(period="1y")

        if hist.empty or len(hist) < 30:
            raise HTTPException(404, f"Not enough historical data for {ticker}")

        close  = hist["Close"]
        high   = hist["High"]
        low    = hist["Low"]
        volume = hist["Volume"]
        current_price = float(close.iloc[-1])

        # ── RSI (14) ──────────────────────────────────────────────────────────
        delta = close.diff()
        gain  = delta.where(delta > 0, 0.0).rolling(14).mean()
        loss  = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
        # Guard: when loss = 0 (all gains), RSI → 100; replace 0 with tiny value
        loss_safe = loss.where(loss != 0, 1e-10)
        rsi = float((100 - (100 / (1 + gain / loss_safe))).iloc[-1])
        rsi = max(0.0, min(100.0, rsi))  # clamp to [0, 100]

        if rsi > 70:
            rsi_signal = "Overbought — stock may be due for a pullback"
        elif rsi < 30:
            rsi_signal = "Oversold — stock may be due for a bounce"
        else:
            rsi_signal = "Neutral"

        # ── MACD (12, 26, 9) ──────────────────────────────────────────────────
        ema12       = close.ewm(span=12, adjust=False).mean()
        ema26       = close.ewm(span=26, adjust=False).mean()
        macd_line   = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        macd_hist   = float((macd_line - signal_line).iloc[-1])
        macd_signal = "Bullish momentum" if macd_hist > 0 else "Bearish momentum"

        # ── Stochastic Oscillator (14, 3) ─────────────────────────────────────
        low14       = low.rolling(14).min()
        high14      = high.rolling(14).max()
        stoch_range = high14 - low14
        # Guard: when range = 0 (no price movement), return 50 neutral
        stoch_raw   = ((close - low14) / stoch_range.where(stoch_range > 0, other=float('nan')) * 100).fillna(50)
        stoch_k_s   = stoch_raw.iloc[-1]
        stoch_d_s   = stoch_raw.rolling(3).mean().iloc[-1]
        stoch_k     = float(stoch_k_s) if not pd.isna(stoch_k_s) else None
        stoch_d     = float(stoch_d_s) if not pd.isna(stoch_d_s) else None

        if stoch_k is not None:
            if stoch_k < 20:
                stoch_signal = "Oversold — potential reversal zone"
            elif stoch_k > 80:
                stoch_signal = "Overbought — potential pullback"
            elif stoch_d and stoch_k > stoch_d:
                stoch_signal = "Bullish %K/%D crossover"
            elif stoch_d and stoch_k < stoch_d:
                stoch_signal = "Bearish %K/%D crossover"
            else:
                stoch_signal = "Neutral"
        else:
            stoch_signal = "Insufficient data"

        # ── ATR (14) ──────────────────────────────────────────────────────────
        prev_close = close.shift(1)
        tr = pd.concat([
            high - low,
            (high - prev_close).abs(),
            (low - prev_close).abs()
        ], axis=1).max(axis=1)
        atr     = float(tr.ewm(span=14, adjust=False).mean().iloc[-1])
        atr_pct = round(atr / current_price * 100, 2) if current_price else None

        # ── OBV ───────────────────────────────────────────────────────────────
        price_dir = close.diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
        obv       = (volume * price_dir).cumsum()
        obv_last  = float(obv.iloc[-1])
        obv_avg   = float(obv.rolling(20).mean().iloc[-1])
        obv_trend = "Rising" if obv_last > obv_avg else "Falling"

        # ── ROC (14-day Rate of Change) ───────────────────────────────────────
        roc_val = float(((close - close.shift(14)) / close.shift(14) * 100).iloc[-1]) \
                  if len(close) > 14 else None

        # ── Volume Trend (5-day vs 20-day avg) ────────────────────────────────
        vol_5d       = float(volume.tail(5).mean())
        vol_20d      = float(volume.tail(20).mean())
        vol_ratio_5d = round(vol_5d / vol_20d, 2) if vol_20d > 0 else 1.0
        # Cap ratio to avoid garbage data from near-zero denominators
        vol_ratio_5d = min(vol_ratio_5d, 50.0)

        price_5d_chg = float((close.iloc[-1] - close.iloc[-6]) / close.iloc[-6] * 100) \
                       if len(close) >= 6 else 0

        if price_5d_chg > 0 and vol_ratio_5d > 1.1:
            vol_trend_signal = "Strong — rising price with rising volume"
        elif price_5d_chg > 0 and vol_ratio_5d < 0.9:
            vol_trend_signal = "Weak — rising price with falling volume (suspect)"
        elif price_5d_chg < 0 and vol_ratio_5d > 1.1:
            vol_trend_signal = "Distribution — falling price with rising volume"
        else:
            vol_trend_signal = "Neutral"

        # ── Trend Structure (HH/HL or LH/LL over last 60 days) ────────────────
        recent   = close.tail(60)
        pivots_h = [float(recent.iloc[i]) for i in range(1, len(recent) - 1)
                    if recent.iloc[i] > recent.iloc[i - 1] and recent.iloc[i] > recent.iloc[i + 1]]
        pivots_l = [float(recent.iloc[i]) for i in range(1, len(recent) - 1)
                    if recent.iloc[i] < recent.iloc[i - 1] and recent.iloc[i] < recent.iloc[i + 1]]

        if len(pivots_h) >= 2 and len(pivots_l) >= 2:
            hh = pivots_h[-1] > pivots_h[-2]
            hl = pivots_l[-1] > pivots_l[-2]
            if hh and hl:
                trend_structure = "Uptrend — Higher Highs & Higher Lows"
                trend_bias      = "Bullish"
            elif not hh and not hl:
                trend_structure = "Downtrend — Lower Highs & Lower Lows"
                trend_bias      = "Bearish"
            else:
                trend_structure = "Ranging — mixed swing structure"
                trend_bias      = "Neutral"
        else:
            trend_structure = "Insufficient swing data"
            trend_bias      = "Neutral"

        # ── Bollinger Bands (20, 2σ) ──────────────────────────────────────────
        sma20  = close.rolling(20).mean()
        std20  = close.rolling(20).std()
        bb_upper  = float((sma20 + 2 * std20).iloc[-1])
        bb_middle = float(sma20.iloc[-1])
        bb_lower  = float((sma20 - 2 * std20).iloc[-1])

        bb_width = bb_upper - bb_lower
        if bb_width > 0:
            bb_pct = (current_price - bb_lower) / bb_width * 100
            if bb_pct > 80:
                bb_position = "Near upper band — extended, watch for reversal"
            elif bb_pct < 20:
                bb_position = "Near lower band — potential bounce zone"
            else:
                bb_position = "Mid-range — no extreme signal"
        else:
            bb_position = "Bands too tight to read"

        # ── Moving Averages ───────────────────────────────────────────────────
        sma50  = float(close.rolling(50).mean().iloc[-1])  if len(close) >= 50  else None
        sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else None

        if sma50 and sma200:
            ma_trend = "Bullish — MA50 above MA200 (Golden Cross territory)" \
                       if sma50 > sma200 else \
                       "Bearish — MA50 below MA200 (Death Cross territory)"
        else:
            ma_trend = "Insufficient data for MA trend"

        # ── Fibonacci Levels — true 52-week (last 252 trading days) ──────────
        year_high = float(high.tail(252).max())
        year_low  = float(low.tail(252).min())
        fib_range = year_high - year_low
        fib_levels = {
            "0.0":   round(year_low, 2),
            "23.6":  round(year_low + 0.236 * fib_range, 2),
            "38.2":  round(year_low + 0.382 * fib_range, 2),
            "50.0":  round(year_low + 0.500 * fib_range, 2),
            "61.8":  round(year_low + 0.618 * fib_range, 2),
            "100.0": round(year_high, 2),
        } if fib_range > 0 else {}
        nearest_fib = min(fib_levels.items(), key=lambda x: abs(x[1] - current_price)) \
                      if fib_levels else ("N/A", current_price)
        fib_context = f"Near {nearest_fib[0]}% level ({nearest_fib[1]})"

        # ── Next Earnings ──────────────────────────────────────────────────────
        next_earnings = None
        try:
            cal = yf.Ticker(ticker).calendar
            if isinstance(cal, dict):
                dates = cal.get("Earnings Date")
                if dates is not None:
                    # Handle DatetimeIndex, list, or single Timestamp
                    date_list = list(dates) if hasattr(dates, '__iter__') and not isinstance(dates, str) else [dates]
                    if date_list:
                        next_earnings = str(date_list[0])[:10]  # YYYY-MM-DD only
        except Exception:
            pass

        return {
            "rsi":              round(rsi, 2),
            "rsi_signal":       rsi_signal,
            "macd_histogram":   round(macd_hist, 4),
            "macd_signal":      macd_signal,
            "stoch_k":          round(stoch_k, 1) if stoch_k is not None else None,
            "stoch_d":          round(stoch_d, 1) if stoch_d is not None else None,
            "stoch_signal":     stoch_signal,
            "atr":              round(atr, 2),
            "atr_pct":          atr_pct,
            "obv_trend":        obv_trend,
            "roc":              round(roc_val, 2) if roc_val is not None else None,
            "vol_trend_signal": vol_trend_signal,
            "vol_ratio_5d":     vol_ratio_5d,
            "trend_structure":  trend_structure,
            "trend_bias":       trend_bias,
            "bollinger_upper":  round(bb_upper, 2),
            "bollinger_middle": round(bb_middle, 2),
            "bollinger_lower":  round(bb_lower, 2),
            "bollinger_position": bb_position,
            "sma_50":           round(sma50, 2)  if sma50  else None,
            "sma_200":          round(sma200, 2) if sma200 else None,
            "ma_trend":         ma_trend,
            "fib_levels":       fib_levels,
            "fib_context":      fib_context,
            "next_earnings":    next_earnings,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to calculate technicals for '{ticker}': {str(e)}")
