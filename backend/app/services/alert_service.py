import logging
import smtplib
import concurrent.futures
from collections import defaultdict
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import Alert
from app.models.user import User


CURRENCY_SYMBOLS: dict[str, str] = {
    "USD": "$",  "INR": "₹",  "GBP": "£",  "EUR": "€",
    "JPY": "¥",  "CNY": "¥",  "CAD": "C$", "AUD": "A$",
    "HKD": "HK$","SGD": "S$", "KRW": "₩",  "CHF": "Fr",
}

VALID_CONDITIONS = {"price_above", "price_below", "change_pct_above", "change_pct_below"}

CONDITION_LABELS = {
    "price_above":      "Price rises above",
    "price_below":      "Price drops below",
    "change_pct_above": "Daily change % exceeds",
    "change_pct_below": "Daily change % falls below",
}


# ─── CRUD ─────────────────────────────────────────────────────────────────────

def create_alert(user: User, ticker: str, condition: str, threshold: float, db: Session) -> Alert:
    if condition not in VALID_CONDITIONS:
        raise HTTPException(400, f"Invalid condition. Choose from: {', '.join(VALID_CONDITIONS)}")
    alert = Alert(user_id=user.id, ticker=ticker.upper(), condition=condition, threshold=threshold)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def get_user_alerts(user: User, db: Session) -> list[Alert]:
    return (
        db.query(Alert)
        .filter(Alert.user_id == user.id)
        .order_by(Alert.created_at.desc())
        .all()
    )


def delete_alert(alert_id: int, user: User, db: Session) -> None:
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alert not found.")
    db.delete(alert)
    db.commit()


# ─── Core checking logic ───────────────────────────────────────────────────────

def _evaluate_alerts(active_alerts: list[Alert], prices: dict) -> list[tuple[Alert, float, float, str]]:
    """Return (alert, current_price, change_pct, currency) for every alert that fired."""
    fired = []
    for alert in active_alerts:
        data = prices.get(alert.ticker)
        if not data:
            continue
        price    = data.get("price", 0)
        chg      = data.get("change_pct", 0) or 0
        currency = data.get("currency", "USD")
        if   alert.condition == "price_above"      and price >= alert.threshold: fired.append((alert, price, chg, currency))
        elif alert.condition == "price_below"      and price <= alert.threshold: fired.append((alert, price, chg, currency))
        elif alert.condition == "change_pct_above" and chg   >= alert.threshold: fired.append((alert, price, chg, currency))
        elif alert.condition == "change_pct_below" and chg   <= alert.threshold: fired.append((alert, price, chg, currency))
    return fired


def _build_message(alert: Alert, price: float, chg: float, currency: str = "USD") -> str:
    sym   = CURRENCY_SYMBOLS.get(currency, currency + " ")
    label = CONDITION_LABELS.get(alert.condition, alert.condition)
    if "pct" in alert.condition:
        return f"{alert.ticker} — {label} {alert.threshold}% · currently {chg:+.2f}%"
    return f"{alert.ticker} — {label} {sym}{alert.threshold} · currently {sym}{price:.2f}"


# ─── Enriched context (Claude + snapshot) ─────────────────────────────────────

def _get_enriched_context(ticker: str) -> dict | None:
    """Fetch full snapshot + Claude analysis. Returns None on any failure."""
    try:
        from app.services.ai_engine import analyze_ticker
        return analyze_ticker(ticker)
    except Exception:
        return None


# ─── HTML email builder ───────────────────────────────────────────────────────

def _hex_color(sentiment: str) -> str:
    return {"Bullish": "#22c55e", "Bearish": "#ef4444"}.get(sentiment, "#f59e0b")


