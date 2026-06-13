import type { Fundamentals } from '../types'
import { currencySymbol, fmtMoney } from '../utils/currency'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null, suffix = '', decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals) + suffix
}

function fmtLarge(v: number | null, sym: string): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e12) return sym + (v / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9)  return sym + (v / 1e9).toFixed(1)  + 'B'
  if (abs >= 1e6)  return sym + (v / 1e6).toFixed(1)  + 'M'
  return sym + v.toLocaleString()
}

// Color helpers — each metric has a known "good" direction
function peColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v < 0)  return 'text-orange-400'  // negative P/E = unprofitable
  if (v < 15) return 'text-green-400'
  if (v < 30) return 'text-yellow-400'
  return 'text-red-400'
}

function fmtPE(v: number | null): string {
  if (v == null) return '—'
  if (v < 0) return `${v.toFixed(1)}x ⚠`  // flag negative clearly
  return v.toFixed(2) + 'x'
}
function marginColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v >= 20) return 'text-green-400'
  if (v >= 8)  return 'text-yellow-400'
  return 'text-red-400'
}
function roeColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v >= 15) return 'text-green-400'
  if (v >= 8)  return 'text-yellow-400'
  return 'text-red-400'
}
function debtColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v < 50)  return 'text-green-400'
  if (v < 150) return 'text-yellow-400'
  return 'text-red-400'
}
function growthColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v > 10) return 'text-green-400'
  if (v > 0)  return 'text-yellow-400'
  return 'text-red-400'
}
function crColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v >= 2)   return 'text-green-400'
  if (v >= 1)   return 'text-yellow-400'
  return 'text-red-400'
}
function betaColor(v: number | null) {
  if (v == null) return 'text-gray-400'
  if (v < 0.8)  return 'text-green-400'
  if (v < 1.3)  return 'text-yellow-400'
  return 'text-red-400'
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-3">{children}</p>
  )
}

