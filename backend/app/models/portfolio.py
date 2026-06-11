from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func
from app.core.database import Base


class Holding(Base):
    """One row = one ticker a user owns."""
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)        # e.g. "QQQ", "AAPL"
    shares = Column(Float, nullable=False)         # e.g. 10.5
    avg_buy_price = Column(Float, nullable=False)  # e.g. 430.00
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
