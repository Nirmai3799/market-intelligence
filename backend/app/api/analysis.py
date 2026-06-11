from fastapi import APIRouter
from app.services.ai_engine import analyze_ticker

router = APIRouter(prefix="/analyze", tags=["AI Analysis"])


@router.get("/{ticker}")
def get_analysis(ticker: str):
    """
    Ask Claude to analyze a stock or ETF using live price + news data.

    Examples:
      /analyze/AAPL   → Apple AI analysis
      /analyze/QQQ    → Nasdaq ETF analysis
      /analyze/NVDA   → Nvidia analysis
    """
    return analyze_ticker(ticker)
