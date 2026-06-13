"""
Synthesis Engine — Decision Framework
======================================
Combines fundamental + technical signals into a scored zone:
  Strong Buy | Buy | Hold/Watch | Avoid/Exit | Short

Each signal contributes a positive or negative score.
Total score → zone → action recommendation + ATR-based levels.
"""


def compute_synthesis(fundamentals: dict | None, technicals: dict, price: dict) -> dict:
    score            = 0
    bullish_signals  = []
    bearish_signals  = []

    current = price.get("price") if price else None
    sma50   = technicals.get("sma_50")
    sma200  = technicals.get("sma_200")
    atr     = technicals.get("atr")

    # ══ TECHNICAL SCORING ════════════════════════════════════════════════════

    # RSI
    rsi = technicals.get("rsi")
    if rsi is not None:
        if rsi < 30:
            score += 3
            bullish_signals.append(f"RSI {rsi:.0f} — deeply oversold, high-probability bounce zone")
        elif rsi < 40:
            score += 2
            bullish_signals.append(f"RSI {rsi:.0f} — oversold, value entry zone")
        elif rsi > 80:
            score -= 3
            bearish_signals.append(f"RSI {rsi:.0f} — extremely overbought, high reversal risk")
        elif rsi > 70:
            score -= 2
            bearish_signals.append(f"RSI {rsi:.0f} — overbought, pullback likely")

    # Price vs 200 DMA
    if current and sma200:
        pct_from_200 = (current - sma200) / sma200 * 100
        if current > sma200:
            score += 2
            bullish_signals.append(f"Price {pct_from_200:+.1f}% above 200 DMA — bull market structure")
        else:
            score -= 2
            bearish_signals.append(f"Price {abs(pct_from_200):.1f}% below 200 DMA — bear market structure")

    # Golden / Death Cross
    if sma50 and sma200:
        if sma50 > sma200:
            score += 1
            bullish_signals.append("Golden Cross — MA50 above MA200")
        else:
            score -= 1
            bearish_signals.append("Death Cross — MA50 below MA200")

    # MACD histogram
    macd_hist = technicals.get("macd_histogram")
    if macd_hist is not None:
        if macd_hist > 0:
            score += 1
            bullish_signals.append(f"MACD histogram positive ({macd_hist:+.4f})")
        else:
            score -= 1
            bearish_signals.append(f"MACD histogram negative ({macd_hist:+.4f})")

    # Trend structure (HH/HL or LH/LL)
    trend_bias = technicals.get("trend_bias", "Neutral")
    if trend_bias == "Bullish":
        score += 2
        bullish_signals.append(technicals.get("trend_structure", "Uptrend confirmed"))
    elif trend_bias == "Bearish":
        score -= 2
        bearish_signals.append(technicals.get("trend_structure", "Downtrend confirmed"))

    # Stochastic
    stoch_k = technicals.get("stoch_k")
    if stoch_k is not None:
        if stoch_k < 20:
            score += 1
            bullish_signals.append(f"Stochastic %K {stoch_k:.0f} — oversold")
        elif stoch_k > 80:
            score -= 1
            bearish_signals.append(f"Stochastic %K {stoch_k:.0f} — overbought")

    # OBV trend
    obv_trend = technicals.get("obv_trend")
    if obv_trend == "Rising":
        score += 1
        bullish_signals.append("OBV rising — smart money accumulating")
    elif obv_trend == "Falling":
        score -= 1
        bearish_signals.append("OBV falling — distribution detected")

    # Volume trend
    vol_signal = technicals.get("vol_trend_signal", "")
    if "Strong" in vol_signal:
        score += 1
        bullish_signals.append("Rising price confirmed by rising volume")
    elif "Distribution" in vol_signal:
        score -= 1
        bearish_signals.append("Falling price with rising volume — distribution")
    elif "suspect" in vol_signal.lower() or "Weak" in vol_signal:
        score -= 1
        bearish_signals.append("Rising price on declining volume — suspect move")

    # ══ FUNDAMENTAL SCORING ══════════════════════════════════════════════════

    if fundamentals:
        rev_growth = fundamentals.get("revenue_growth")
        if rev_growth is not None:
            if rev_growth > 15:
                score += 2
                bullish_signals.append(f"Revenue growing {rev_growth:.1f}% YoY — strong momentum")
            elif rev_growth > 0:
                score += 1
                bullish_signals.append(f"Positive revenue growth {rev_growth:.1f}% YoY")
            else:
                score -= 2
                bearish_signals.append(f"Revenue declining {rev_growth:.1f}% — business shrinking")

        net_margin = fundamentals.get("net_margin")
        if net_margin is not None:
            if net_margin > 15:
                score += 1
                bullish_signals.append(f"Net margin {net_margin:.1f}% — highly profitable")
            elif net_margin < 0:
                score -= 2
                bearish_signals.append(f"Negative net margin {net_margin:.1f}% — unprofitable")

        roe = fundamentals.get("roe")
        if roe is not None:
            if roe > 15:
                score += 1
                bullish_signals.append(f"ROE {roe:.1f}% — efficient capital deployment")
            elif roe < 0:
                score -= 1
                bearish_signals.append(f"Negative ROE {roe:.1f}%")

        d_e = fundamentals.get("debt_to_equity")
        if d_e is not None:
            if d_e < 50:
                score += 1
                bullish_signals.append(f"Low D/E {d_e:.0f}% — healthy balance sheet")
            elif d_e > 200:
                score -= 1
                bearish_signals.append(f"High D/E {d_e:.0f}% — leveraged risk")

        fcf = fundamentals.get("free_cash_flow")
        if fcf is not None:
            if fcf > 0:
                score += 1
                bullish_signals.append("Positive FCF — cash-generative business")
            else:
                score -= 1
                bearish_signals.append("Negative FCF — burning cash")

        peg = fundamentals.get("peg_ratio")
        if peg is not None and peg > 0:
            if peg < 1:
                score += 2
                bullish_signals.append(f"PEG {peg:.2f} — undervalued relative to growth rate")
            elif peg > 3:
                score -= 1
                bearish_signals.append(f"PEG {peg:.2f} — expensive vs growth")

        ic = fundamentals.get("interest_coverage")
        if ic is not None:
            if ic > 3:
                score += 1
                bullish_signals.append(f"Interest coverage {ic:.1f}× — debt comfortably serviced")
            elif ic < 1.5:
                score -= 1
                bearish_signals.append(f"Interest coverage {ic:.1f}× — debt service risk")

    # ══ ZONE CLASSIFICATION ═══════════════════════════════════════════════════

    if score >= 8:
        zone       = "Strong Buy"
        zone_color = "green"
        action     = "Enter with full position — all signals aligned"
    elif score >= 4:
        zone       = "Buy"
        zone_color = "green"
        action     = "Enter with 50–75% position, scale in on dips"
    elif score >= -3:
        zone       = "Hold / Watch"
        zone_color = "yellow"
        action     = "Mixed signals — wait for a clearer entry trigger"
    elif score >= -7:
        zone       = "Avoid / Exit"
        zone_color = "red"
        action     = "Stay out or reduce existing position"
    else:
        zone       = "Short"
        zone_color = "red"
        action     = "Short or buy puts if you have conviction"

    # ══ ATR-BASED LEVELS ══════════════════════════════════════════════════════

    stop_loss = target_1 = target_2 = rr_ratio = None
    if current and atr:
        stop_loss = round(current - 2 * atr, 2)
        target_1  = round(current + 2 * atr, 2)   # 1:1
        target_2  = round(current + 4 * atr, 2)   # 1:2
        risk      = current - stop_loss
        if risk > 0:
            rr_ratio = round((target_2 - current) / risk, 1)

    # ══ NON-NEGOTIABLE RULES CHECK ════════════════════════════════════════════

    rules = []

    # Rule 1 — Trend first
    if current and sma200:
        if current > sma200:
            rules.append({"rule": "Trend alignment", "pass": True,
                          "note": "Price above 200 DMA — trading with the trend"})
        else:
            rules.append({"rule": "Fighting the trend", "pass": False,
                          "note": "Price below 200 DMA — primary trend is bearish"})

    # Rule 2 — Stop-loss defined
    if atr and current:
        rules.append({"rule": "Stop-loss defined", "pass": True,
                      "note": f"ATR = {round(atr, 2)} — suggested stop at 2× ATR ({stop_loss})"})
    elif not atr:
        rules.append({"rule": "Stop-loss defined", "pass": False,
                      "note": "ATR unavailable — cannot compute ATR-based stop"})

    # Rule 3 — Risk:Reward ≥ 1:2
    if rr_ratio is not None:
        rules.append({"rule": "Risk:Reward ≥ 1:2", "pass": rr_ratio >= 2,
                      "note": f"ATR-based R:R = 1:{rr_ratio}"})

    # Rule 4 — Volume confirmation
    if vol_signal and vol_signal != "Neutral":
        if "Strong" in vol_signal:
            rules.append({"rule": "Volume confirmation", "pass": True, "note": vol_signal})
        else:
            rules.append({"rule": "Volume confirmation", "pass": False, "note": vol_signal})

    bull_out = bullish_signals[:6]
    if len(bullish_signals) > 6:
        bull_out.append(f"…and {len(bullish_signals) - 6} more bullish signal(s)")
    bear_out = bearish_signals[:6]
    if len(bearish_signals) > 6:
        bear_out.append(f"…and {len(bearish_signals) - 6} more bearish signal(s)")

    return {
        "score":           score,
        "zone":            zone,
        "zone_color":      zone_color,
        "action":          action,
        "bullish_signals": bull_out,
        "bearish_signals": bear_out,
        "stop_loss":       stop_loss,
        "target_1":        target_1,
        "target_2":        target_2,
        "rr_ratio":        rr_ratio,
        "rules":           rules,
    }
