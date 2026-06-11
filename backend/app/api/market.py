from fastapi import APIRouter
from app.services.market_context import get_market_context

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/context")
def market_context():
    """VIX, Fear & Greed Index, and sector ETF performance."""
    return get_market_context()
