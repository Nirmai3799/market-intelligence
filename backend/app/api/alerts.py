from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.alert import CreateAlertRequest, AlertResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Return all alerts for the logged-in user."""
    return alert_service.get_user_alerts(user, db)


@router.post("", response_model=AlertResponse)
def create_alert(
    body: CreateAlertRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Create a new price alert."""
    return alert_service.create_alert(user, body.ticker, body.condition, body.threshold, db)


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Delete an alert."""
    alert_service.delete_alert(alert_id, user, db)
    return {"message": "Alert deleted."}


@router.get("/check")
def check_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """
    Check all active alerts against live prices right now.
    Returns only the ones that have fired.
    """
    triggered = alert_service.check_alerts(user, db)
    return {"triggered": triggered, "count": len(triggered)}
