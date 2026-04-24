import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './components/shared/Toast.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import CinemaPage from './components/cinema/CinemaPage.jsx'
import BooksPage from './components/books/BooksPage.jsx'
import RistorantiPage from './components/restaurants/RistorantiPage.jsx'
import NotificationsPage from './components/cinema/NotificationsPage.jsx'
import ProfilePage from './components/cinema/ProfilePage.jsx'
import { db } from './lib/db.js'
import './styles/main.css'
import { supabase } from './lib/supabase.js'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { signOut } from './lib/supabase.js'

function ComingSoon({ title }) {
  return (
    <div className="scroll-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="empty-state">
        <div className="empty-state-icon">🚧</div>
        <h3>{title}</h3>
        <p>Questa sezione è in arrivo!</p>
      </div>
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  
  useEffect(() => {
    if (!user) return
    const checkUnread = async () => {
      const [movies, books, restaurants] = await Promise.all([
        db.getSuggestions(user.id),
        db.getBookSuggestions(user.id),
        db.getRestaurantSuggestions(user.id)
      ])
      const total = movies.filter(s => !s.read).length
                  + books.filter(s => !s.read).length
                  + restaurants.filter(s => !s.read).length
      setUnreadCount(total)
    }
    checkUnread()
    const interval = setInterval(checkUnread, 60000)
    return () => clearInterval(interval)
  }, [user])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="loader" />
    </div>
  )

  if (!user) return <LoginPage /> 

  return (
    <div className="app-shell">
      <Sidebar unreadCount={unreadCount} />
      <main className="main-content">
	  <div style={{
		display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
		gap: 8, padding: '10px 20px',
		borderBottom: '1px solid var(--border)'
	  }}>
		<button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}
		  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
		  {user?.user_metadata?.avatar_url
			? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
			: <User size={14} />}
		  <span style={{ fontSize: 12 }}>{user?.user_metadata?.full_name?.split(' ')[0]}</span>
		</button>
		<button className="btn btn-ghost btn-sm" onClick={signOut}>
		  <LogOut size={14} /> Esci
		</button>
	  </div>
        <Routes>
          <Route path="/" element={<Navigate to="/cinema" replace />} />
          <Route path="/cinema" element={<CinemaPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/ristoranti" element={<RistorantiPage />} />
          <Route path="/travel" element={<ComingSoon title="Viaggi — In arrivo!" />} />
          <Route path="/notifications" element={<NotificationsPage onRead={() => setUnreadCount(0)} />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
