import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { db } from '../../lib/db.js'
import { tmdb } from '../../lib/tmdb.js'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function NotificationsPage({ onRead }) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    db.getSuggestions(user.id).then(data => {
      setSuggestions(data)
      setLoading(false)
      // mark all as read
      data.filter(s => !s.read).forEach(s => db.markSuggestionRead(s.id))
      onRead?.()
    })
  }, [user])

  if (loading) return <div className="scroll-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="loader" /></div>

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifiche</h1>
          <p className="page-subtitle">Suggerimenti ricevuti dagli amici</p>
        </div>
      </div>
      <div className="section">
        {suggestions.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon"><Bell size={40} /></div>
              <h3>Nessun suggerimento ancora</h3>
              <p>Quando un amico ti consiglia un film, lo trovi qui!</p>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestions.map(s => (
                <div key={s.id} className={`suggestion-card ${!s.read ? 'unread' : ''}`}>
                  {s.movie_poster
                    ? <img className="suggestion-poster" src={tmdb.posterUrl(s.movie_poster, 'w92')} alt={s.movie_title} />
                    : <div className="suggestion-poster" style={{ background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {s.profiles?.avatar_url
                        ? <img src={s.profiles.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                        : <div style={{ width: 20, height: 20, background: 'var(--bg4)', borderRadius: '50%' }} />}
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{s.profiles?.full_name || 'Un amico'} ti consiglia:</span>
                      {!s.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.movie_title} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({s.movie_year})</span></div>
                    {s.comment && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>"{s.comment}"</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                      {new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
      </div>
    </div>
  )
}
