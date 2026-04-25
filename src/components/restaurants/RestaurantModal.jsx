import { useState, useEffect } from 'react'
import { X, Heart, Bookmark, Send, ChevronDown, ChevronUp, MapPin, Sparkles, Tag, Plus, Utensils, MessageCircle } from 'lucide-react'
import { placesProvider } from '../../lib/placesProvider.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import StarRating from '../shared/StarRating.jsx'

const FIXED_LABELS = ['🍹 Aperitivo', '🍽️ Cena', '☀️ Pranzo', '💑 Romantico', '👥 Amici', '👨‍👩‍👧 Famiglia', '💼 Lavoro', '⭐ Speciale']

export default function RestaurantModal({ restaurantId, onClose, visitedRestaurants, onUpdate }) {
  const { user } = useAuth()
  const toast = useToast()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [similar, setSimilar] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [friends, setFriends] = useState([])
  const [suggestComment, setSuggestComment] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [customLabelInput, setCustomLabelInput] = useState('')
  const [incomingSuggestions, setIncomingSuggestions] = useState([])

  const entry = visitedRestaurants.find(r => r.restaurant_id === restaurantId)
  const isVisited = entry?.status === 'visited'
  const isWishlist = entry?.status === 'wishlist'
  const inLibrary = !!entry

  useEffect(() => {
    placesProvider.getPlace(restaurantId).then(p => { setPlace(p); setLoading(false) })
    db.getFriends(user.id).then(setFriends)
    db.getRestaurantSuggestionsForPlace(user.id, restaurantId).then(setIncomingSuggestions)
  }, [restaurantId, user.id])

  useEffect(() => {
    if (entry?.notes) setNotesDraft(entry.notes)
    else setNotesDraft('')
  }, [entry?.restaurant_id, entry?.notes])

  const handleStatus = async (status) => {
    if (!place) return
    if (inLibrary && entry.status === status) {
      await db.removeRestaurant(user.id, restaurantId)
      toast(`"${place.name}" rimosso dalla libreria`, 'success')
    } else {
      await db.addVisitedRestaurant(user.id, place, status)
      const labels = { visited: 'visitato ✓', wishlist: 'nella wishlist 🔖' }
      toast(`"${place.name}" segnato come ${labels[status]}!`, 'success')
    }
    onUpdate()
  }

  const handleFavorite = async () => {
    if (!inLibrary || !place) return
    await db.toggleRestaurantFavorite(user.id, restaurantId, entry.is_favorite)
    onUpdate()
  }

  const handleRating = async (rating) => {
    if (!inLibrary) return
    await db.updateRestaurantRating(user.id, restaurantId, rating)
    onUpdate()
  }

  const handleNotesBlur = async () => {
    if (!inLibrary) return
    await db.updateRestaurantNotes(user.id, restaurantId, notesDraft)
    onUpdate()
  }

  const handleToggleLabel = async (label) => {
    if (!inLibrary || !entry) return
    const current = entry.labels || []
    const next = current.includes(label) ? current.filter(l => l !== label) : [...current, label]
    await db.updateRestaurantLabels(user.id, restaurantId, next)
    onUpdate()
  }

  const handleAddCustomLabel = async () => {
    const value = customLabelInput.trim()
    if (!value || !inLibrary) return
    await handleToggleLabel(value)
    setCustomLabelInput('')
  }

  const handleSuggest = async () => {
    if (!selectedFriend || !place) return
    await db.sendRestaurantSuggestion(user.id, selectedFriend, place, suggestComment)
    toast('Consiglio inviato!', 'success')
    setShowSuggest(false)
    setSuggestComment('')
    setSelectedFriend(null)
  }

  const handleLoadSimilar = async () => {
    if (!place) return
    setLoadingSimilar(true)
    setShowSimilar(true)
    const visitedNames = visitedRestaurants.map(r => r.restaurant_name)
    const results = await ai.getSimilarRestaurants(place, visitedNames)
    setSimilar(results)
    setLoadingSimilar(false)
  }

  const handleSimilarClick = async (s) => {
    const results = await placesProvider.search(s.name, s.city)
    if (results.length > 0) {
      setPlace(null)
      setLoading(true)
      setSimilar([])
      setShowSimilar(false)
      const newPlace = await placesProvider.getPlace(results[0].id)
      setPlace(newPlace)
      setLoading(false)
    } else toast('Ristorante non trovato', 'error')
  }

  const usedCustomLabels = Array.from(new Set(
    visitedRestaurants.flatMap(r => (r.labels || []).filter(l => !FIXED_LABELS.includes(l)))
  ))

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="loader" />
      </div>
    </div>
  )

  if (!place) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>

        {/* Header — title block centrato */}
        <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.25 }}>{place.name}</h2>
          {place.cuisine && (
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 10, fontStyle: 'italic' }}>{place.cuisine}</p>
          )}
          {place.city && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: 'var(--bg4)', borderRadius: 999, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
              <MapPin size={12} /> {place.city}
            </div>
          )}
          {place.address && (
            <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 10 }}>{place.address}</p>
          )}
          <div>
            <a
              href={place.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(`${place.name} ${place.address || ''} ${place.city || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <MapPin size={12} /> Apri su Google Maps
            </a>
          </div>
        </div>

        {/* Consigli ricevuti su questo locale */}
        {incomingSuggestions.length > 0 && (
          <div style={{ marginBottom: 20, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageCircle size={12} /> {incomingSuggestions.length === 1 ? 'Consiglio ricevuto' : `${incomingSuggestions.length} consigli ricevuti`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incomingSuggestions.map(s => (
                <div key={s.id} style={{ fontSize: 13 }}>
                  <strong>{s.profiles?.full_name || 'Un amico'}</strong>
                  {s.comment && <span style={{ color: 'var(--text2)' }}>: «{s.comment}»</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        {inLibrary && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Il tuo voto</div>
            <StarRating value={entry?.rating} onChange={handleRating} />
          </div>
        )}

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            className={`btn btn-sm ${isVisited ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatus('visited')}
          >
            <Utensils size={13} /> {isVisited ? 'Visitato ✓' : 'Segna come visitato'}
          </button>
          <button
            className={`btn btn-sm ${isWishlist ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatus('wishlist')}
          >
            <Bookmark size={13} /> {isWishlist ? 'In wishlist ✓' : 'Aggiungi a wishlist'}
          </button>
          {inLibrary && (
            <button
              className={`btn btn-sm ${entry?.is_favorite ? 'btn-danger' : 'btn-secondary'}`}
              onClick={handleFavorite}
            >
              <Heart size={13} fill={entry?.is_favorite ? 'currentColor' : 'none'} /> Preferito
            </button>
          )}
          {friends.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSuggest(!showSuggest)}>
              <Send size={13} /> Suggerisci
            </button>
          )}
        </div>

        {/* Labels (solo se inLibrary) */}
        {inLibrary && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
              <Tag size={12} style={{ verticalAlign: 'middle' }} /> Etichette
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {FIXED_LABELS.map(l => (
                <button
                  key={l}
                  className={`label-pill ${(entry.labels || []).includes(l) ? 'label-pill-selected' : ''}`}
                  onClick={() => handleToggleLabel(l)}
                >{l}</button>
              ))}
              {(entry.labels || []).filter(l => !FIXED_LABELS.includes(l)).map(l => (
                <button key={l} className="label-pill label-pill-selected" onClick={() => handleToggleLabel(l)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="input"
                placeholder="Aggiungi etichetta…"
                value={customLabelInput}
                onChange={e => setCustomLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCustomLabel()}
                style={{ fontSize: 12, flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddCustomLabel}><Plus size={12} /></button>
            </div>
            {usedCustomLabels.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {usedCustomLabels.filter(l => !(entry.labels || []).includes(l)).slice(0, 6).map(l => (
                  <button key={l} className="label-pill" style={{ fontSize: 10 }} onClick={() => handleToggleLabel(l)}>+ {l}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes (solo se inLibrary) */}
        {inLibrary && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Note</div>
            <textarea
              className="input"
              rows={3}
              placeholder="Com'è andata? Cosa hai mangiato?..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              onBlur={handleNotesBlur}
              style={{ fontSize: 13, width: '100%', resize: 'vertical' }}
            />
          </div>
        )}

        {/* Suggerisci ad amico */}
        {showSuggest && (
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Suggerisci a un amico</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {friends.map(f => (
                <button
                  key={f.friend_id}
                  className={`btn btn-sm ${selectedFriend === f.friend_id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedFriend(f.friend_id)}
                >
                  {f.profiles?.full_name || f.profiles?.email}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Aggiungi un commento (opzionale)"
              value={suggestComment}
              onChange={e => setSuggestComment(e.target.value)}
              style={{ marginBottom: 8, fontSize: 13 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSuggest} disabled={!selectedFriend}>
              <Send size={12} /> Invia consiglio
            </button>
          </div>
        )}

        {/* Ristoranti simili */}
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={showSimilar ? () => setShowSimilar(false) : handleLoadSimilar}
            style={{ marginBottom: 12 }}
          >
            {showSimilar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <Sparkles size={12} /> Ristoranti simili
          </button>
          {showSimilar && (
            loadingSimilar
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="loader" /></div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {similar.map((s, i) => (
                    <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleSimilarClick(s)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {s.name}
                          {s.city && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}> · {s.city}</span>}
                        </div>
                        {s.stars && <div style={{ color: 'var(--accent)', fontSize: 13 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                      </div>
                      {s.cuisine && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{s.cuisine}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.reason}</div>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>
    </div>
  )
}
