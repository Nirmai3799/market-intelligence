from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func
from app.core.database import Base


class Alert(Base):
    """One row = one alert rule a user set up."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)           # e.g. "QQQ"
    condition = Column(String, nullable=False)        # "price_above", "price_below", "volume_spike"
    threshold = Column(Float, nullable=True)          # e.g. 450.00
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
