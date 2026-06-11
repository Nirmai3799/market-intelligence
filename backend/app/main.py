from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.api import (
    prices, news, snapshot, analysis, auth, portfolio,
    technicals, market, youtube, alerts, analyst, watchlist,
    chart, economic, screener, compare, chat,
)
from app.services.alert_service import check_all_users_alerts

# ─── Background scheduler ─────────────────────────────────────────────────────
scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(check_all_users_alerts, "interval", minutes=5, id="alert_checker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    print("✓ Alert checker started — running every 5 minutes")
    yield
    scheduler.shutdown(wait=False)


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Market Intelligence API",
    version="0.3.0",
    description="AI-powered market research assistant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prices.router)
app.include_router(news.router)
app.include_router(snapshot.router)
app.include_router(analysis.router)
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(technicals.router)
app.include_router(market.router)
app.include_router(youtube.router)
app.include_router(alerts.router)
app.include_router(analyst.router)
app.include_router(watchlist.router)
app.include_router(chart.router)
app.include_router(economic.router)
app.include_router(screener.router)
app.include_router(compare.router)
app.include_router(chat.router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "environment": settings.APP_ENV,
        "alert_checker": "running every 5 min",
        "email_configured": bool(settings.EMAIL_FROM and settings.EMAIL_PASSWORD),
        "database_configured": bool(settings.DATABASE_URL),
        "ai_configured": bool(settings.ANTHROPIC_API_KEY),
    }
