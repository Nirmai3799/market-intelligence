from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateAlertRequest(BaseModel):
    ticker: str
    condition: str       # "price_above" | "price_below" | "change_pct_above" | "change_pct_below"
    threshold: float


class AlertResponse(BaseModel):
    id: int
    ticker: str
    condition: str
    threshold: float
    is_active: bool
    triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
