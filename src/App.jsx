import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './components/shared/Toast.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import CinemaPage from './components/cinema/CinemaPage.jsx'
import NotificationsPage from './components/cinema/NotificationsPage.jsx'
import ProfilePage from './components/cinema/ProfilePage.jsx'
import { db } from './lib/db.js'
import './styles/main.css'
import { supabase } from './lib/supabase.js'

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
  
  useEffect(() => {
    if (!user) return
    const checkUnread = async () => {
      const suggestions = await db.getSuggestions(user.id)
      setUnreadCount(suggestions.filter(s => !s.read).length)
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
        <Routes>
          <Route path="/" element={<Navigate to="/cinema" replace />} />
          <Route path="/cinema" element={<CinemaPage />} />
          <Route path="/books" element={<ComingSoon title="Libri — In arrivo!" />} />
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