def _ticker_section(ticker: str, messages: list[str], price: float, chg: float, ctx: dict | None, condition_raw: str, currency: str = "USD") -> str:
    sym = CURRENCY_SYMBOLS.get(currency, currency + " ")
    is_up    = "above" in condition_raw
    accent   = "#22c55e" if is_up else "#ef4444"
    hdr_bg   = "#052e16" if is_up else "#450a0a"
    emoji    = "🟢" if is_up else "🔴"
    chg_sign = "+" if chg >= 0 else ""
    chg_col  = "#22c55e" if chg >= 0 else "#ef4444"

    # AI analysis
    analysis   = (ctx or {}).get("analysis", {})
    sentiment  = analysis.get("sentiment", "")
    confidence = analysis.get("confidence", "")
    one_liner  = analysis.get("one_liner", "")
    s_col      = _hex_color(sentiment)

    # News
    news = ((ctx or {}).get("news", []) or [])[:2]
    news_rows = ""
    for a in news:
        title  = a.get("title", "")
        source = a.get("source", "")
        url    = a.get("url", "#")
        news_rows += (
            f'<tr><td style="padding:10px 0;border-bottom:1px solid #222;">'
            f'<a href="{url}" style="color:#cbd5e1;font-size:13px;text-decoration:none;line-height:1.5;">{title}</a>'
            f'<div style="color:#64748b;font-size:11px;margin-top:3px;">{source}</div>'
            f'</td></tr>'
        )

    # Technicals
    tech      = (ctx or {}).get("technicals", {}) or {}
    rsi       = tech.get("rsi")
    rsi_sig   = tech.get("rsi_signal", "")
    ma_trend  = tech.get("ma_trend", "")
    next_earn = tech.get("next_earnings")

    tech_cells = ""
    if rsi is not None:
        rc = "#ef4444" if rsi < 35 else "#22c55e" if rsi > 65 else "#f59e0b"
        tech_cells += (
            f'<td style="padding:4px 20px 4px 0;vertical-align:top;">'
            f'<div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;">RSI (14)</div>'
            f'<div style="color:{rc};font-size:20px;font-weight:700;">{rsi:.1f}</div>'
            f'<div style="color:#64748b;font-size:11px;">{rsi_sig}</div>'
            f'</td>'
        )
    if ma_trend:
        short     = ma_trend.split("—")[0].strip() if "—" in ma_trend else ma_trend
        ma_col    = "#22c55e" if "above" in ma_trend.lower() else "#ef4444"
        tech_cells += (
            f'<td style="padding:4px 20px 4px 0;vertical-align:top;">'
            f'<div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;">200-day MA</div>'
            f'<div style="color:{ma_col};font-size:15px;font-weight:600;">{short}</div>'
            f'</td>'
        )
    if next_earn:
        tech_cells += (
            f'<td style="padding:4px 0;vertical-align:top;">'
            f'<div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Next Earnings</div>'
            f'<div style="color:#f59e0b;font-size:15px;font-weight:600;">{next_earn}</div>'
            f'</td>'
        )

    bullets = "".join(
        f'<li style="color:#fef3c7;font-size:14px;padding:2px 0;">{m}</li>'
        for m in messages
    )

    sentiment_badge = (
        f'<td align="right" valign="middle">'
        f'<span style="background:{s_col}22;color:{s_col};padding:5px 14px;border-radius:20px;'
        f'font-size:12px;font-weight:700;border:1px solid {s_col}44;">{sentiment}</span>'
        f'<div style="color:#94a3b8;font-size:11px;text-align:right;margin-top:4px;">{confidence}% confidence</div>'
        f'</td>'
    ) if sentiment else ""

    ai_row = (
        f'<tr><td style="background:#0f1f35;padding:14px 22px;border-top:1px solid #1e3a5f;border-left:3px solid #3b82f6;">'
        f'<div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">AI Read</div>'
        f'<p style="margin:0;color:#cbd5e1;font-size:14px;font-style:italic;line-height:1.6;">&ldquo;{one_liner}&rdquo;</p>'
        f'</td></tr>'
    ) if one_liner else ""

    news_row = (
        f'<tr><td style="background:#161616;padding:14px 22px;border-top:1px solid #2a2a2a;">'
        f'<div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Latest News</div>'
        f'<table width="100%" cellpadding="0" cellspacing="0">{news_rows}</table>'
        f'</td></tr>'
    ) if news_rows else ""

    tech_row = (
        f'<tr><td style="background:#1a1a1a;padding:14px 22px;border-top:1px solid #2a2a2a;">'
        f'<div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Technical Signals</div>'
        f'<table cellpadding="0" cellspacing="0"><tr>{tech_cells}</tr></table>'
        f'</td></tr>'
    ) if tech_cells else ""

    return f"""
    <tr><td style="padding-bottom:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

      <!-- Header -->
      <tr><td style="background:{hdr_bg};padding:18px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Market Intelligence &middot; Alert</div>
            <div style="color:#fff;font-size:24px;font-weight:800;margin-top:4px;">{emoji} {ticker}</div>
          </td>
          {sentiment_badge}
        </tr></table>
      </td></tr>

      <!-- Price -->
      <tr><td style="background:#1a1a1a;padding:16px 22px;border-top:1px solid #2a2a2a;">
        <div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Current Price</div>
        <span style="color:#fff;font-size:32px;font-weight:800;">{sym}{price:.2f}</span>
        <span style="color:{chg_col};font-size:16px;font-weight:600;margin-left:10px;">{chg_sign}{chg:.2f}% today</span>
      </td></tr>

      <!-- What triggered -->
      <tr><td style="background:#161616;padding:14px 22px;border-top:1px solid #2a2a2a;">
        <div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">What Triggered</div>
        <ul style="margin:0;padding-left:18px;list-style:disc;">{bullets}</ul>
      </td></tr>

      {ai_row}
      {news_row}
      {tech_row}

      <!-- CTA -->
      <tr><td style="background:#0f0f0f;padding:18px 22px;border-top:1px solid #2a2a2a;border-radius:0 0 12px 12px;">
        <a href="http://localhost:5173/?ticker={ticker}"
           style="display:inline-block;background:#3b82f6;color:#fff;padding:11px 28px;border-radius:8px;
                  text-decoration:none;font-size:14px;font-weight:600;">
          Open Full Analysis &rarr;
        </a>
        <span style="color:#475569;font-size:11px;margin-left:16px;vertical-align:middle;">Auto-checked every 5 min</span>
      </td></tr>

    </table>
    </td></tr>"""


