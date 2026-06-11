from fastapi import APIRouter
from app.services.chart_service import get_chart_data

router = APIRouter(prefix="/chart", tags=["chart"])


@router.get("/{ticker}")
def chart(ticker: str, period: str = "3mo"):
    """OHLCV + SMA20 historical data. period: 1mo | 3mo | 6mo | 1y"""
    return get_chart_data(ticker.upper(), period)
