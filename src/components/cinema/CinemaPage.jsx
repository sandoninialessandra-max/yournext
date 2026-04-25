import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Heart, Sparkles, Film, TrendingUp } from 'lucide-react'
import { tmdb } from '../../lib/tmdb.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import MovieModal from './MovieModal.jsx'

const TABS = ['I miei film', 'Scopri', 'Consigli AI']

export default function CinemaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('I miei film')
  const [subTab, setSubTab] = useState('watched')
  const [watchedMovies, setWatchedMovies] = useState([])
  const [loadingWatched, setLoadingWatched] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [trending, setTrending] = useState([])
  const [nowPlaying, setNowPlaying] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [filterFav, setFilterFav] = useState(false)

  const loadWatched = useCallback(async () => {
    if (!user) return
    setLoadingWatched(true)
    const data = await db.getWatchedMovies(user.id)
    setWatchedMovies(data)
    setLoadingWatched(false)
  }, [user])

  useEffect(() => { loadWatched() }, [loadWatched])

  useEffect(() => {
    if (tab === 'Scopri') {
      tmdb.getTrending().then(setTrending)
      tmdb.getNowPlaying().then(setNowPlaying)
      tmdb.getUpcoming().then(setUpcoming)
    }
  }, [tab])

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await tmdb.search(q)
    setSearchResults(results)
    setSearching(false)
  }

  const handleAddWatched = async (movie) => {
    await db.addWatchedMovie(user.id, movie)
    toast(`"${movie.title}" aggiunto ai visti! 🎬`, 'success')
    loadWatched()
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAddWishlist = async (movie) => {
    await db.addToWishlist(user.id, movie)
    toast(`"${movie.title}" aggiunto alla wishlist! 🔖`, 'success')
    loadWatched()
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAiMovieClick = async (title, originalTitle, year) => {
    let results = await tmdb.search(`${originalTitle || title} ${year || ''}`)
    if (!results.length) results = await tmdb.search(originalTitle || title)
    if (!results.length) results = await tmdb.search(title)
    if (results.length > 0) setSelectedMovieId(results[0].id)
    else toast('Film non trovato', 'error')
  }

  const byStatus = (status) => watchedMovies.filter(m =>
    status === 'watched' ? (!m.status || m.status === 'watched') : m.status === status
  )
  const watched = byStatus('watched')
  const wishlist = byStatus('wishlist')
  const displayed = subTab === 'watched'
    ? (filterFav ? watched.filter(m => m.is_favorite) : watched)
    : wishlist

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cinema</h1>
          <p className="page-subtitle">{watched.length} visti · {wishlist.length} da vedere · {watched.filter(m => m.is_favorite).length} preferiti</p>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'I miei film' && (
        <div className="section">
          {/* Subtoggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${subTab === 'watched' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('watched')}>
              ✓ Visti ({watched.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('wishlist')}>
              🔖 Da vedere ({wishlist.length})
            </button>
            {subTab === 'watched' && (
              <button className={`btn btn-sm ${filterFav ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFilterFav(!filterFav)}>
                <Heart size={12} fill={filterFav ? 'currentColor' : 'none'} /> Preferiti
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <div className="search-bar">
              <Search size={16} className="search-bar-icon" />
              <input className="input" placeholder="Cerca un film..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            </div>
            {searchQuery.length >= 2 && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', marginTop: 4, overflow: 'hidden' }}>
                {searching && <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>}
                {!searching && searchResults.length === 0 && <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>Nessun risultato</div>}
                {searchResults.slice(0, 6).map(m => {
                  const alreadyWatched = watchedMovies.some(w => w.movie_id === m.id && (!w.status || w.status === 'watched'))
                  const inWishlist = watchedMovies.some(w => w.movie_id === m.id && w.status === 'wishlist')
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      {m.poster_path
                        ? <img src={tmdb.posterUrl(m.poster_path, 'w92')} alt={m.title} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4 }} />
                        : <div style={{ width: 36, height: 54, background: 'var(--bg4)', borderRadius: 4 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.release_date?.slice(0, 4)}</div>
                      </div>
                      {alreadyWatched
                        ? <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Visto</span>
                        : inWishlist
                        ? <span style={{ fontSize: 11, color: 'var(--accent)' }}>🔖 Wishlist</span>
                        : <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAddWatched(m)}>✓ Visto</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAddWishlist(m)}>🔖</button>
                          </div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Grid */}
          {loadingWatched
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
            : displayed.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <h3>{subTab === 'wishlist' ? 'Nessun film da vedere' : filterFav ? 'Nessun preferito' : 'Nessun film ancora'}</h3>
                <p>{subTab === 'wishlist' ? 'Cerca un film e aggiungilo con 🔖' : 'Cerca un film qui sopra!'}</p>
              </div>
            : <div className="movies-grid">
                {displayed.map(m => (
                  <div key={m.movie_id} className="movie-card" onClick={() => setSelectedMovieId(m.movie_id)}>
                    {m.movie_poster
                      ? <img className="movie-card-poster" src={tmdb.posterUrl(m.movie_poster)} alt={m.movie_title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">🎬</div>}
                    {m.is_favorite && <div className="movie-card-fav">❤️</div>}
                    {m.rating && <div className="movie-card-badge">★ {m.rating}</div>}
                    {m.status === 'wishlist' && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🔖</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.movie_title}</div>
                      <div className="movie-card-year">{m.movie_year}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === 'Scopri' && (
        <div className="section">
          <div className="section-title"><Film size={18} /> Ora al cinema</div>
          {nowPlaying.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid" style={{ marginBottom: 32 }}>
                {nowPlaying.map(m => (
                  <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                    {m.poster_path ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" /> : <div className="movie-card-poster-placeholder">🎬</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.title}</div>
                      <div className="movie-card-year">★ {m.vote_average?.toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>}

          <div className="section-title"><TrendingUp size={18} /> Trending</div>
          {trending.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid" style={{ marginBottom: 32 }}>
                {trending.map(m => {
                  const seen = watchedMovies.some(w => w.movie_id === m.id)
                  return (
                    <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                      {m.poster_path ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" /> : <div className="movie-card-poster-placeholder">🎬</div>}
                      {seen && <div className="movie-card-fav" style={{ color: 'var(--green)' }}>✓</div>}
                      <div className="movie-card-body">
                        <div className="movie-card-title">{m.title}</div>
                        <div className="movie-card-year">{m.release_date?.slice(0, 4)} · ★ {m.vote_average?.toFixed(1)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>}

          <div className="section-title">📅 In uscita</div>
          {upcoming.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid">
                {upcoming.map(m => (
                  <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                    {m.poster_path ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" /> : <div className="movie-card-poster-placeholder">🎬</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.title}</div>
                      <div className="movie-card-year">{m.release_date}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === 'Consigli AI' && (
        <div className="section">
          {watched.length < 3
            ? <div className="empty-state">
                <div className="empty-state-icon"><Sparkles size={40} /></div>
                <h3>Aggiungi almeno 3 film visti</h3>
                <p>I consigli AI si basano sui tuoi gusti!</p>
              </div>
            : !aiSuggestions
            ? <div className="ai-card" style={{ textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Consigli personalizzati</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                  L'AI analizzerà i tuoi {watched.length} film e i tuoi {watched.filter(m => m.is_favorite).length} preferiti per darti suggerimenti su misura.
                </p>
                <button className="btn btn-primary" onClick={async () => {
                  setLoadingAi(true)
                  const suggestions = await ai.getPersonalizedSuggestions(watchedMovies, upcoming)
                  setAiSuggestions(suggestions)
                  setLoadingAi(false)
                }} disabled={loadingAi}>
                  {loadingAi ? <><span className="loader" style={{ width: 14, height: 14 }} /> Analisi...</> : <><Sparkles size={14} /> Genera consigli</>}
                </button>
              </div>
            : <div>
                {aiSuggestions.classics?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">🎞️ Film classici per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.classics.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiMovieClick(s.title, s.original_title, s.year)}>
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
                    <div className="section-title">🎬 Film recenti per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.recent.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiMovieClick(s.title, s.original_title, s.year)}>
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
                {aiSuggestions.upcoming?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">🎭 Potrebbero interessarti</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.upcoming.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiMovieClick(s.title, s.original_title, s.year)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {s.original_title || s.title}
                              {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> / {s.title}</span>}
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

      {selectedMovieId && (
        <MovieModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
          watchedMovies={watchedMovies}
          onUpdate={loadWatched}
        />
      )}
    </div>
  )
}