def _build_html(triggered: list[dict], enriched: dict) -> str:
    by_ticker: dict[str, list]  = defaultdict(list)
    price_map:  dict[str, float] = {}
    chg_map:    dict[str, float] = {}
    cond_map:   dict[str, str]   = {}
    curr_map:   dict[str, str]   = {}

    for t in triggered:
        tk = t["ticker"]
        by_ticker[tk].append(t["message"])
        price_map.setdefault(tk, t.get("current_price", 0))
        chg_map.setdefault(tk,   t.get("change_pct", 0))
        cond_map.setdefault(tk,  t.get("condition_raw", "price_below"))
        curr_map.setdefault(tk,  t.get("currency", "USD"))

    sections = "".join(
        _ticker_section(tk, msgs, price_map[tk], chg_map[tk], enriched.get(tk), cond_map[tk], curr_map[tk])
        for tk, msgs in by_ticker.items()
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="padding-bottom:16px;">
    <span style="color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Market Intelligence</span>
  </td></tr>

  {sections}

  <tr><td style="padding-top:8px;text-align:center;">
    <p style="color:#374151;font-size:11px;margin:0;line-height:1.8;">
      You received this because a price alert triggered on your account.<br>
      <a href="http://localhost:5173/alerts" style="color:#3b82f6;text-decoration:none;">Manage alerts</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _build_plain(triggered: list[dict]) -> str:
    lines = "\n".join(f"  • {t['message']}" for t in triggered)
    tickers = list(dict.fromkeys(t["ticker"] for t in triggered))  # preserve order, dedupe
    links   = "\n".join(f"  {tk}: http://localhost:5173/?ticker={tk}" for tk in tickers)
    return (
        f"Market Intelligence — Alert Triggered\n\n"
        f"{lines}\n\n"
        f"Open full analysis:\n{links}\n\n"
        f"Manage alerts: http://localhost:5173/alerts"
    )


def _build_subject(triggered: list[dict]) -> str:
    if len(triggered) == 1:
        t     = triggered[0]
        msg   = t["message"]
        core  = msg.split(" — ", 1)[1] if " — " in msg else msg
        emoji = "\U0001f7e2" if "rises" in msg or "exceeds" in msg else "\U0001f534"
        return f"{emoji} {t['ticker']} — {core}"
    tickers = list(dict.fromkeys(t["ticker"] for t in triggered))
    return f"\U0001f514 {len(triggered)} alerts triggered — {', '.join(tickers)}"


# ─── Email sender ─────────────────────────────────────────────────────────────

def send_alert_email(to_email: str, triggered: list[dict], enriched: dict | None = None) -> None:
    """Send enriched HTML alert email. Silently skips if email is not configured."""
    if not settings.EMAIL_FROM or not settings.EMAIL_PASSWORD:
        return
    try:
        enriched = enriched or {}
        msg = MIMEMultipart("alternative")
        msg["From"]    = settings.EMAIL_FROM
        msg["To"]      = to_email
        msg["Subject"] = _build_subject(triggered)
        msg.attach(MIMEText(_build_plain(triggered), "plain"))
        msg.attach(MIMEText(_build_html(triggered, enriched), "html"))  # html last = preferred

        with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT) as srv:
            srv.starttls()
            srv.login(settings.EMAIL_FROM, settings.EMAIL_PASSWORD)
            srv.send_message(msg)
    except Exception as e:
        log.error("Alert email failed to %s: %s", to_email, e)  # never crashes the app


