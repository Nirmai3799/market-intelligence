"""
Chart Service
=============
Returns historical OHLCV (Open/High/Low/Close/Volume) price data so the
frontend can draw a candlestick or line chart.

We also compute a simple 20-day moving average so the chart can overlay it
as a reference line — traders use this to see whether the stock is trending
above or below its recent average.
"""

import yfinance as yf
from fastapi import HTTPException


VALID_PERIODS = {"1mo", "3mo", "6mo", "1y"}


def get_chart_data(ticker: str, period: str = "3mo") -> list:
    if period not in VALID_PERIODS:
        period = "3mo"

    try:
        hist = yf.Ticker(ticker.upper()).history(period=period)
        if hist.empty:
            raise HTTPException(404, f"No chart data found for '{ticker}'")

        close = hist["Close"]
        sma20 = close.rolling(20).mean()

        result = []
        for i, (date, row) in enumerate(hist.iterrows()):
            ma_val = sma20.iloc[i]
            result.append({
                "date":   date.strftime("%b %d"),
                "open":   round(float(row["Open"]),   2),
                "high":   round(float(row["High"]),   2),
                "low":    round(float(row["Low"]),    2),
                "close":  round(float(row["Close"]),  2),
                "volume": int(row["Volume"]),
                "sma20":  round(float(ma_val), 2) if not __import__("math").isnan(ma_val) else None,
            })

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Chart data failed for '{ticker}': {str(e)}")
