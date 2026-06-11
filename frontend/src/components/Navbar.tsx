import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-white font-bold text-lg tracking-tight">
        Market Intelligence
      </Link>
      <div className="flex items-center gap-6">
        <Link to="/" className="text-gray-400 hover:text-white text-sm transition">Dashboard</Link>
        <Link to="/portfolio" className="text-gray-400 hover:text-white text-sm transition">Portfolio</Link>
        <Link to="/watchlist" className="text-gray-400 hover:text-white text-sm transition">Watchlist</Link>
        <Link to="/alerts" className="text-gray-400 hover:text-white text-sm transition">Alerts</Link>
        <Link to="/screener" className="text-gray-400 hover:text-white text-sm transition">Screener</Link>
        <Link to="/compare" className="text-gray-400 hover:text-white text-sm transition">Compare</Link>
        <Link to="/youtube" className="text-gray-400 hover:text-white text-sm transition">YouTube</Link>
        {token ? (
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm transition">
            Log Out
          </button>
        ) : (
          <Link to="/login" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition">
            Log In
          </Link>
        )}
      </div>
    </nav>
  )
}
