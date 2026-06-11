from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    ticker: str
    analysis_context: dict
    messages: list[dict]   # [{role: "user"|"assistant", content: str}]


@router.post("")
def chat(body: ChatRequest):
    """AI chat follow-up on a ticker analysis."""
    from app.services.chat_service import chat as run_chat
    reply = run_chat(body.ticker, body.analysis_context, body.messages)
    return {"reply": reply}
