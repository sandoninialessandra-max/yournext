import { useState, useEffect } from 'react'
import { X, Heart, Star, Eye, EyeOff, Send, ChevronDown, ChevronUp, Sparkles, MapPin } from 'lucide-react'
import { tmdb } from '../../lib/tmdb.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'

const TMDB_LOGO = 'https://image.tmdb.org/t/p/original'

export default function MovieModal({ movieId, onClose, watchedMovies, onUpdate }) {
  const { user } = useAuth()
  const toast = useToast()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFullPlot, setShowFullPlot] = useState(false)
  const [fullPlot, setFullPlot] = useState('')
  const [loadingPlot, setLoadingPlot] = useState(false)
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [similar, setSimilar] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [friends, setFriends] = useState([])
  const [sendComment, setSendComment] = useState('')
  const [sendingTo, setSendingTo] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const watched = watchedMovies?.find(w => w.movie_id === movieId)
  const isWatched = !!watched

  useEffect(() => {
    tmdb.getMovie(movieId).then(m => { setMovie(m); setLoading(false) })
    if (user) db.getFriends(user.id).then(f => setFriends(f))
  }, [movieId, user])

  useEffect(() => {
    if (watched?.rating) setRating(watched.rating)
  }, [watched])

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <div className="loader" />
      </div>
    </div>
  )
  if (!movie) return null

  const providers = tmdb.getWatchProviders(movie)
  const year = movie.release_date?.slice(0, 4)
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : ''
  const genres = movie.genres?.map(g => g.name).join(', ')

  const handleToggleWatched = async () => {
    if (isWatched) {
      await db.removeWatchedMovie(user.id, movieId)
      toast('Film rimosso dalla lista', 'success')
    } else {
      await db.addWatchedMovie(user.id, movie)
      toast('Film aggiunto alla lista! 🎬', 'success')
    }
    onUpdate()
  }

  const handleFavorite = async () => {
    if (!isWatched) { toast('Aggiungi prima il film alla lista', 'error'); return }
    await db.toggleFavorite(user.id, movieId, watched.is_favorite)
    toast(watched.is_favorite ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti ❤️', 'success')
    onUpdate()
  }

  const handleRating = async (r) => {
    if (!isWatched) { toast('Aggiungi prima il film alla lista', 'error'); return }
    setRating(r)
    await db.updateRating(user.id, movieId, r)
    toast('Voto salvato!', 'success')
    onUpdate()
  }

  const handleFullPlot = async () => {
    if (fullPlot) { setShowFullPlot(!showFullPlot); return }
    setLoadingPlot(true)
    const plot = await ai.getFullPlot(movie)
    setFullPlot(plot)
    setShowFullPlot(true)
    setLoadingPlot(false)
  }

  const handleSimilar = async () => {
    if (similar.length) return
    setLoadingSimilar(true)
    const watchedTitles = watchedMovies?.map(w => w.movie_title) || []
    const results = await ai.getSimilarMovies(movie, watchedTitles)
    setSimilar(results)
    setLoadingSimilar(false)
  }

  const handleSend = async (friend) => {
    setSendingTo(friend.friend_id)
    await db.sendSuggestion(user.id, friend.friend_id, movie, sendComment)
    toast(`Suggerimento inviato a ${friend.profiles?.full_name}! 📬`, 'success')
    setSendModal(false)
    setSendingTo(null)
    setSendComment('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Hero backdrop */}
        <div className="movie-hero">
          {movie.backdrop_path
            ? <img className="movie-hero-img" src={tmdb.backdropUrl(movie.backdrop_path)} alt="" />
            : <div style={{ background: 'var(--bg3)', height: '100%' }} />}
          <div className="movie-hero-gradient" />
          <button className="btn btn-icon" onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: 'white' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', marginTop: -60, position: 'relative' }}>
          {/* Poster + title row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            {movie.poster_path
              ? <img src={tmdb.posterUrl(movie.poster_path, 'w185')} alt={movie.title} style={{ width: 90, borderRadius: 8, border: '2px solid var(--border2)', flexShrink: 0 }} />
              : <div style={{ width: 90, aspectRatio: '2/3', background: 'var(--bg3)', borderRadius: 8 }} />}
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h2 style={{ fontSize: 24, lineHeight: 1.2, marginBottom: 4 }}>{movie.title}</h2>
              {movie.original_title !== movie.title && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{movie.original_title}</div>}
              <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {year && <span>{year}</span>}
                {runtime && <span>· {runtime}</span>}
                {movie.vote_average > 0 && <span style={{ color: 'var(--accent)' }}>★ {movie.vote_average.toFixed(1)}</span>}
              </div>
              {genres && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{genres}</div>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className={`btn ${isWatched ? 'btn-secondary' : 'btn-primary'} btn-sm`} onClick={handleToggleWatched}>
              {isWatched ? <><EyeOff size={14} /> Rimuovi</>  : <><Eye size={14} /> Ho visto</>}
            </button>
            <button className={`btn btn-sm ${watched?.is_favorite ? 'btn-danger' : 'btn-ghost'}`} onClick={handleFavorite}>
              <Heart size={14} fill={watched?.is_favorite ? 'currentColor' : 'none'} />
              {watched?.is_favorite ? 'Preferito' : 'Preferito'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSendModal(!sendModal)}>
              <Send size={14} /> Suggerisci
            </button>
          </div>

          {/* Rating */}
          {isWatched && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Voto:</span>
              <div className="stars">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`star ${(hoverRating || rating) >= s ? 'active' : ''}`}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRating(s)}>★</span>
                ))}
              </div>
              {rating > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{rating}/5</span>}
            </div>
          )}

          {/* Send suggestion panel */}
          {sendModal && (
            <div style={{ marginTop: 12, padding: 14, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)' }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Invia suggerimento a un amico</p>
              <input className="input" style={{ marginBottom: 8, fontSize: 13 }} placeholder="Aggiungi un commento (opzionale)..." value={sendComment} onChange={e => setSendComment(e.target.value)} />
              {friends.length === 0
                ? <p style={{ fontSize: 12, color: 'var(--text3)' }}>Nessun amico ancora. Aggiungine dal profilo!</p>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {friends.map(f => (
                      <button key={f.friend_id} className="btn btn-secondary btn-sm" disabled={sendingTo === f.friend_id} onClick={() => handleSend(f)}>
                        {sendingTo === f.friend_id ? <span className="loader" style={{ width: 12, height: 12 }} /> : null}
                        {f.profiles?.full_name || f.profiles?.email}
                      </button>
                    ))}
                  </div>}
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trama</h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{movie.overview}</p>
            </div>
          )}

          {/* Full plot with spoilers */}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleFullPlot} disabled={loadingPlot}>
              {loadingPlot ? <><span className="loader" style={{ width: 14, height: 14 }} /> Caricamento...</>
                : <>{showFullPlot ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Trama completa con spoiler (AI)</>}
            </button>
            {showFullPlot && fullPlot && (
              <div style={{ marginTop: 12, position: 'relative' }}>
                {!showSpoiler && (
                  <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', background: 'rgba(10,10,15,0.7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowSpoiler(true)}>⚠️ Mostra spoiler</button>
                  </div>
                )}
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, padding: 14, background: 'var(--bg3)', borderRadius: 8 }}>{fullPlot}</p>
              </div>
            )}
          </div>

          {/* Where to watch */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dove guardarlo in Italia</h3>
            {providers.flatrate?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>STREAMING INCLUSO</div>
                <div className="providers">
                  {providers.flatrate.map(p => (
                    <a key={p.provider_id} href={providers.link} target="_blank" rel="noopener noreferrer" title={p.provider_name}>
                      <img className="provider-logo" src={`${TMDB_LOGO}${p.logo_path}`} alt={p.provider_name} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {providers.rent?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>A NOLEGGIO</div>
                <div className="providers">
                  {providers.rent.map(p => (
                    <a key={p.provider_id} href={providers.link} target="_blank" rel="noopener noreferrer" title={p.provider_name}>
                      <img className="provider-logo" src={`${TMDB_LOGO}${p.logo_path}`} alt={p.provider_name} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {!providers.flatrate?.length && !providers.rent?.length && (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Nessuna piattaforma disponibile al momento in Italia.</p>
            )}
          </div>

          {/* TMDB Similar */}
          {movie.similar?.results?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Film simili</h3>
              <div className="scroll-x">
                {movie.similar.results.slice(0, 10).map(s => (
                  <div key={s.id} style={{ flexShrink: 0, width: 90, cursor: 'pointer' }} title={s.title}>
                    {s.poster_path
                      ? <img src={tmdb.posterUrl(s.poster_path, 'w185')} alt={s.title} style={{ width: 90, aspectRatio: '2/3', objectFit: 'cover', borderRadius: 6 }} />
                      : <div style={{ width: 90, aspectRatio: '2/3', background: 'var(--bg3)', borderRadius: 6 }} />}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Similar */}
          <div style={{ marginTop: 20 }}>
            <div className="ai-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Consigli AI personalizzati</span>
              </div>
              {similar.length === 0
                ? <button className="btn btn-secondary btn-sm" onClick={handleSimilar} disabled={loadingSimilar}>
                    {loadingSimilar ? <><span className="loader" style={{ width: 12, height: 12 }} /> Analisi in corso...</> : 'Trova film simili (AI)'}
                  </button>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {similar.map((s, i) => (
                      <div key={i} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.title} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({s.year})</span></div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{s.reason}</div>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
