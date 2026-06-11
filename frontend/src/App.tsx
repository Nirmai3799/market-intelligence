import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Alerts from './pages/Alerts'
import Watchlist from './pages/Watchlist'
import Screener from './pages/Screener'
import Compare from './pages/Compare'
import Youtube from './pages/Youtube'
import Login from './pages/Login'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Layout() {
  const location = useLocation()
  const showNavbar = location.pathname !== '/login'

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/portfolio" element={
          <ProtectedRoute><Portfolio /></ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute><Alerts /></ProtectedRoute>
        } />
        <Route path="/watchlist" element={
          <ProtectedRoute><Watchlist /></ProtectedRoute>
        } />
        <Route path="/screener" element={
          <ProtectedRoute><Screener /></ProtectedRoute>
        } />
        <Route path="/compare" element={<Compare />} />
        <Route path="/youtube" element={<Youtube />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
