from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AddWatchlistRequest(BaseModel):
    ticker: str
    note: Optional[str] = None


class WatchlistResponse(BaseModel):
    id: int
    ticker: str
    note: Optional[str]
    added_at: datetime

    class Config:
        from_attributes = True
