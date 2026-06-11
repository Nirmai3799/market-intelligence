import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api/client'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const res = mode === 'login'
        ? await loginUser(email, password)
        : await registerUser(email, password)
      localStorage.setItem('token', res.data.access_token)
      navigate('/portfolio')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800">
        <h1 className="text-xl font-bold text-white mb-1">Market Intelligence</h1>
        <p className="text-gray-600 text-sm mb-6">AI-powered market research assistant</p>

        <div className="flex gap-2 mb-6 bg-gray-800 rounded-xl p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {m === 'login' ? 'Log In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Password" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition" />
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white py-3 rounded-xl font-medium transition text-sm">
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}
