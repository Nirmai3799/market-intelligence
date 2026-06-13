import yfinance as yf
from fastapi import HTTPException


def _pct(v) -> float | None:
    return round(v * 100, 2) if v is not None else None

def _r(v, decimals=2) -> float | None:
    return round(v, decimals) if v is not None else None


def get_fundamentals(ticker: str) -> dict:
    from app.services.market_data import resolve_ticker
    ticker = resolve_ticker(ticker.upper())

    try:
        info = yf.Ticker(ticker).info
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch fundamentals for {ticker}: {e}")

    if not info or not info.get("symbol"):
        raise HTTPException(404, f"No fundamental data found for {ticker}")

    currency = info.get("currency", "USD")

    # ── Valuation ─────────────────────────────────────────────────────────────
    pe_trailing = _r(info.get("trailingPE"))
    pe_forward  = _r(info.get("forwardPE"))
    pb_ratio    = _r(info.get("priceToBook"))
    ev_ebitda   = _r(info.get("enterpriseToEbitda"))
    peg_ratio   = _r(info.get("pegRatio"))
    ps_ratio    = _r(info.get("priceToSalesTrailing12Months"))

    # ── Growth & Profitability ─────────────────────────────────────────────────
    revenue         = info.get("totalRevenue")
    revenue_growth  = _pct(info.get("revenueGrowth"))
    earnings_growth = _pct(info.get("earningsGrowth"))
    gross_margin    = _pct(info.get("grossMargins"))
    operating_margin= _pct(info.get("operatingMargins"))
    net_margin      = _pct(info.get("profitMargins"))
    ebitda          = info.get("ebitda")
    free_cash_flow  = info.get("freeCashflow")

    # ── Returns ────────────────────────────────────────────────────────────────
    roe = _pct(info.get("returnOnEquity"))
    roa = _pct(info.get("returnOnAssets"))

    # ── Financial Health ───────────────────────────────────────────────────────
    debt_to_equity = _r(info.get("debtToEquity"))
    current_ratio  = _r(info.get("currentRatio"))
    quick_ratio    = _r(info.get("quickRatio"))

    # ── Per Share ──────────────────────────────────────────────────────────────
    eps_trailing = _r(info.get("trailingEps"))
    eps_forward  = _r(info.get("forwardEps"))
    book_value   = _r(info.get("bookValue"))
    beta         = _r(info.get("beta"))

    # ── Dividends ─────────────────────────────────────────────────────────────
    dividend_yield = _pct(info.get("dividendYield"))
    payout_ratio   = _pct(info.get("payoutRatio"))

    return {
        "ticker":   ticker,
        "currency": currency,
        # Valuation
        "pe_trailing":  pe_trailing,
        "pe_forward":   pe_forward,
        "pb_ratio":     pb_ratio,
        "ev_ebitda":    ev_ebitda,
        "peg_ratio":    peg_ratio,
        "ps_ratio":     ps_ratio,
        # Growth
        "revenue":          revenue,
        "revenue_growth":   revenue_growth,
        "earnings_growth":  earnings_growth,
        "ebitda":           ebitda,
        "free_cash_flow":   free_cash_flow,
        # Margins
        "gross_margin":     gross_margin,
        "operating_margin": operating_margin,
        "net_margin":       net_margin,
        # Returns
        "roe": roe,
        "roa": roa,
        # Health
        "debt_to_equity": debt_to_equity,
        "current_ratio":  current_ratio,
        "quick_ratio":    quick_ratio,
        # Per share
        "eps_trailing": eps_trailing,
        "eps_forward":  eps_forward,
        "book_value":   book_value,
        "beta":         beta,
        # Dividends
        "dividend_yield": dividend_yield,
        "payout_ratio":   payout_ratio,
    }
