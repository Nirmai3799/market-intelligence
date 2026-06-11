from pydantic import BaseModel


class AddHoldingRequest(BaseModel):
    ticker: str
    shares: float
    avg_buy_price: float


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    shares: float
    avg_buy_price: float
