"""
Portfolio AI Analysis
======================
Reads the user's entire portfolio and sends it to Claude for a holistic review.
A single stock analysis can miss risks that only appear when you look at the whole
picture — concentration in one sector, too many correlated positions, P&L skewed
by one winner, etc.
"""

import json
import re

import anthropic
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User


def analyze_portfolio(user: User, db: Session) -> dict:
    from app.services.portfolio_service import get_portfolio_summary

    summary = get_portfolio_summary(user.id, db)

    if not summary["holdings"]:
        raise HTTPException(400, "No holdings to analyze. Add positions to your portfolio first.")

    holdings = summary["holdings"]

    # Build a readable text block for each position
    lines = []
    for h in holdings:
        gl_sign = "+" if h["gain_loss"] >= 0 else ""
        today_sign = "+" if h["change_today_pct"] >= 0 else ""
        pct = h["gain_loss_pct"]
        lines.append(
            f"  {h['ticker']}: {h['shares']} shares | avg cost ${h['avg_buy_price']} | "
            f"now ${h['current_price']} | value ${h['current_value']:,.0f} | "
            f"P&L {gl_sign}${h['gain_loss']:,.0f} ({gl_sign}{pct:.1f}%) | "
            f"today {today_sign}{h['change_today_pct']:.2f}%"
        )

    holdings_text = "\n".join(lines)

    total_sign = "+" if summary["total_gain_loss"] >= 0 else ""
    total_pct  = summary["total_gain_loss_pct"]

    prompt = f"""You are a portfolio risk analyst. Review this investment portfolio and return ONLY a JSON object — no markdown.

PORTFOLIO SUMMARY:
  Total Invested:  ${summary['total_invested']:,.0f}
  Current Value:   ${summary['total_current_value']:,.0f}
  Total P&L:       {total_sign}${summary['total_gain_loss']:,.0f} ({total_sign}{total_pct:.1f}%)
  Number of positions: {len(holdings)}

POSITIONS:
{holdings_text}

Return ONLY this JSON:
{{
  "overall_health": "Strong" or "Moderate" or "Weak",
  "health_reason": "<one sentence explaining the health rating>",
  "summary": "<2-3 sentences on the portfolio's overall condition right now>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "largest_risk": "<the single biggest risk in this portfolio right now>",
  "recommendations": ["<specific actionable recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "diversification_score": <1 to 10>,
  "diversification_note": "<one sentence on concentration or sector exposure>",
  "one_liner": "<the one thing this investor should do or watch right now>"
}}"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found")
        analysis = json.loads(match.group())
    except Exception as e:
        raise HTTPException(500, f"Portfolio AI analysis failed: {str(e)}")

    return {
        "analysis": analysis,
        "portfolio": summary,
    }
