from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.portfolio import AddHoldingRequest, HoldingResponse
from app.services.portfolio_service import (
    add_holding,
    delete_holding,
    get_holdings,
    get_portfolio_summary,
)

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.post("/holdings", response_model=HoldingResponse)
def add(
    body: AddHoldingRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Add or update a holding. If you already track this ticker, shares and price are updated."""
    return add_holding(user.id, body.ticker, body.shares, body.avg_buy_price, db)


@router.get("/holdings")
def list_holdings(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List all holdings for the logged-in user."""
    return get_holdings(user.id, db)


@router.delete("/holdings/{holding_id}")
def remove(
    holding_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Remove a holding by its ID."""
    delete_holding(user.id, holding_id, db)
    return {"message": f"Holding {holding_id} removed."}


@router.get("/summary")
def summary(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """
    Live portfolio summary — fetches current price for every holding
    and returns total value, cost basis, and real-time profit/loss.
    """
    return get_portfolio_summary(user.id, db)


@router.get("/ai-analysis")
def ai_analysis(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """
    Claude analyzes the entire portfolio — diversification, risk concentration,
    strongest/weakest positions, and specific recommendations.
    """
    from app.services.portfolio_ai import analyze_portfolio
    return analyze_portfolio(user, db)
