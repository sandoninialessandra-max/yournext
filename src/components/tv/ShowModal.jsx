import { useState, useEffect } from 'react'
import { X, Heart, Tv, Bookmark, Send, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react'
import { tmdb } from '../../lib/tmdb.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import StarRating from '../shared/StarRating.jsx'

const TMDB_LOGO = 'https://image.tmdb.org/t/p/original'

export default function ShowModal({ showId, onClose, watchedShows, onUpdate }) {
  const { user } = useAuth()
  const toast = useToast()
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [watchedEpisodes, setWatchedEpisodes] = useState([])
  const [expandedSeason, setExpandedSeason] = useState(null)
  const [seasonData, setSeasonData] = useState({})
  const [loadingSeason, setLoadingSeason] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [friends, setFriends] = useState([])
  const [sendComment, setSendComment] = useState('')
  const [sendingTo, setSendingTo] = useState(null)
  const [rating, setRating] = useState(null)

  const entry = watchedShows?.find(w => w.show_id === showId)
  const inLibrary = !!entry

  useEffect(() => {
    tmdb.getTvShow(showId).then(s => { setShow(s); setLoading(false) })
    db.getFriends(user.id).then(setFriends)
    if (inLibrary) {
      db.getWatchedEpisodes(user.id, showId).then(setWatchedEpisodes)
    }
  }, [showId, user.id, inLibrary])

  useEffect(() => {
    if (entry?.rating) setRating(entry.rating)
  }, [entry])

  const loadSeason = async (seasonNumber) => {
    if (seasonData[seasonNumber]) return
    setLoadingSeason(seasonNumber)
    const data = await tmdb.getTvSeason(showId, seasonNumber)
    setSeasonData(prev => ({ ...prev, [seasonNumber]: data }))
    setLoadingSeason(null)
  }

  const toggleSeason = async (seasonNumber) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null)
      return
    }
    setExpandedSeason(seasonNumber)
    await loadSeason(seasonNumber)
  }

  const isEpWatched = (s, e) => watchedEpisodes.some(ep => ep.season_number === s && ep.episode_number === e)

  const toggleEpisode = async (seasonNumber, episodeNumber) => {
    if (!inLibrary) {
      toast('Aggiungi prima la serie alla libreria', 'error')
      return
    }
    if (isEpWatched(seasonNumber, episodeNumber)) {
      await db.unmarkEpisodeWatched(user.id, showId, seasonNumber, episodeNumber)
      setWatchedEpisodes(prev => prev.filter(ep => !(ep.season_number === seasonNumber && ep.episode_number === episodeNumber)))
    } else {
      await db.markEpisodeWatched(user.id, showId, seasonNumber, episodeNumber)
      setWatchedEpisodes(prev => [...prev, { season_number: seasonNumber, episode_number: episodeNumber }])
    }
  }

  const isSeasonComplete = (season) => {
    if (!seasonData[season.season_number]) return false
    const eps = seasonData[season.season_number]?.episodes || []
    return eps.length > 0 && eps.every(ep => isEpWatched(season.season_number, ep.episode_number))
  }

  const toggleSeason_bulk = async (season) => {
    if (!inLibrary) { toast('Aggiungi prima la serie alla libreria', 'error'); return }
    await loadSeason(season.season_number)
    const eps = seasonData[season.season_number]?.episodes || []
    if (!eps.length) return
    const epNumbers = eps.map(ep => ep.episode_number)
    if (isSeasonComplete(season)) {
      await db.unmarkSeasonWatched(user.id, showId, season.season_number)
      setWatchedEpisodes(prev => prev.filter(ep => ep.season_number !== season.season_number))
      toast(`Stagione ${season.season_number} deselezionata`, 'success')
    } else {
      await db.markSeasonWatched(user.id, showId, season.season_number, epNumbers)
      setWatchedEpisodes(prev => {
        const existing = prev.filter(ep => ep.season_number !== season.season_number)
        return [...existing, ...epNumbers.map(n => ({ season_number: season.season_number, episode_number: n }))]
      })
      toast(`Stagione ${season.season_number} completata ✓`, 'success')
    }
  }

  const handleStatus = async (status) => {
    if (!show) return
    if (inLibrary && entry.status === status) {
      await db.removeWatchedShow(user.id, showId)
      setWatchedEpisodes([])
      toast(`"${show.name}" rimossa dalla libreria`, 'success')
    } else {
      await db.addWatchedShow(user.id, show, status)
      const labels = { watching: 'in corso 📺', completed: 'completata ✓', wishlist: 'da vedere 🔖' }
      toast(`"${show.name}" segnata come ${labels[status]}!`, 'success')
      if (!inLibrary) {
        const eps = await db.getWatchedEpisodes(user.id, showId)
        setWatchedEpisodes(eps)
      }
    }
    onUpdate()
  }

  const handleFavorite = async () => {
    if (!inLibrary) return
    await db.toggleShowFavorite(user.id, showId, entry.is_favorite)
    onUpdate()
  }

  const handleRating = async (r) => {
    if (!inLibrary) { toast('Aggiungi prima la serie alla libreria', 'error'); return }
    setRating(r)
    await db.updateShowRating(user.id, showId, r || null)
    toast(r ? 'Voto salvato!' : 'Voto rimosso', 'success')
    onUpdate()
  }

  const handleSend = async (friend) => {
    setSendingTo(friend.friend_id)
    await db.sendShowSuggestion(user.id, friend.friend_id, show, sendComment)
    toast(`Suggerimento inviato a ${friend.profiles?.full_name}! 📬`, 'success')
    setSendModal(false)
    setSendingTo(null)
    setSendComment('')
  }

  const handleLoadSimilar = async () => {
    if (similar.length) return
    setLoadingSimilar(true)
    const watchedTitles = watchedShows?.map(s => s.show_title) || []
    const results = await ai.getSimilarShows(show, watchedTitles)
    setSimilar(results)
    setLoadingSimilar(false)
  }

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <div className="loader" />
      </div>
    </div>
  )
  if (!show) return null

  const providers = tmdb.getTvWatchProviders(show)
  const year = show.first_air_date?.slice(0, 4)
  const genres = show.genres?.map(g => g.name).join(', ')
  const seasons = (show.seasons || []).filter(s => s.season_number > 0)
  const totalEpisodes = seasons.reduce((acc, s) => acc + (s.episode_count || 0), 0)
  const watchedCount = watchedEpisodes.length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div className="movie-hero">
          {show.backdrop_path
            ? <img className="movie-hero-img" src={tmdb.backdropUrl(show.backdrop_path)} alt="" />
            : <div style={{ background: 'var(--bg3)', height: '100%' }} />}
          <div className="movie-hero-gradient" />
          <button className="btn btn-icon" onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: 'white' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', marginTop: -60, position: 'relative' }}>
          {/* Poster + titolo */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            {show.poster_path
              ? <img src={tmdb.posterUrl(show.poster_path, 'w185')} alt={show.name} style={{ width: 90, borderRadius: 8, border: '2px solid var(--border2)', flexShrink: 0 }} />
              : <div style={{ width: 90, aspectRatio: '2/3', background: 'var(--bg3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📺</div>}
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h2 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 4 }}>{show.name}</h2>
              {show.original_name !== show.name && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{show.original_name}</div>}
              <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {year && <span>{year}</span>}
                {seasons.length > 0 && <span>· {seasons.length} stagion{seasons.length === 1 ? 'e' : 'i'}</span>}
                {show.vote_average > 0 && <span style={{ color: 'var(--accent)' }}>★ {show.vote_average.toFixed(1)}</span>}
              </div>
              {genres && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{genres}</div>}
            </div>
          </div>

          {/* Progresso episodi */}
          {inLibrary && totalEpisodes > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{watchedCount}</span> / {totalEpisodes} episodi visti
              {watchedCount > 0 && (
                <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${Math.round(watchedCount / totalEpisodes * 100)}%`, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          )}

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${entry?.status === 'watching' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleStatus('watching')}>
              <Tv size={13} /> {entry?.status === 'watching' ? 'In corso ✓' : 'Sto guardando'}
            </button>
            <button className={`btn btn-sm ${entry?.status === 'completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleStatus('completed')}>
              <Check size={13} /> {entry?.status === 'completed' ? 'Completata ✓' : 'Completata'}
            </button>
            <button className={`btn btn-sm ${entry?.status === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleStatus('wishlist')}>
              <Bookmark size={13} /> {entry?.status === 'wishlist' ? 'Da vedere ✓' : 'Da vedere'}
            </button>
            {inLibrary && (
              <button className={`btn btn-sm ${entry?.is_favorite ? 'btn-danger' : 'btn-secondary'}`} onClick={handleFavorite}>
                <Heart size={13} fill={entry?.is_favorite ? 'currentColor' : 'none'} /> Preferita
              </button>
            )}
            {inLibrary && friends.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setSendModal(!sendModal)}>
                <Send size={13} /> Suggerisci
              </button>
            )}
          </div>

          {/* Rating */}
          {inLibrary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Voto:</span>
              <StarRating value={rating} onChange={handleRating} />
              {rating > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{rating}/5</span>}
            </div>
          )}

          {/* Send suggestion */}
          {sendModal && (
            <div style={{ marginTop: 12, padding: 14, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)' }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Invia suggerimento a un amico</p>
              <input className="input" style={{ marginBottom: 8, fontSize: 13 }} placeholder="Aggiungi un commento (opzionale)..." value={sendComment} onChange={e => setSendComment(e.target.value)} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {friends.map(f => (
                  <button key={f.friend_id} className="btn btn-secondary btn-sm" disabled={sendingTo === f.friend_id} onClick={() => handleSend(f)}>
                    {sendingTo === f.friend_id ? <span className="loader" style={{ width: 12, height: 12 }} /> : null}
                    {f.profiles?.full_name || f.profiles?.email}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overview */}
          {show.overview && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trama</h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{show.overview}</p>
            </div>
          )}

          {/* Stagioni ed episodi */}
          {seasons.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stagioni</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {seasons.map(season => {
                  const seasonWatched = watchedEpisodes.filter(ep => ep.season_number === season.season_number).length
                  const isOpen = expandedSeason === season.season_number
                  const isComplete = isSeasonComplete(season)
                  const episodes = seasonData[season.season_number]?.episodes || []
                  return (
                    <div key={season.season_number} style={{ border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      {/* Stagione header */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: isOpen ? 'var(--bg3)' : 'var(--bg2)' }}
                        onClick={() => toggleSeason(season.season_number)}
                      >
                        {season.poster_path
                          ? <img src={tmdb.posterUrl(season.poster_path, 'w92')} alt="" style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                          : <div style={{ width: 32, height: 48, background: 'var(--bg4)', borderRadius: 3, flexShrink: 0 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{season.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {seasonWatched} / {season.episode_count} ep
                            {season.air_date && ` · ${season.air_date.slice(0, 4)}`}
                          </div>
                        </div>
                        {inLibrary && (
                          <button
                            className={`btn btn-sm ${isComplete ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: 11, padding: '3px 10px', flexShrink: 0 }}
                            onClick={e => { e.stopPropagation(); toggleSeason_bulk(season) }}
                          >
                            {isComplete ? '✓ Vista' : 'Segna tutto'}
                          </button>
                        )}
                        {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                      </div>
                      {/* Episodi */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {loadingSeason === season.season_number
                            ? <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>
                            : episodes.map(ep => {
                                const watched = isEpWatched(season.season_number, ep.episode_number)
                                return (
                                  <div
                                    key={ep.episode_number}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', cursor: inLibrary ? 'pointer' : 'default', opacity: inLibrary ? 1 : 0.6 }}
                                    onClick={() => toggleEpisode(season.season_number, ep.episode_number)}
                                  >
                                    <div style={{
                                      width: 20, height: 20, borderRadius: 4, border: `2px solid ${watched ? 'var(--accent)' : 'var(--border2)'}`,
                                      background: watched ? 'var(--accent)' : 'transparent', flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                      {watched && <Check size={12} color="#000" strokeWidth={3} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: watched ? 400 : 500, color: watched ? 'var(--text3)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ep.episode_number}. {ep.name}
                                      </div>
                                      {ep.runtime && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{ep.runtime} min</div>}
                                    </div>
                                  </div>
                                )
                              })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Where to watch */}
          {(providers.flatrate?.length > 0 || providers.rent?.length > 0) && (
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
                <div>
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
            </div>
          )}

          {/* Serie simili AI */}
          <div style={{ marginTop: 20 }}>
            <div className="ai-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Serie simili (AI)</span>
              </div>
              {similar.length === 0
                ? <button className="btn btn-secondary btn-sm" onClick={handleLoadSimilar} disabled={loadingSimilar}>
                    {loadingSimilar ? <><span className="loader" style={{ width: 12, height: 12 }} /> Analisi...</> : 'Trova serie simili'}
                  </button>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {similar.map((s, i) => (
                      <div key={i} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {s.original_title || s.title}
                            <span style={{ color: 'var(--text3)', fontWeight: 400 }}> ({s.year})</span>
                          </div>
                          {s.stars && <div style={{ color: 'var(--accent)', fontSize: 12 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.reason}</div>
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
