from fastapi import APIRouter
from app.services.snapshot_service import get_snapshot

router = APIRouter(prefix="/snapshot", tags=["Snapshot"])


@router.get("/{ticker}")
def get_ticker_snapshot(ticker: str):
    """
    Full market snapshot: price + signals + news in one call.
    This is what the AI engine will consume to generate analysis.

    Examples:
      /snapshot/AAPL
      /snapshot/QQQ
      /snapshot/NVDA
    """
    return get_snapshot(ticker)
