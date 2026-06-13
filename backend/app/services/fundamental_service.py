"""
Fundamental data service
========================
Strategy: Financial Modeling Prep (FMP) is the primary source — much better
international coverage (India NSE, Canada, UK, Europe) and reliable ETF detection.
yfinance fills in any gaps (forward PE, insider %, ownership data).

When FMP_API_KEY is not set, falls back entirely to yfinance (original behaviour).
FMP free tier: 250 calls/day — sufficient for personal use.
"""

import concurrent.futures
import requests
import yfinance as yf
from fastapi import HTTPException


FMP_BASE = "https://financialmodelingprep.com/api/v3"


# ── FMP helpers ───────────────────────────────────────────────────────────────

def _fmp_key() -> str:
    from app.core.config import settings
    return settings.FMP_API_KEY


def _fmp_get(path: str, **params) -> dict:
    """Call FMP endpoint, return first item if list, or empty dict on failure."""
    key = _fmp_key()
    if not key:
        return {}
    try:
        r = requests.get(f"{FMP_BASE}{path}",
                         params={"apikey": key, **params}, timeout=10)
        if r.ok:
            data = r.json()
            if isinstance(data, list):
                return data[0] if data else {}
            return data or {}
    except Exception:
        pass
    return {}


def _fmp_list(path: str, **params) -> list:
    """Call FMP endpoint, return full list or empty list on failure."""
    key = _fmp_key()
    if not key:
        return []
    try:
        r = requests.get(f"{FMP_BASE}{path}",
                         params={"apikey": key, **params}, timeout=10)
        if r.ok:
            data = r.json()
            return data if isinstance(data, list) else []
    except Exception:
        pass
    return []


# ── Value helpers ─────────────────────────────────────────────────────────────

def _pct(v) -> float | None:
    """Decimal fraction → percentage (0.15 → 15.00)."""
    return round(float(v) * 100, 2) if v is not None else None

def _r(v, decimals: int = 2) -> float | None:
    return round(float(v), decimals) if v is not None else None

def _prefer(fmp_val, yf_val):
    """Use FMP value when available, fall back to yfinance."""
    return fmp_val if fmp_val is not None else yf_val


# ── yfinance helper ───────────────────────────────────────────────────────────

def _yf_info(ticker: str) -> dict:
    try:
        info = yf.Ticker(ticker).info
        return info if info and info.get("symbol") else {}
    except Exception:
        return {}


# ── Main ──────────────────────────────────────────────────────────────────────

