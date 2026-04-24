import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { db } from '../../lib/db.js'
import { tmdb } from '../../lib/tmdb.js'
import { useAuth } from '../../hooks/useAuth.jsx'

export default function NotificationsPage({ onRead }) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tutti') // 'tutti' | 'film' | 'libri' | 'ristoranti'

  useEffect(() => {
    if (!user) return
    Promise.all([
      db.getSuggestions(user.id),
      db.getBookSuggestions(user.id),
      db.getRestaurantSuggestions(user.id)
    ]).then(([movies, books, restaurants]) => {
      const all = [
        ...movies.map(s => ({ ...s, type: 'film' })),
        ...books.map(s => ({ ...s, type: 'libro' })),
        ...restaurants.map(s => ({ ...s, type: 'ristorante' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setSuggestions(all)
      setLoading(false)

      // Segna tutto come letto
      movies.filter(s => !s.read).forEach(s => db.markSuggestionRead(s.id))
      books.filter(s => !s.read).forEach(s => db.markBookSuggestionRead(s.id))
      restaurants.filter(s => !s.read).forEach(s => db.markRestaurantSuggestionRead(s.id))
      onRead?.()
    })
  }, [user])

  const FILTER_TYPE = { film: 'film', libri: 'libro', ristoranti: 'ristorante' }
  const displayed = filter === 'tutti'
    ? suggestions
    : suggestions.filter(s => s.type === FILTER_TYPE[filter])

  const unreadCount = suggestions.filter(s => !s.read).length

  if (loading) return (
    <div className="scroll-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="loader" />
    </div>
  )

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifiche</h1>
          <p className="page-subtitle">
            {suggestions.length} suggerimenti ricevuti
            {unreadCount > 0 ? ` · ${unreadCount} non letti` : ''}
          </p>
        </div>
      </div>

      <div className="section">
        {/* Filtro film/libri */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['tutti', 'film', 'libri', 'ristoranti'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'tutti' ? `Tutti (${suggestions.length})`
                  : f === 'film' ? `🎬 Film (${suggestions.filter(s => s.type === 'film').length})`
                  : f === 'libri' ? `📚 Libri (${suggestions.filter(s => s.type === 'libro').length})`
                  : `🍽️ Ristoranti (${suggestions.filter(s => s.type === 'ristorante').length})`}
              </button>
            ))}
          </div>
        )}

        {displayed.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon"><Bell size={40} /></div>
              <h3>Nessun suggerimento ancora</h3>
              <p>Quando un amico ti consiglia un film, un libro o un ristorante, lo trovi qui!</p>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayed.map(s => {
                const isFilm = s.type === 'film'
                const isBook = s.type === 'libro'
                const isRestaurant = s.type === 'ristorante'
                const poster = isFilm
                  ? (s.movie_poster ? tmdb.posterUrl(s.movie_poster, 'w92') : null)
                  : isBook
                  ? (s.book_cover || null)
                  : (s.restaurant_cover || null)
                const title = isFilm ? s.movie_title : isBook ? s.book_title : s.restaurant_name
                const year = isFilm ? s.movie_year : null
                const sub = isFilm ? null : isBook ? s.book_authors : (s.restaurant_cuisine || s.restaurant_city)
                const fallbackEmoji = isFilm ? '🎬' : isBook ? '📚' : '🍽️'
                const kindLabel = isFilm ? 'un film' : isBook ? 'un libro' : 'un ristorante'
                const tagLabel = isFilm ? '🎬 Film' : isBook ? '📚 Libro' : '🍽️ Ristorante'

                return (
                  <div key={`${s.type}-${s.id}`} className={`suggestion-card ${!s.read ? 'unread' : ''}`}>
                    {poster
                      ? <img className="suggestion-poster" src={poster} alt={title} />
                      : <div className="suggestion-poster" style={{ background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          {fallbackEmoji}
                        </div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {s.profiles?.avatar_url
                          ? <img src={s.profiles.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                          : <div style={{ width: 20, height: 20, background: 'var(--bg4)', borderRadius: '50%' }} />}
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {s.profiles?.full_name || 'Un amico'} ti consiglia {kindLabel}:
                        </span>
                        {!s.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {title}
                        {year && <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}> ({year})</span>}
                      </div>
                      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
                      {s.comment && (
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>
                          "{s.comment}"
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {new Date(s.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontSize: 10, background: 'var(--bg4)', borderRadius: 4, padding: '1px 6px', color: 'var(--text3)' }}>
                          {tagLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>}
      </div>
    </div>
  )
}