# ─── On-demand check (user clicks "Check Now" or page loads) ──────────────────

def check_alerts(user: User, db: Session) -> list[dict]:
    from app.services.market_data import get_ticker_data

    active = (
        db.query(Alert)
        .filter(Alert.user_id == user.id, Alert.is_active == True)
        .all()
    )
    if not active:
        return []

    tickers = list({a.ticker for a in active})
    prices: dict = {}
    for t in tickers:
        try:
            prices[t] = get_ticker_data(t)
        except Exception:
            pass

    fired_rows = _evaluate_alerts(active, prices)
    result = []
    for alert, price, chg, currency in fired_rows:
        alert.triggered_at = datetime.now(timezone.utc)
        alert.is_active    = False
        result.append({
            "id":            alert.id,
            "ticker":        alert.ticker,
            "condition":     CONDITION_LABELS.get(alert.condition, alert.condition),
            "condition_raw": alert.condition,
            "threshold":     alert.threshold,
            "current_price": price,
            "change_pct":    chg,
            "currency":      currency,
            "message":       _build_message(alert, price, chg, currency),
        })
    db.commit()

    if result and settings.EMAIL_TO:
        triggered_tickers = list(dict.fromkeys(r["ticker"] for r in result))
        enriched: dict = {}
        for tk in triggered_tickers:
            enriched[tk] = _get_enriched_context(tk)
        send_alert_email(settings.EMAIL_TO, result, enriched)

    return result


# ─── Background job (runs every 5 min via APScheduler) ────────────────────────

def check_all_users_alerts() -> None:
    """
    Checks ALL users' active alerts in one pass, fetches prices in parallel,
    marks triggered alerts, enriches with Claude analysis, and emails each user.
    """
    from app.core.database import SessionLocal
    from app.services.market_data import get_ticker_data

    db = SessionLocal()
    try:
        active = db.query(Alert).filter(Alert.is_active == True).all()
        if not active:
            return

        # Parallel price fetch
        tickers = list({a.ticker for a in active})
        prices: dict = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(get_ticker_data, t): t for t in tickers}
            for future in concurrent.futures.as_completed(futures):
                t = futures[future]
                try:
                    prices[t] = future.result()
                except Exception:
                    pass

        fired_rows = _evaluate_alerts(active, prices)
        if not fired_rows:
            return

        # Mark triggered and group by user
        user_triggered: dict[int, list[dict]] = defaultdict(list)
        for alert, price, chg, currency in fired_rows:
            alert.triggered_at = datetime.now(timezone.utc)
            alert.is_active    = False
            user_triggered[alert.user_id].append({
                "ticker":        alert.ticker,
                "condition_raw": alert.condition,
                "current_price": price,
                "change_pct":    chg,
                "currency":      currency,
                "message":       _build_message(alert, price, chg, currency),
            })
        db.commit()

        # Parallel enrichment (Claude analysis) for each unique triggered ticker
        triggered_tickers = list(dict.fromkeys(
            item["ticker"]
            for items in user_triggered.values()
            for item in items
        ))
        enriched: dict[str, dict | None] = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            ctx_futures = {pool.submit(_get_enriched_context, t): t for t in triggered_tickers}
            for future in concurrent.futures.as_completed(ctx_futures):
                t = ctx_futures[future]
                try:
                    enriched[t] = future.result()
                except Exception:
                    enriched[t] = None

        # One email per user
        for user_id, msgs in user_triggered.items():
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.email:
                send_alert_email(user.email, msgs, enriched)

    except Exception:
        pass  # never let a background job crash the server
    finally:
        db.close()
