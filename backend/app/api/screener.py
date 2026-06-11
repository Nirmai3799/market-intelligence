from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.api.dependencies import current_user
from app.core.database import get_db
from app.models.user import User
from app.services import screener_service

router = APIRouter(prefix="/screener", tags=["screener"])


class ScreenerRequest(BaseModel):
    rsi_max:      Optional[float] = None
    rsi_min:      Optional[float] = None
    macd_signal:  Optional[str]   = None   # "bullish" | "bearish"
    above_200ma:  Optional[bool]  = None
    below_200ma:  Optional[bool]  = None
    change_min:   Optional[float] = None
    change_max:   Optional[float] = None
    mode:         str = "universe"          # "universe" | "watchlist"


@router.post("/scan")
def scan(
    body: ScreenerRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """
    Scan tickers matching the given criteria.
    mode='universe' scans 40 major tickers.
    mode='watchlist' scans only the user's saved watchlist.
    """
    if body.mode == "watchlist":
        from app.services.watchlist_service import get_watchlist
        items = get_watchlist(user, db)
        tickers = [i.ticker for i in items]
        if not tickers:
            return {"results": [], "scanned": 0, "matched": 0}
    else:
        tickers = screener_service.UNIVERSE

    criteria = body.model_dump(exclude={"mode"})
    results  = screener_service.scan(criteria, tickers)

    return {
        "results": results,
        "scanned": len(tickers),
        "matched": len(results),
    }
