import { currencySymbol, fmtMoney } from '../utils/currency'
import type { Holding } from '../types'

export default function PortfolioTable({ holdings, onDelete }: { holdings: Holding[]; onDelete: (id: number) => void }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {['Ticker', 'Shares', 'Avg Buy', 'Current', 'Value', 'Total P&L', 'Today', ''].map((h) => (
              <th key={h} className={`text-gray-500 px-4 py-3 font-medium text-xs uppercase tracking-wider ${h === 'Ticker' ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const sym = currencySymbol(h.currency)
            const isUp = h.gain_loss >= 0
            return (
              <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                <td className="px-4 py-3 font-bold text-white">
                  {h.ticker}
                  {h.currency && h.currency !== 'USD' && (
                    <span className="ml-1.5 text-gray-600 text-xs font-normal">{h.currency}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">{h.shares}</td>
                <td className="px-4 py-3 text-right text-gray-400">{fmtMoney(h.avg_buy_price, h.currency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmtMoney(h.current_price, h.currency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmtMoney(h.current_value, h.currency)}</td>
                <td className={`px-4 py-3 text-right font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  <div>{isUp ? '+' : '-'}{sym}{Math.abs(h.gain_loss).toFixed(2)}</div>
                  <div className="text-xs opacity-70">{isUp ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%</div>
                </td>
                <td className={`px-4 py-3 text-right ${(h.change_today_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(h.change_today_pct ?? 0) >= 0 ? '+' : ''}{(h.change_today_pct ?? 0).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onDelete(h.id)} className="text-gray-600 hover:text-red-400 text-xs transition">
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
