from fastapi import APIRouter
from app.services.fundamental_service import get_fundamentals

router = APIRouter(prefix="/fundamentals", tags=["fundamentals"])


@router.get("/{ticker}")
def fundamentals(ticker: str):
    """
    Returns valuation ratios, margins, returns, financial health,
    and per-share metrics for a ticker (from yfinance).
    """
    return get_fundamentals(ticker.upper())
