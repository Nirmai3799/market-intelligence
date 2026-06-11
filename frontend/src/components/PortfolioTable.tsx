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
          {holdings.map((h) => (
            <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
              <td className="px-4 py-3 font-bold text-white">{h.ticker}</td>
              <td className="px-4 py-3 text-right text-gray-400">{h.shares}</td>
              <td className="px-4 py-3 text-right text-gray-400">${h.avg_buy_price.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-300">${h.current_price.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-300">${h.current_value.toLocaleString()}</td>
              <td className={`px-4 py-3 text-right font-medium ${h.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {h.gain_loss >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
