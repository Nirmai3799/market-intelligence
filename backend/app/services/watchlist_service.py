"""
Watchlist Service
==================
A watchlist is a saved list of tickers to monitor — like a shopping list for
stocks you're interested in but haven't bought yet.

get_watchlist_with_prices() fetches live prices for every ticker in parallel
so the whole list loads in one pass regardless of how many tickers there are.
"""

import concurrent.futures

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.watchlist import WatchlistItem


def add_to_watchlist(user: User, ticker: str, note: str | None, db: Session) -> WatchlistItem:
    ticker = ticker.upper().strip()

    # Prevent duplicates
    exists = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id, WatchlistItem.ticker == ticker)
        .first()
    )
    if exists:
        raise HTTPException(400, f"{ticker} is already in your watchlist.")

    item = WatchlistItem(user_id=user.id, ticker=ticker, note=note)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_watchlist(user: User, db: Session) -> list[WatchlistItem]:
    return (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id)
        .order_by(WatchlistItem.added_at.desc())
        .all()
    )


def remove_from_watchlist(item_id: int, user: User, db: Session) -> None:
    item = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(404, "Watchlist item not found.")
    db.delete(item)
    db.commit()


def get_watchlist_with_prices(user: User, db: Session) -> list[dict]:
    """
    Return watchlist items enriched with live price data.
    Fetches all tickers in parallel so 10 tickers takes the same time as 1.
    """
    from app.services.market_data import get_ticker_data

    items = get_watchlist(user, db)
    if not items:
        return []

    def fetch(item: WatchlistItem) -> dict:
        try:
            price_data = get_ticker_data(item.ticker)
        except Exception:
            price_data = {}

        return {
            "id":         item.id,
            "ticker":     item.ticker,
            "note":       item.note,
            "added_at":   item.added_at,
            "price":      price_data.get("price"),
            "change":     price_data.get("change"),
            "change_pct": price_data.get("change_pct"),
            "name":       price_data.get("name", item.ticker),
        }

    with concurrent.futures.ThreadPoolExecutor() as pool:
        return list(pool.map(fetch, items))
