import json
import re
import anthropic
from fastapi import HTTPException
from app.core.config import settings


def build_prompt(snapshot: dict) -> str:
    """
    Build the enhanced Claude prompt from a full snapshot.
    Includes price, technicals, market context, and news.
    """
    price = snapshot["price"]
    signals = snapshot["signals"]
    news = snapshot["news"]
    tech = snapshot.get("technicals", {})
    ctx = snapshot.get("market_context", {})

    headlines = "\n".join(
        f"- {a['title']} ({a['source']})" for a in news
    ) or "No recent headlines available."

    vol = price.get("volume")
    avg_vol = price.get("avg_volume")
    mktcap = price.get("market_cap")

    vix = ctx.get("vix", {})
    fg = ctx.get("fear_and_greed", {})
    sectors = ctx.get("sectors", [])
    best_sector = sectors[0] if sectors else None
    worst_sector = sectors[-1] if sectors else None

    next_earnings = tech.get("next_earnings")
    earnings_line = f"Next Earnings: {next_earnings}" if next_earnings else "Next Earnings: Not available"

    fg_line = (
        f"{fg.get('score')}/100 — {fg.get('rating')}"
        if fg.get("score") is not None
        else "Unavailable"
    )
    vix_value = vix.get("value")
    vix_line = f"{vix_value} — {vix.get('level')}" if vix_value is not None else "Unavailable"

    return f"""You are a professional market analyst. Analyze the comprehensive data below and return ONLY a JSON object — no markdown, no extra text.

═══ TICKER ═══
{snapshot['ticker']} — {price.get('name', snapshot['ticker'])}

═══ PRICE ACTION ═══
Current Price:   ${price.get('price')}
Change Today:    ${price.get('change')} ({price.get('change_pct')}%)
Day Range:       ${price.get('day_low')} – ${price.get('day_high')}
Previous Close:  ${price.get('previous_close')}
52-Week Range:   ${price.get('week_52_low')} – ${price.get('week_52_high')}
Volume:          {f"{vol:,}" if vol else "N/A"} (avg {f"{avg_vol:,}" if avg_vol else "N/A"})
Volume Signal:   {signals.get('volume_signal')} ({signals.get('volume_ratio')}x average)
Market Cap:      ${f"{mktcap:,}" if mktcap else "N/A"}
{earnings_line}

═══ TECHNICAL INDICATORS ═══
RSI (14):        {tech.get('rsi')} → {tech.get('rsi_signal')}
MACD:            {tech.get('macd_signal')} (histogram: {tech.get('macd_histogram')})
Bollinger Bands: {tech.get('bollinger_position')}
  Upper: ${tech.get('bollinger_upper')}  |  Middle: ${tech.get('bollinger_middle')}  |  Lower: ${tech.get('bollinger_lower')}
50-Day MA:       ${tech.get('sma_50')}
200-Day MA:      ${tech.get('sma_200')}
Long-term Trend: {tech.get('ma_trend')}

═══ MARKET CONTEXT ═══
VIX:             {vix_line}
Fear & Greed:    {fg_line}
Best Sector:     {f"{best_sector['sector']} ({best_sector['change_pct']:+.2f}%)" if best_sector else "N/A"}
Worst Sector:    {f"{worst_sector['sector']} ({worst_sector['change_pct']:+.2f}%)" if worst_sector else "N/A"}

═══ LATEST NEWS ═══
{headlines}

Return ONLY this JSON (no markdown fences):
{{
  "sentiment": "Bullish" or "Neutral" or "Bearish",
  "confidence": <integer 0-100>,
  "summary": "<3-4 sentences: what is happening, why, and what the technicals confirm or contradict>",
  "key_drivers": ["<driver 1>", "<driver 2>", "<driver 3>"],
  "technical_signals": ["<RSI insight>", "<MACD insight>", "<Bollinger insight>", "<MA trend insight>"],
  "market_signals": ["<VIX context>", "<Fear & Greed context>", "<sector rotation note>"],
  "risk_level": "Low" or "Medium" or "High",
  "watch_levels": ["<key price level 1>", "<key price level 2>", "<key price level 3>"],
  "one_liner": "<single actionable sentence for a trader right now>"
}}"""


def analyze_ticker(ticker: str) -> dict:
    """Fetch full snapshot and send to Claude for analysis."""
    from app.services.snapshot_service import get_snapshot

    snapshot = get_snapshot(ticker.upper())
    prompt = build_prompt(snapshot)

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()

        # Extract JSON even if Claude wraps it in markdown code fences
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise json.JSONDecodeError("No JSON object found", raw, 0)
        analysis = json.loads(match.group())

    except json.JSONDecodeError:
        raise HTTPException(500, "Claude returned unexpected output. Try again.")
    except Exception as e:
        raise HTTPException(500, f"AI analysis failed: {str(e)}")

    tech = snapshot.get("technicals", {})
    ctx = snapshot.get("market_context", {})

    return {
        "ticker": ticker.upper(),
        "analysis": analysis,
        "price": snapshot["price"],
        "technicals": tech,
        "market_context": ctx,
        "news": snapshot.get("news", []),
        "signals": snapshot.get("signals", {}),
    }
