from fastapi import APIRouter
from app.services.economic_calendar import get_economic_calendar

router = APIRouter(prefix="/economic", tags=["economic"])


@router.get("/calendar")
def economic_calendar(days: int = 14):
    """Upcoming US economic events — Fed, CPI, jobs report, etc."""
    return get_economic_calendar(days_ahead=days)
