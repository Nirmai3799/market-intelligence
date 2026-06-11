from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.watchlist import AddWatchlistRequest, WatchlistResponse
from app.services import watchlist_service

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("")
def get_watchlist(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Return watchlist with live prices for all saved tickers."""
    return watchlist_service.get_watchlist_with_prices(user, db)


@router.post("", response_model=WatchlistResponse)
def add_to_watchlist(
    body: AddWatchlistRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return watchlist_service.add_to_watchlist(user, body.ticker, body.note, db)


@router.delete("/{item_id}")
def remove_from_watchlist(
    item_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    watchlist_service.remove_from_watchlist(item_id, user, db)
    return {"message": "Removed from watchlist."}