function Metric({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-gray-600 text-xs">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-800 my-4" />
}

// ── main card ─────────────────────────────────────────────────────────────────

export default function FundamentalsCard({ data }: { data: Fundamentals }) {
  const sym = currencySymbol(data.currency)

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-white font-semibold text-base mb-5">Fundamental Analysis</h3>

      {data.is_etf && (
        <div className="mb-4 bg-blue-950 border border-blue-800 rounded-xl px-4 py-3">
          <p className="text-blue-300 text-sm font-medium">ETF / Fund</p>
          <p className="text-blue-400 text-xs mt-0.5">
            P/E, margins, ROE, and earnings metrics don't apply to funds — only price-based ratios are shown.
          </p>
        </div>
      )}

      {/* ── Valuation ─────────────────────────────────────────────────────── */}
      <SectionTitle>Valuation</SectionTitle>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Metric label="P/E (TTM)"    value={fmtPE(data.pe_trailing)} color={peColor(data.pe_trailing)} />
        <Metric label="Fwd P/E"      value={fmtPE(data.pe_forward)}  color={peColor(data.pe_forward)}  />
        <Metric label="P/B"          value={fmt(data.pb_ratio)}    color={data.pb_ratio != null && data.pb_ratio < 3 ? 'text-green-400' : 'text-yellow-400'} />
        <Metric label="EV/EBITDA"    value={fmt(data.ev_ebitda)}   color={data.ev_ebitda != null && data.ev_ebitda < 15 ? 'text-green-400' : data.ev_ebitda != null && data.ev_ebitda < 25 ? 'text-yellow-400' : 'text-red-400'} />
        <Metric label="PEG"          value={fmt(data.peg_ratio)}   color={data.peg_ratio != null && data.peg_ratio < 1 ? 'text-green-400' : data.peg_ratio != null && data.peg_ratio < 2 ? 'text-yellow-400' : 'text-red-400'} />
        <Metric label="P/S"          value={fmt(data.ps_ratio)}    color="text-white" />
      </div>

      {/* Negative P/E warning */}
      {(data.pe_trailing != null && data.pe_trailing < 0) && (
        <p className="text-orange-400 text-xs mt-2">
          ⚠ Negative P/E — company is currently loss-making. EPS and margins below give a clearer picture.
        </p>
      )}

      <Divider />

      {/* ── Growth ────────────────────────────────────────────────────────── */}
      <SectionTitle>Revenue & Growth</SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Revenue (TTM)"    value={fmtLarge(data.revenue, sym)}       color="text-white" />
        <Metric label="Revenue Growth"   value={fmt(data.revenue_growth, '%')}     color={growthColor(data.revenue_growth)} />
        <Metric label="Earnings Growth"  value={fmt(data.earnings_growth, '%')}    color={growthColor(data.earnings_growth)} />
        <Metric label="Free Cash Flow"   value={fmtLarge(data.free_cash_flow, sym)} color={data.free_cash_flow != null && data.free_cash_flow > 0 ? 'text-green-400' : 'text-red-400'} />
      </div>

      <Divider />

      {/* ── Margins ───────────────────────────────────────────────────────── */}
      <SectionTitle>Profitability Margins</SectionTitle>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Metric label="Gross Margin"     value={fmt(data.gross_margin, '%')}     color={marginColor(data.gross_margin)} />
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(100, data.gross_margin ?? 0)}%` }} />
          </div>
        </div>
        <div>
          <Metric label="Operating Margin" value={fmt(data.operating_margin, '%')} color={marginColor(data.operating_margin)} />
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, data.operating_margin ?? 0)}%` }} />
          </div>
        </div>
        <div>
          <Metric label="Net Margin"       value={fmt(data.net_margin, '%')}       color={marginColor(data.net_margin)} />
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(100, data.net_margin ?? 0)}%` }} />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Returns & Health ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <SectionTitle>Returns</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="ROE"  value={fmt(data.roe, '%')}  color={roeColor(data.roe)} />
            <Metric label="ROA"  value={fmt(data.roa, '%')}  color={roeColor(data.roa)} />
            <Metric label="ROCE" value={fmt(data.roce, '%')} color={roeColor(data.roce)} />
          </div>
        </div>
        <div>
          <SectionTitle>Financial Health</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Debt/Equity"   value={fmt(data.debt_to_equity)} color={debtColor(data.debt_to_equity)} />
            <Metric label="Int. Coverage" value={data.interest_coverage != null ? `${data.interest_coverage}×` : '—'}
                    color={data.interest_coverage != null ? (data.interest_coverage > 3 ? 'text-green-400' : data.interest_coverage > 1.5 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-400'} />
            <Metric label="Current Ratio" value={fmt(data.current_ratio)}  color={crColor(data.current_ratio)}   />
            <Metric label="Quick Ratio"   value={fmt(data.quick_ratio)}    color={crColor(data.quick_ratio)}     />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Growth CAGR + Cash ───────────────────────────────────────────────── */}
      <SectionTitle>Business Quality</SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Rev CAGR (3yr)"   value={fmt(data.revenue_cagr_3y, '%')}   color={growthColor(data.revenue_cagr_3y)} />
        <Metric label="Cash"             value={fmtLarge(data.cash, sym)}          color="text-white" />
        <Metric label="Insider Holding"  value={data.insider_pct != null ? `${data.insider_pct}%` : '—'}
                color={data.insider_pct != null && data.insider_pct > 5 ? 'text-green-400' : 'text-gray-400'} />
        <Metric label="Institutional"    value={data.institutional_pct != null ? `${data.institutional_pct}%` : '—'}
                color="text-white" />
      </div>

      <Divider />

      {/* ── Per Share & Dividend ─────────────────────────────────────────── */}
      <SectionTitle>Per Share & Dividend</SectionTitle>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Metric label="EPS (TTM)"   value={fmtMoney(data.eps_trailing, data.currency)} color="text-white" />
        <Metric label="Fwd EPS"     value={fmtMoney(data.eps_forward, data.currency)}  color="text-white" />
        <Metric label="Book Value"  value={fmtMoney(data.book_value, data.currency)}   color="text-white" />
        <Metric label="Beta"        value={fmt(data.beta)}                             color={betaColor(data.beta)} />
        <Metric label="Div Yield"   value={data.dividend_yield ? fmt(data.dividend_yield, '%') : '—'} color={data.dividend_yield ? 'text-green-400' : 'text-gray-500'} />
        <Metric label="Payout"      value={data.payout_ratio   ? fmt(data.payout_ratio, '%')   : '—'} color="text-white" />
      </div>
    </div>
  )
}
