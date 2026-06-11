"""
AI Chat Service
================
Lets the user ask Claude follow-up questions after a ticker analysis.

The key insight: Claude already ran the analysis and has all the data.
Instead of re-fetching, we pass the original analysis back as context
so Claude can answer questions like:
  "Why is the RSI so low?"
  "What would make you change to bearish?"
  "Compare this to the broader market"
  "Should I buy here or wait for a pullback?"
"""

import anthropic
from fastapi import HTTPException

from app.core.config import settings


def chat(ticker: str, analysis_context: dict, messages: list[dict]) -> str:
    """
    analysis_context: the full response from /analyze — price, technicals,
                      market context, Claude's own analysis
    messages: conversation history [{role: "user"|"assistant", content: str}]
    """
    if not messages:
        raise HTTPException(400, "No message provided.")

    # Build a compact summary of the analysis context for Claude's memory
    analysis  = analysis_context.get("analysis", {})
    price     = analysis_context.get("price", {})
    tech      = analysis_context.get("technicals", {})
    ctx       = analysis_context.get("market_context", {})
    vix       = ctx.get("vix", {})
    fg        = ctx.get("fear_and_greed", {})

    context_block = f"""You previously analyzed {ticker} and produced this report:

PRICE: ${price.get('price')} ({price.get('change_pct')}% today)
SENTIMENT: {analysis.get('sentiment')} — {analysis.get('confidence')}% confidence
SUMMARY: {analysis.get('summary')}
KEY DRIVERS: {', '.join(analysis.get('key_drivers', []))}
TECHNICAL SIGNALS: {', '.join(analysis.get('technical_signals', []))}
MARKET SIGNALS: {', '.join(analysis.get('market_signals', []))}
RISK LEVEL: {analysis.get('risk_level')}
WATCH LEVELS: {', '.join(analysis.get('watch_levels', []))}
ONE-LINER: {analysis.get('one_liner')}

TECHNICALS: RSI {tech.get('rsi')} ({tech.get('rsi_signal')}) | MACD {tech.get('macd_signal')} | {tech.get('bollinger_position')} | {tech.get('ma_trend')}
VIX: {vix.get('value')} — {vix.get('level')}
FEAR & GREED: {fg.get('score')} — {fg.get('rating')}"""

    system_prompt = (
        f"You are a market analyst who just completed a research report on {ticker}. "
        "Answer the user's follow-up questions using the analysis context below. "
        "Be concise and specific. Use trader language. If the user asks something "
        "outside the analysis, draw on general market knowledge.\n\n"
        + context_block
    )

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text.strip()
    except Exception as e:
        raise HTTPException(500, f"Chat failed: {str(e)}")
