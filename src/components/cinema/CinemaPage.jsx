import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Heart, Sparkles, Film, TrendingUp } from 'lucide-react'
import { tmdb } from '../../lib/tmdb.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import MovieModal from './MovieModal.jsx'

const TABS = ['Visti', 'Scopri', 'Consigli AI', 'Al cinema']

export default function CinemaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('Visti')
  const [watchedMovies, setWatchedMovies] = useState([])
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
    const data = await db.getWatchedMovies(user.id)
    setWatchedMovies(data)
  }, [user])

  useEffect(() => { loadWatched() }, [loadWatched])

  useEffect(() => {
    if (tab === 'Scopri') tmdb.getTrending().then(setTrending)
    if (tab === 'Al cinema') {
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

  const handleAddFromSearch = async (movie) => {
    await db.addWatchedMovie(user.id, movie)
    toast(`"${movie.title}" aggiunto! 🎬`, 'success')
    loadWatched()
    setSearchQuery('')
    setSearchResults([])
  }

  const handleGetAiSuggestions = async () => {
    setLoadingAi(true)
    const suggestions = await ai.getPersonalizedSuggestions(watchedMovies, upcoming)
    setAiSuggestions(suggestions)
    setLoadingAi(false)
  }

  const displayed = filterFav ? watchedMovies.filter(m => m.is_favorite) : watchedMovies

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cinema</h1>
          <p className="page-subtitle">{watchedMovies.length} film visti · {watchedMovies.filter(m => m.is_favorite).length} preferiti</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* TAB: Visti */}
      {tab === 'Visti' && (
        <div className="section">
          {/* Search bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} className="search-bar-icon" />
              <input className="input" placeholder="Cerca un film da aggiungere..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            </div>
            <button className={`btn btn-sm ${filterFav ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFilterFav(!filterFav)}>
              <Heart size={14} fill={filterFav ? 'currentColor' : 'none'} /> Preferiti
            </button>
          </div>

          {/* Search results dropdown */}
          {searchQuery.length >= 2 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, overflow: 'hidden' }}>
              {searching && <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>}
              {!searching && searchResults.length === 0 && <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>Nessun risultato</div>}
              {searchResults.slice(0, 6).map(m => {
                const alreadyWatched = watchedMovies.some(w => w.movie_id === m.id)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => alreadyWatched ? setSelectedMovieId(m.id) : handleAddFromSearch(m)}>
                    {m.poster_path
                      ? <img src={tmdb.posterUrl(m.poster_path, 'w92')} alt={m.title} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4 }} />
                      : <div style={{ width: 36, height: 54, background: 'var(--bg4)', borderRadius: 4 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.release_date?.slice(0,4)}</div>
                    </div>
                    {alreadyWatched
                      ? <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Visto</span>
                      : <button className="btn btn-primary btn-sm"><Plus size={12} /> Aggiungi</button>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Watched grid */}
          {displayed.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <h3>{filterFav ? 'Nessun film preferito ancora' : 'Nessun film ancora'}</h3>
                <p>{filterFav ? 'Metti un ❤️ ai film che ami!' : 'Cerca un film qui sopra per iniziare!'}</p>
              </div>
            : <div className="movies-grid">
                {displayed.map(m => (
                  <div key={m.movie_id} className="movie-card" onClick={() => setSelectedMovieId(m.movie_id)}>
                    {m.movie_poster
                      ? <img className="movie-card-poster" src={tmdb.posterUrl(m.movie_poster)} alt={m.movie_title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">🎬</div>}
                    {m.is_favorite && <div className="movie-card-fav">❤️</div>}
                    {m.rating && <div className="movie-card-badge">{'★'.repeat(m.rating)}</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.movie_title}</div>
                      <div className="movie-card-year">{m.movie_year}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* TAB: Scopri */}
      {tab === 'Scopri' && (
        <div className="section">
          <div className="section-title"><TrendingUp size={18} /> Trending questa settimana</div>
          {trending.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid">
                {trending.map(m => {
                  const seen = watchedMovies.some(w => w.movie_id === m.id)
                  return (
                    <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                      {m.poster_path
                        ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" />
                        : <div className="movie-card-poster-placeholder">🎬</div>}
                      {seen && <div className="movie-card-fav" style={{ color: 'var(--green)' }}>✓</div>}
                      <div className="movie-card-body">
                        <div className="movie-card-title">{m.title}</div>
                        <div className="movie-card-year">{m.release_date?.slice(0,4)} · ★ {m.vote_average?.toFixed(1)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>}
        </div>
      )}

      {/* TAB: Consigli AI */}
      {tab === 'Consigli AI' && (
        <div className="section">
          {watchedMovies.length < 3
            ? <div className="empty-state">
                <div className="empty-state-icon"><Sparkles size={40} /></div>
                <h3>Aggiungi almeno 3 film</h3>
                <p>I consigli AI si basano sui tuoi gusti. Aggiungi qualche film prima!</p>
              </div>
            : !aiSuggestions
            ? <div className="ai-card" style={{ textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Consigli personalizzati</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                  L'AI analizzerà i tuoi {watchedMovies.length} film visti e i tuoi {watchedMovies.filter(m=>m.is_favorite).length} preferiti per darti suggerimenti su misura.
                </p>
                <button className="btn btn-primary" onClick={handleGetAiSuggestions} disabled={loadingAi}>
                  {loadingAi ? <><span className="loader" style={{ width: 14, height: 14 }} /> Analisi in corso...</> : <><Sparkles size={14} /> Genera consigli</>}
                </button>
              </div>
            : <div>
                {aiSuggestions.archive?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title"><Film size={18} /> Film consigliati per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.archive.map((s, i) => (
                        <div key={i} className="ai-card">
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title} <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 13 }}>({s.year})</span></div>
                          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiSuggestions.upcoming?.length > 0 && (
                  <div>
                    <div className="section-title">🎭 Potrebbero interessarti</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.upcoming.map((s, i) => (
                        <div key={i} className="ai-card">
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 20 }} onClick={() => { setAiSuggestions(null) }}>
                  ↺ Rigenera
                </button>
              </div>}
        </div>
      )}

      {/* TAB: Al cinema */}
      {tab === 'Al cinema' && (
        <div className="section">
          <div className="section-title">🎭 Ora al cinema</div>
          {nowPlaying.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid" style={{ marginBottom: 32 }}>
                {nowPlaying.map(m => (
                  <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                    {m.poster_path
                      ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">🎬</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.title}</div>
                      <div className="movie-card-year">★ {m.vote_average?.toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>}
          <div className="section-title">📅 In uscita presto</div>
          {upcoming.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid">
                {upcoming.map(m => (
                  <div key={m.id} className="movie-card" onClick={() => setSelectedMovieId(m.id)}>
                    {m.poster_path
                      ? <img className="movie-card-poster" src={tmdb.posterUrl(m.poster_path)} alt={m.title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">🎬</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{m.title}</div>
                      <div className="movie-card-year">{m.release_date}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* Movie modal */}
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
