import { useNavigate, useLocation } from 'react-router-dom'
import { Film, BookOpen, Map, Bell, User, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function Sidebar({ unreadCount = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const navItems = [
    { icon: Film, label: 'Cinema', path: '/cinema' },
    { icon: BookOpen, label: 'Libri', path: '/books', soon: true },
    { icon: Map, label: 'Viaggi', path: '/travel', soon: true },
  ]

  return (
    <nav className="sidebar">
      <div className="nav-logo" title="Cinematica">C</div>
      {navItems.map(({ icon: Icon, label, path, soon }) => (
        <button
          key={path}
          className={`nav-item ${!soon && pathname.startsWith(path) ? 'active' : ''} ${soon ? 'coming-soon' : ''}`}
          onClick={() => !soon && navigate(path)}
          title={label}
        >
          <Icon size={20} />
          <span className="nav-tooltip">{label}{soon ? ' (presto)' : ''}</span>
        </button>
      ))}
      <div className="nav-spacer" />
      <button className={`nav-item ${pathname === '/notifications' ? 'active' : ''}`} onClick={() => navigate('/notifications')}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        <span className="nav-tooltip">Notifiche</span>
      </button>
      <button className={`nav-item ${pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
        {user?.user_metadata?.avatar_url
          ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          : <User size={20} />}
        <span className="nav-tooltip">Profilo</span>
      </button>
      <button className="nav-item" onClick={signOut} title="Esci">
        <LogOut size={18} />
        <span className="nav-tooltip">Esci</span>
      </button>
    </nav>
  )
}
