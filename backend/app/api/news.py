from fastapi import APIRouter, Query
from app.services.news_service import get_ticker_news

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/{ticker}")
def get_news(
    ticker: str,
    limit: int = Query(default=10, ge=1, le=50, description="Number of articles to return"),
):
    """
    Get the latest news headlines for any stock or ETF.

    Examples:
      /news/AAPL        → Latest Apple news
      /news/QQQ         → Latest QQQ / Nasdaq news
      /news/NVDA?limit=5 → Only 5 articles
    """
    articles = get_ticker_news(ticker.upper(), limit=limit)
    return {
        "ticker": ticker.upper(),
        "count": len(articles),
        "articles": articles,
    }
