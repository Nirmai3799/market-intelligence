from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.youtube_service import get_youtube_insights, summarize_video, get_market_pulse

router = APIRouter(prefix="/youtube", tags=["youtube"])


class SummarizeRequest(BaseModel):
    url: str


# Specific routes MUST come before /{ticker} to avoid being swallowed by it

@router.post("/summarize")
def summarize_youtube(body: SummarizeRequest):
    result = summarize_video(body.url)
    if "error" in result and len(result) == 1:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/market-pulse")
def market_pulse():
    return get_market_pulse()


@router.get("/{ticker}")
def youtube_insights(ticker: str, max_videos: int = 3):
    return {"ticker": ticker.upper(), "videos": get_youtube_insights(ticker.upper(), max_videos)}
