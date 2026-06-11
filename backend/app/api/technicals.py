from fastapi import APIRouter
from app.services.technical_analysis import get_technicals

router = APIRouter(prefix="/technicals", tags=["technicals"])


@router.get("/{ticker}")
def technicals(ticker: str):
    """RSI, MACD, Bollinger Bands, moving averages, and next earnings date."""
    return get_technicals(ticker.upper())
