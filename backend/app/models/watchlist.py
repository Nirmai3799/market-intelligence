from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func
from app.core.database import Base


class WatchlistItem(Base):
    """One row = one ticker a user is watching."""
    __tablename__ = "watchlist"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker   = Column(String, nullable=False)
    note     = Column(String, nullable=True)   # optional personal note, e.g. "earnings play"
    added_at = Column(DateTime(timezone=True), server_default=func.now())
