import concurrent.futures
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.portfolio import Holding
from app.services.market_data import get_ticker_data


def add_holding(user_id: int, ticker: str, shares: float, avg_buy_price: float, db: Session) -> Holding:
    ticker = ticker.upper()
    existing = db.query(Holding).filter(
        Holding.user_id == user_id, Holding.ticker == ticker
    ).first()

    if existing:
        existing.shares = shares
        existing.avg_buy_price = avg_buy_price
        db.commit()
        db.refresh(existing)
        return existing

    holding = Holding(user_id=user_id, ticker=ticker, shares=shares, avg_buy_price=avg_buy_price)
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


def get_holdings(user_id: int, db: Session) -> list:
    return db.query(Holding).filter(Holding.user_id == user_id).all()


def delete_holding(user_id: int, holding_id: int, db: Session) -> None:
    holding = db.query(Holding).filter(
        Holding.id == holding_id, Holding.user_id == user_id
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found.")
    db.delete(holding)
    db.commit()


def get_portfolio_summary(user_id: int, db: Session) -> dict:
    holdings = get_holdings(user_id, db)

    if not holdings:
        return {
            "holdings": [],
            "total_invested": 0,
            "total_current_value": 0,
            "total_gain_loss": 0,
            "total_gain_loss_pct": 0,
        }

    # Fetch all prices in parallel — was sequential before (N × 1s), now takes ~1s total
    def fetch(h: Holding) -> tuple:
        try:
            return h, get_ticker_data(h.ticker)
        except Exception:
            return h, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(fetch, holdings))

    rows = []
    total_invested = 0.0
    total_current_value = 0.0

    for h, price_data in results:
        if price_data:
            current_price = price_data["price"]
            change_pct_today = price_data.get("change_pct", 0) or 0
            sector = price_data.get("sector")
        else:
            current_price = h.avg_buy_price
            change_pct_today = 0
            sector = None

        cost_basis = h.shares * h.avg_buy_price
        current_value = h.shares * current_price
        gain_loss = current_value - cost_basis
        gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis else 0

        total_invested += cost_basis
        total_current_value += current_value

        rows.append({
            "id": h.id,
            "ticker": h.ticker,
            "shares": h.shares,
            "avg_buy_price": h.avg_buy_price,
            "current_price": current_price,
            "cost_basis": round(cost_basis, 2),
            "current_value": round(current_value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2),
            "change_today_pct": change_pct_today,
            "sector": sector,
        })

    total_gain_loss = total_current_value - total_invested
    total_gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested else 0

    return {
        "holdings": rows,
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current_value, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "total_gain_loss_pct": round(total_gain_loss_pct, 2),
    }
