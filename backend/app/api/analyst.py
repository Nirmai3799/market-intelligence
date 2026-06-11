from fastapi import APIRouter
from app.services.analyst_data import get_analyst_data

router = APIRouter(prefix="/analyst", tags=["analyst"])


@router.get("/{ticker}")
def analyst_intelligence(ticker: str):
    """
    Returns all analyst intelligence for a ticker:
    ratings consensus, price targets, earnings beat/miss history,
    insider transactions, and short interest.
    """
    return get_analyst_data(ticker.upper())
