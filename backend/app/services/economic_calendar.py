"""
Economic Calendar
==================
Fetches upcoming US macroeconomic events from Finnhub.

Why this matters for traders:
  - Fed rate decisions move the ENTIRE market
  - CPI (inflation data) drives bond yields, which drive tech stocks
  - Non-Farm Payrolls (jobs report) signals economic health
  - GDP, retail sales, PMI — all move indices by 1-3% on release day

A trader who doesn't know CPI is releasing tomorrow is flying blind.
"""

import json
import urllib.request
from datetime import datetime, timedelta

from app.core.config import settings

# Events worth highlighting — the ones that actually move markets
HIGH_IMPACT_KEYWORDS = {
    "federal", "fed", "fomc", "rate decision",
    "cpi", "inflation", "pce",
    "nonfarm", "non-farm", "payroll", "unemployment", "jobs",
    "gdp", "gross domestic",
    "retail sales",
    "pmi", "ism",
    "treasury", "debt ceiling",
}


def _is_high_impact(event_name: str) -> bool:
    name = event_name.lower()
    return any(kw in name for kw in HIGH_IMPACT_KEYWORDS)


def get_economic_calendar(days_ahead: int = 14) -> list:
    today  = datetime.now()
    end    = today + timedelta(days=days_ahead)
    from_d = today.strftime("%Y-%m-%d")
    to_d   = end.strftime("%Y-%m-%d")

    try:
        url = (
            f"https://finnhub.io/api/v1/calendar/economic"
            f"?from={from_d}&to={to_d}&token={settings.FINNHUB_API_KEY}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = json.loads(resp.read())
    except Exception:
        return []

    events = raw.get("economicCalendar") or []
    results = []

    for e in events:
        if e.get("country") != "US":
            continue

        name   = e.get("event", "")
        impact = e.get("impact", "low")
        ts     = e.get("time", "")

        # Promote events with market-moving keywords to high impact
        if _is_high_impact(name) and impact != "high":
            impact = "high"

        results.append({
            "event":    name,
            "date":     ts[:10] if ts else "",
            "impact":   impact,
            "actual":   e.get("actual"),
            "estimate": e.get("estimate"),
            "previous": e.get("prev"),
            "unit":     e.get("unit", ""),
        })

    # Sort: date ascending, high impact first within same day
    order = {"high": 0, "medium": 1, "low": 2}
    results.sort(key=lambda x: (x["date"], order.get(x["impact"], 3)))

    return results
