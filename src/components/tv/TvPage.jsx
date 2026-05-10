import { useState, useEffect, useCallback } from 'react'
import { Search, Heart, Sparkles, TrendingUp, Tv } from 'lucide-react'
import { tmdb } from '../../lib/tmdb.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import ShowModal from './ShowModal.jsx'

const TABS = ['Le mie serie', 'Scopri', 'Consigli AI']

export default function TvPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('Le mie serie')
  const [subTab, setSubTab] = useState('watching')
  const [watchedShows, setWatchedShows] = useState([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [trending, setTrending] = useState([])
  const [popular, setPopular] = useState([])
  const [selectedShowId, setSelectedShowId] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [filterFav, setFilterFav] = useState(false)

  const loadShows = useCallback(async () => {
    if (!user) return
    setLoadingShows(true)
    const data = await db.getWatchedShows(user.id)
    setWatchedShows(data)
    setLoadingShows(false)
  }, [user])

  useEffect(() => { loadShows() }, [loadShows])

  useEffect(() => {
    if (tab === 'Scopri') {
      tmdb.getTrendingTv().then(setTrending)
      tmdb.getPopularTv().then(setPopular)
    }
  }, [tab])

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await tmdb.searchTv(q)
    setSearchResults(results)
    setSearching(false)
  }

  const handleAdd = async (show, status) => {
    await db.addWatchedShow(user.id, show, status)
    const labels = { watching: 'in corso 📺', completed: 'completata ✓', wishlist: 'da vedere 🔖' }
    toast(`"${show.name}" aggiunta come ${labels[status]}!`, 'success')
    loadShows()
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAiShowClick = async (title, originalTitle, year) => {
    let results = await tmdb.searchTv(`${originalTitle || title} ${year || ''}`)
    if (!results.length) results = await tmdb.searchTv(originalTitle || title)
    if (!results.length) results = await tmdb.searchTv(title)
    if (results.length > 0) setSelectedShowId(results[0].id)
    else toast('Serie non trovata', 'error')
  }

  const byStatus = (status) => watchedShows.filter(s => s.status === status)
  const watching = byStatus('watching')
  const completed = byStatus('completed')
  const wishlist = byStatus('wishlist')
  const displayed =
    subTab === 'watching' ? (filterFav ? watching.filter(s => s.is_favorite) : watching)
    : subTab === 'completed' ? (filterFav ? completed.filter(s => s.is_favorite) : completed)
    : wishlist

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Serie TV</h1>
          <p className="page-subtitle">
            {watching.length} in corso · {completed.length} completate · {wishlist.length} da vedere · {watchedShows.filter(s => s.is_favorite).length} preferite
          </p>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Le mie serie' && (
        <div className="section">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${subTab === 'watching' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('watching')}>
              📺 In corso ({watching.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('completed')}>
              ✓ Completate ({completed.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('wishlist')}>
              🔖 Da vedere ({wishlist.length})
            </button>
            {(subTab === 'watching' || subTab === 'completed') && (
              <button className={`btn btn-sm ${filterFav ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFilterFav(!filterFav)}>
                <Heart size={12} fill={filterFav ? 'currentColor' : 'none'} /> Preferite
              </button>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="search-bar">
              <Search size={16} className="search-bar-icon" />
              <input className="input" placeholder="Cerca una serie TV..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            </div>
            {searchQuery.length >= 2 && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', marginTop: 4, overflow: 'hidden' }}>
                {searching && <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>}
                {!searching && searchResults.length === 0 && <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>Nessun risultato</div>}
                {searchResults.slice(0, 6).map(s => {
                  const entry = watchedShows.find(w => w.show_id === s.id)
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      {s.poster_path
                        ? <img src={tmdb.posterUrl(s.poster_path, 'w92')} alt={s.name} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4 }} />
                        : <div style={{ width: 36, height: 54, background: 'var(--bg4)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📺</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.first_air_date?.slice(0, 4)}</div>
                      </div>
                      {entry
                        ? <span style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0 }}>
                            {entry.status === 'watching' ? '📺 In corso' : entry.status === 'completed' ? '✓ Vista' : '🔖 Wishlist'}
                          </span>
                        : <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAdd(s, 'watching')}>📺</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAdd(s, 'wishlist')}>🔖</button>
                          </div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {loadingShows
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
            : displayed.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">📺</div>
                <h3>{subTab === 'wishlist' ? 'Nessuna serie da vedere' : subTab === 'watching' ? 'Nessuna serie in corso' : 'Nessuna serie completata'}</h3>
                <p>Cerca una serie qui sopra!</p>
              </div>
            : <div className="movies-grid">
                {displayed.map(s => (
                  <div key={s.show_id} className="movie-card" onClick={() => setSelectedShowId(s.show_id)}>
                    {s.show_poster
                      ? <img className="movie-card-poster" src={tmdb.posterUrl(s.show_poster)} alt={s.show_title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">📺</div>}
                    {s.is_favorite && <div className="movie-card-fav">❤️</div>}
                    {s.rating && <div className="movie-card-badge">★ {s.rating}</div>}
                    {s.status === 'wishlist' && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🔖</div>}
                    {s.status === 'watching' && <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 12, background: 'var(--accent)', color: '#000', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>IN CORSO</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{s.show_title}</div>
                      <div className="movie-card-year">{s.show_year}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === 'Scopri' && (
        <div className="section">
          <div className="section-title"><TrendingUp size={18} /> Trending questa settimana</div>
          {trending.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid" style={{ marginBottom: 32 }}>
                {trending.map(s => {
                  const seen = watchedShows.some(w => w.show_id === s.id)
                  return (
                    <div key={s.id} className="movie-card" onClick={() => setSelectedShowId(s.id)}>
                      {s.poster_path ? <img className="movie-card-poster" src={tmdb.posterUrl(s.poster_path)} alt={s.name} loading="lazy" /> : <div className="movie-card-poster-placeholder">📺</div>}
                      {seen && <div className="movie-card-fav" style={{ color: 'var(--green)' }}>✓</div>}
                      <div className="movie-card-body">
                        <div className="movie-card-title">{s.name}</div>
                        <div className="movie-card-year">{s.first_air_date?.slice(0, 4)} · ★ {s.vote_average?.toFixed(1)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>}

          <div className="section-title"><Tv size={18} /> Popolari</div>
          {popular.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid">
                {popular.map(s => (
                  <div key={s.id} className="movie-card" onClick={() => setSelectedShowId(s.id)}>
                    {s.poster_path ? <img className="movie-card-poster" src={tmdb.posterUrl(s.poster_path)} alt={s.name} loading="lazy" /> : <div className="movie-card-poster-placeholder">📺</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{s.name}</div>
                      <div className="movie-card-year">{s.first_air_date?.slice(0, 4)}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === 'Consigli AI' && (
        <div className="section">
          {(watching.length + completed.length) < 3
            ? <div className="empty-state">
                <div className="empty-state-icon"><Sparkles size={40} /></div>
                <h3>Aggiungi almeno 3 serie</h3>
                <p>I consigli AI si basano sui tuoi gusti!</p>
              </div>
            : !aiSuggestions
            ? <div className="ai-card" style={{ textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Consigli personalizzati</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                  L'AI analizzerà le tue {watching.length + completed.length} serie per darti suggerimenti su misura.
                </p>
                <button className="btn btn-primary" onClick={async () => {
                  setLoadingAi(true)
                  const suggestions = await ai.getPersonalizedShowSuggestions(watchedShows.filter(s => s.status !== 'wishlist'))
                  setAiSuggestions(suggestions)
                  setLoadingAi(false)
                }} disabled={loadingAi}>
                  {loadingAi ? <><span className="loader" style={{ width: 14, height: 14 }} /> Analisi...</> : <><Sparkles size={14} /> Genera consigli</>}
                </button>
              </div>
            : <div>
                {aiSuggestions.classics?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">📼 Serie classiche per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.classics.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiShowClick(s.title, s.original_title, s.year)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {s.original_title || s.title}
                              {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> / {s.title}</span>}
                              <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> ({s.year})</span>
                            </div>
                            {s.stars && <div style={{ color: 'var(--accent)', fontSize: 14 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiSuggestions.recent?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">📺 Serie recenti per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.recent.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiShowClick(s.title, s.original_title, s.year)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {s.original_title || s.title}
                              {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> / {s.title}</span>}
                              <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> ({s.year})</span>
                            </div>
                            {s.stars && <div style={{ color: 'var(--accent)', fontSize: 14 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setAiSuggestions(null)}>↺ Rigenera</button>
              </div>}
        </div>
      )}

      {selectedShowId && (
        <ShowModal
          showId={selectedShowId}
          onClose={() => setSelectedShowId(null)}
          watchedShows={watchedShows}
          onUpdate={loadShows}
        />
      )}
    </div>
  )
}
