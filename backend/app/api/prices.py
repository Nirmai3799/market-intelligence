from fastapi import APIRouter
from app.services.market_data import get_ticker_data

router = APIRouter(prefix="/prices", tags=["Market Data"])


@router.get("/{ticker}")
def get_price(ticker: str):
    """
    Get live price and market data for any stock or ETF.

    Examples:
      /prices/QQQ   → Invesco QQQ ETF
      /prices/AAPL  → Apple Inc.
      /prices/SPY   → S&P 500 ETF
    """
    return get_ticker_data(ticker)