def get_fundamentals(ticker: str) -> dict:
    from app.services.market_data import resolve_ticker
    ticker = resolve_ticker(ticker.upper())

    # Parallel fetch: all FMP endpoints + yfinance simultaneously
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
        profile_f   = pool.submit(_fmp_get,  f"/profile/{ticker}")
        ratios_f    = pool.submit(_fmp_get,  f"/ratios-ttm/{ticker}")
        metrics_f   = pool.submit(_fmp_get,  f"/key-metrics-ttm/{ticker}")
        income_f    = pool.submit(_fmp_list, f"/income-statement/{ticker}",
                                  period="annual", limit=4)
        balance_f   = pool.submit(_fmp_list, f"/balance-sheet-statement/{ticker}",
                                  period="annual", limit=1)
        cashflow_f  = pool.submit(_fmp_list, f"/cash-flow-statement/{ticker}",
                                  period="annual", limit=1)
        yf_f        = pool.submit(_yf_info, ticker)

        profile  = profile_f.result()
        ratios   = ratios_f.result()
        metrics  = metrics_f.result()
        incomes  = income_f.result()
        balances = balance_f.result()
        cashflows = cashflow_f.result()
        yf_info  = yf_f.result()

    if not profile and not yf_info:
        raise HTTPException(404, f"No fundamental data found for {ticker}")

    income   = incomes[0]   if incomes   else {}
    balance  = balances[0]  if balances  else {}
    cashflow = cashflows[0] if cashflows else {}

    # Currency and ETF flag
    currency = profile.get("currency") or yf_info.get("currency", "USD")
    is_etf   = bool(profile.get("isEtf") or profile.get("isFund") or
                    yf_info.get("quoteType") == "ETF")

    # ── Valuation ─────────────────────────────────────────────────────────────
    pe_trailing = _prefer(
        _r(ratios.get("peRatioTTM") or metrics.get("peRatioTTM")),
        _r(yf_info.get("trailingPE")),
    )
    # Forward PE: FMP requires paid analyst-estimates endpoint; use yfinance
    pe_forward  = _r(yf_info.get("forwardPE"))
    pb_ratio    = _prefer(
        _r(ratios.get("priceToBookRatioTTM")),
        _r(yf_info.get("priceToBook")),
    )
    ev_ebitda   = _prefer(
        _r(ratios.get("enterpriseValueMultipleTTM") or
           metrics.get("enterpriseValueOverEBITDATTM")),
        _r(yf_info.get("enterpriseToEbitda")),
    )
    peg_ratio   = _prefer(
        _r(ratios.get("priceEarningsToGrowthRatioTTM")),
        _r(yf_info.get("pegRatio")),
    )
    ps_ratio    = _prefer(
        _r(ratios.get("priceSalesRatioTTM") or ratios.get("priceToSalesRatioTTM")),
        _r(yf_info.get("priceToSalesTrailing12Months")),
    )

    # ── Growth ────────────────────────────────────────────────────────────────
    revenue = income.get("revenue") or yf_info.get("totalRevenue")
    # Both FMP and yfinance return growth as decimal fractions → _pct() converts
    revenue_growth  = _prefer(
        _pct(ratios.get("revenueGrowthTTM")),
        _pct(yf_info.get("revenueGrowth")),
    )
    earnings_growth = _prefer(
        _pct(ratios.get("netIncomeGrowthTTM")),
        _pct(yf_info.get("earningsGrowth")),
    )
    ebitda         = income.get("ebitda") or yf_info.get("ebitda")
    free_cash_flow = cashflow.get("freeCashFlow") or yf_info.get("freeCashflow")

    # ── Margins (FMP returns decimals, same as yfinance → _pct converts) ──────
    gross_margin     = _prefer(
        _pct(ratios.get("grossProfitMarginTTM")),
        _pct(yf_info.get("grossMargins")),
    )
    operating_margin = _prefer(
        _pct(ratios.get("operatingProfitMarginTTM")),
        _pct(yf_info.get("operatingMargins")),
    )
    net_margin       = _prefer(
        _pct(ratios.get("netProfitMarginTTM")),
        _pct(yf_info.get("profitMargins")),
    )

    # ── Returns ───────────────────────────────────────────────────────────────
    # FMP returns these as decimals (e.g. 0.145 = 14.5%) → _pct converts
    roe = _prefer(
        _pct(ratios.get("returnOnEquityTTM")),
        _pct(yf_info.get("returnOnEquity")),
    )
    roa = _prefer(
        _pct(ratios.get("returnOnAssetsTTM")),
        _pct(yf_info.get("returnOnAssets")),
    )
    # FMP computes ROCE directly in ratios-ttm — no manual calculation needed
    roce_raw = ratios.get("returnOnCapitalEmployedTTM")
    if roce_raw is not None:
        roce = _pct(roce_raw)
    else:
        # Manual fallback from income + balance sheet
        ebit_val  = income.get("operatingIncome") or yf_info.get("ebit")
        ta        = balance.get("totalAssets")     or yf_info.get("totalAssets")
        cl        = balance.get("totalCurrentLiabilities") or yf_info.get("totalCurrentLiabilities")
        roce = None
        if ebit_val is not None and ta and cl:
            cap_emp = ta - cl
            if cap_emp > 0:
                roce = round(float(ebit_val) / cap_emp * 100, 2)

    # ── Financial Health ──────────────────────────────────────────────────────
    # FMP's debtEquityRatioTTM is a pure ratio (1.87 = 187%); multiply by 100
    # to match yfinance convention which returns the percentage directly (187)
    de_fmp = ratios.get("debtEquityRatioTTM")
    debt_to_equity = _prefer(
        round(float(de_fmp) * 100, 2) if de_fmp is not None else None,
        _r(yf_info.get("debtToEquity")),
    )
    current_ratio = _prefer(
        _r(ratios.get("currentRatioTTM")),
        _r(yf_info.get("currentRatio")),
    )
    quick_ratio = _prefer(
        _r(ratios.get("quickRatioTTM")),
        _r(yf_info.get("quickRatio")),
    )

    # ── Interest Coverage — FMP computes this natively ─────────────────────────
    ic_fmp = ratios.get("interestCoverageTTM") or metrics.get("interestCoverageTTM")
    if ic_fmp is not None:
        interest_coverage = _r(ic_fmp)
    else:
        ebit_val = income.get("operatingIncome") or yf_info.get("ebit")
        ie       = income.get("interestExpense") or yf_info.get("interestExpense")
        interest_coverage = None
        if ebit_val is not None and ie is not None:
            abs_ie = abs(float(ie))
            if abs_ie > 1000:
                interest_coverage = round(float(ebit_val) / abs_ie, 2)

    # ── Cash ──────────────────────────────────────────────────────────────────
    cash = (balance.get("cashAndShortTermInvestments") or
            balance.get("cashAndCashEquivalents")     or
            yf_info.get("cashAndShortTermInvestments") or
            yf_info.get("totalCash"))

    # ── Ownership — yfinance only (FMP requires premium for aggregated %) ──────
    insider_pct       = _pct(yf_info.get("heldPercentInsiders"))
    institutional_pct = _pct(yf_info.get("heldPercentInstitutions"))

    # ── Per Share ─────────────────────────────────────────────────────────────
    eps_trailing = _prefer(
        _r(profile.get("eps")),
        _r(yf_info.get("trailingEps")),
    )
    eps_forward  = _r(yf_info.get("forwardEps"))    # FMP forward data requires paid tier
    book_value   = _prefer(
        _r(metrics.get("bookValuePerShareTTM")),
        _r(yf_info.get("bookValue")),
    )
    beta = _prefer(
        _r(profile.get("beta")),
        _r(yf_info.get("beta")),
    )

    # ── Dividends ─────────────────────────────────────────────────────────────
    # FMP has a typo in the field name: "dividendYielTTM" (missing 'd')
    dy_fmp = ratios.get("dividendYielTTM") or ratios.get("dividendYieldTTM")
    dividend_yield = _prefer(
        _pct(dy_fmp),
        _pct(yf_info.get("dividendYield")),
    )
    pr_fmp = ratios.get("payoutRatioTTM")
    payout_ratio = _prefer(
        _pct(pr_fmp),
        _pct(yf_info.get("payoutRatio")),
    )

    # ── Revenue CAGR (FMP income statements first, yfinance financials fallback) ─
    revenue_cagr_3y = None
    if len(incomes) >= 2:
        revs = [float(s["revenue"]) for s in incomes
                if s.get("revenue") and float(s["revenue"]) > 0]
        if len(revs) >= 2:
            n = len(revs) - 1
            revenue_cagr_3y = round(((revs[0] / revs[-1]) ** (1 / n) - 1) * 100, 2)

    if revenue_cagr_3y is None:
        try:
            fin = yf.Ticker(ticker).financials
            if fin is not None and not fin.empty and "Total Revenue" in fin.index:
                rev_row = fin.loc["Total Revenue"].dropna()
                if len(rev_row) >= 2:
                    n = len(rev_row) - 1
                    latest = float(rev_row.iloc[0])
                    oldest = float(rev_row.iloc[-1])
                    if oldest > 0 and latest > 0:
                        revenue_cagr_3y = round(((latest / oldest) ** (1 / n) - 1) * 100, 2)
        except Exception:
            pass

    return {
        "ticker":   ticker,
        "currency": currency,
        "is_etf":   is_etf,
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
        "revenue_cagr_3y":  revenue_cagr_3y,
        "earnings_growth":  earnings_growth,
        "ebitda":           ebitda,
        "free_cash_flow":   free_cash_flow,
        # Margins
        "gross_margin":     gross_margin,
        "operating_margin": operating_margin,
        "net_margin":       net_margin,
        # Returns
        "roe":  roe,
        "roa":  roa,
        "roce": roce,
        # Health
        "debt_to_equity":    debt_to_equity,
        "current_ratio":     current_ratio,
        "quick_ratio":       quick_ratio,
        "interest_coverage": interest_coverage,
        "cash":              cash,
        # Ownership
        "insider_pct":       insider_pct,
        "institutional_pct": institutional_pct,
        # Per share
        "eps_trailing": eps_trailing,
        "eps_forward":  eps_forward,
        "book_value":   book_value,
        "beta":         beta,
        # Dividends
        "dividend_yield": dividend_yield,
        "payout_ratio":   payout_ratio,
    }
