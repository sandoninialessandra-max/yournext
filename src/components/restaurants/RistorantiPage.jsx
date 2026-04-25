import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Heart, Sparkles, Plus, X, Bookmark, Tag, MapPin } from 'lucide-react'
import { placesProvider } from '../../lib/placesProvider.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import RestaurantModal from './RestaurantModal.jsx'
import RestaurantPlaceholder from './RestaurantPlaceholder.jsx'

const TABS = ['I miei ristoranti', 'Scopri', 'Consigli AI']
const CATEGORIES = ['Aperitivo', 'Cena', 'Romantico', 'Pizza', 'Italiano', 'Giapponese', 'Cinese', 'Hamburger']
const FIXED_LABELS = ['🍹 Aperitivo', '🍽️ Cena', '☀️ Pranzo', '💑 Romantico', '👥 Amici', '👨‍👩‍👧 Famiglia', '💼 Lavoro', '⭐ Speciale']
const priceSymbol = (n) => n ? '€'.repeat(n) : '—'

export default function RistorantiPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('I miei ristoranti')
  const [subTab, setSubTab] = useState('visited')
  const [visitedRestaurants, setVisitedRestaurants] = useState([])
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [userCities, setUserCities] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [newCityInput, setNewCityInput] = useState('')
  const [selectedLabels, setSelectedLabels] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [popular, setPopular] = useState([])
  const [loadingPopular, setLoadingPopular] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRestaurantId = searchParams.get('r') || null
  const setSelectedRestaurantId = (id) => setSearchParams(id ? { r: id } : {})
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)

  const loadRestaurants = useCallback(async () => {
    if (!user) return
    setLoadingRestaurants(true)
    const data = await db.getVisitedRestaurants(user.id)
    setVisitedRestaurants(data)
    setLoadingRestaurants(false)
  }, [user])

  const loadCities = useCallback(async () => {
    if (!user) return
    const data = await db.getUserCities(user.id)
    setUserCities(data)
    if (data.length > 0 && !selectedCity) setSelectedCity(data[0].city_name)
  }, [user, selectedCity])

  useEffect(() => { loadRestaurants() }, [loadRestaurants])
  useEffect(() => { loadCities() }, [loadCities])

  useEffect(() => {
    if (tab === 'Scopri' && selectedCity && selectedCity !== 'Altro') {
      setLoadingPopular(true)
      placesProvider.getPopular(selectedCity, selectedCategory)
        .then(setPopular)
        .finally(() => setLoadingPopular(false))
    }
  }, [tab, selectedCity, selectedCategory])

  useEffect(() => {
    if (searchQuery.length < 3 || !selectedCity) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const city = selectedCity === 'Altro' ? '' : selectedCity
    const timer = setTimeout(() => {
      placesProvider.search(searchQuery, city)
        .then(setSearchResults)
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCity])

  const handleAddCity = async () => {
    const name = newCityInput.trim()
    if (!name) return
    await db.addUserCity(user.id, name)
    setNewCityInput('')
    toast('Città aggiunta', 'success')
    const data = await db.getUserCities(user.id)
    setUserCities(data)
    setSelectedCity(name)
  }

  const handleRemoveCity = async (cityName) => {
    await db.removeUserCity(user.id, cityName)
    const data = await db.getUserCities(user.id)
    setUserCities(data)
    if (selectedCity === cityName) setSelectedCity(data.length > 0 ? data[0].city_name : null)
  }

  const handleSearch = (q) => {
    setSearchQuery(q)
  }

  const handleAddFromSearch = async (place, status) => {
    await db.addVisitedRestaurant(user.id, place, status)
    const label = status === 'visited' ? 'visitato ✓' : 'nella wishlist 🔖'
    toast(`"${place.name}" ${label}`, 'success')
    setSearchQuery('')
    setSearchResults([])
    loadRestaurants()
  }

  const handleToggleLabel = (label) => {
    setSelectedLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }

  const handleAiClick = async (s) => {
    const results = await placesProvider.search(s.name, s.city)
    if (results.length > 0) setSelectedRestaurantId(results[0].id)
    else toast('Ristorante non trovato', 'error')
  }

  const byStatus = (st) => visitedRestaurants.filter(r => r.status === st)
  const visited = byStatus('visited')
  const wishlist = byStatus('wishlist')
  const currentStatusList = subTab === 'visited' ? visited : wishlist
  const cityNames = userCities.map(c => c.city_name)
  const displayed = currentStatusList
    .filter(r => {
      if (!selectedCity) return true
      if (selectedCity === 'Altro') return !cityNames.includes(r.restaurant_city)
      return r.restaurant_city === selectedCity
    })
    .filter(r => selectedLabels.length === 0 || (r.labels || []).some(l => selectedLabels.includes(l)))

  const favoriteCount = visitedRestaurants.filter(r => r.is_favorite).length

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ristoranti</h1>
          <p className="page-subtitle">
            {visited.length} visitati · {wishlist.length} in wishlist · {favoriteCount} preferiti
          </p>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* ── TAB: I MIEI RISTORANTI ── */}
      {tab === 'I miei ristoranti' && (
        <div className="section">
          {/* Subtoggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${subTab === 'visited' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('visited')}>
              ✓ Visitati ({visited.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('wishlist')}>
              🔖 Wishlist ({wishlist.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'search' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('search')}>
              🔍 Cerca
            </button>
          </div>

          {/* City selector */}
          {userCities.length === 0
            ? <div className="empty-state" style={{ padding: '24px 16px', marginBottom: 16 }}>
                <div className="empty-state-icon">📍</div>
                <h3>Aggiungi la tua prima città</h3>
                <p>Inizia aggiungendo una città preferita qui sotto.</p>
                <div className="city-chip-add" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <input
                    placeholder="Nome città..."
                    value={newCityInput}
                    onChange={e => setNewCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCity()}
                  />
                  <button className="btn btn-sm btn-primary" onClick={handleAddCity}><Plus size={12} /></button>
                </div>
              </div>
            : <div className="city-chips-row" style={{ marginBottom: 16 }}>
                {userCities.map(c => (
                  <button
                    key={c.id}
                    className={`city-chip ${selectedCity === c.city_name ? 'active' : ''}`}
                    onClick={() => setSelectedCity(c.city_name)}
                  >
                    {c.city_name}
                    <span
                      className="city-chip-remove"
                      onClick={(e) => { e.stopPropagation(); handleRemoveCity(c.city_name) }}
                    >×</span>
                  </button>
                ))}
                <button
                  className={`city-chip ${selectedCity === 'Altro' ? 'active' : ''}`}
                  onClick={() => setSelectedCity('Altro')}
                >
                  Altro
                </button>
                <div className="city-chip-add">
                  <input
                    placeholder="Aggiungi..."
                    value={newCityInput}
                    onChange={e => setNewCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCity()}
                  />
                  <button className="btn btn-sm btn-primary" onClick={handleAddCity}><Plus size={12} /></button>
                </div>
              </div>}

          {/* Label filter — hidden in search subtab */}
          {subTab !== 'search' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>
                <Tag size={12} style={{ verticalAlign: 'middle' }} /> Filtra:
              </span>
              {FIXED_LABELS.map(l => (
                <button
                  key={l}
                  className={`label-pill ${selectedLabels.includes(l) ? 'label-pill-selected' : ''}`}
                  onClick={() => handleToggleLabel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Search — only in search subtab */}
          {subTab === 'search' && (
          <div style={{ marginBottom: 16 }}>
            <div className="search-bar">
              <Search size={16} className="search-bar-icon" />
              <input
                className="input"
                placeholder={selectedCity ? 'Cerca un ristorante...' : 'Seleziona prima una città'}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                disabled={!selectedCity}
                autoFocus
              />
            </div>
            {searchQuery.length < 3 && (
              <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                {selectedCity ? 'Digita almeno 3 caratteri per cercare' : 'Seleziona una città per iniziare'}
              </div>
            )}
            {searchQuery.length >= 3 && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', marginTop: 4, overflow: 'hidden' }}>
                {searching && <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>}
                {!searching && searchResults.length === 0 && <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>Nessun risultato</div>}
                {searchResults.map(p => {
                  const already = visitedRestaurants.some(r => r.restaurant_id === p.id)
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
                      {p.cover
                        ? <img src={p.cover} alt={p.name} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        : <RestaurantPlaceholder cuisine={p.cuisine} size="searchRow" style={{ width: 36, height: 54, borderRadius: 4, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.cuisine} · <span className="price-level">{priceSymbol(p.priceLevel)}</span>
                        </div>
                      </div>
                      {already
                        ? <span style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0, whiteSpace: 'nowrap' }}>✓ In libreria</span>
                        : <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAddFromSearch(p, 'visited')}>✓</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAddFromSearch(p, 'wishlist')}>🔖</button>
                          </div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* Grid — only in visited/wishlist subtabs */}
          {subTab !== 'search' && (
          loadingRestaurants
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
            : displayed.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <h3>{subTab === 'wishlist' ? 'Nessun ristorante da provare' : 'Nessun ristorante ancora'}</h3>
                <p>Vai al sub-tab <strong>🔍 Cerca</strong> per aggiungerne uno.</p>
              </div>
            : <div className="restaurants-list">
                {displayed.map(r => {
                  const meta = [r.restaurant_cuisine, r.restaurant_city, priceSymbol(r.restaurant_price_level)].filter(Boolean).join(' · ')
                  const labelsPreview = (r.labels || []).slice(0, 2).join(' ')
                  return (
                    <div key={r.restaurant_id} className="restaurant-row" onClick={() => setSelectedRestaurantId(r.restaurant_id)}>
                      {r.restaurant_cover
                        ? <img className="restaurant-row-thumb" src={r.restaurant_cover} alt={r.restaurant_name} style={{ objectFit: 'cover' }} loading="lazy" />
                        : <RestaurantPlaceholder cuisine={r.restaurant_cuisine} size="searchRow" className="restaurant-row-thumb" />}
                      <div className="restaurant-row-body">
                        <div className="restaurant-row-name">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.restaurant_name}</span>
                          {r.is_favorite && <span style={{ fontSize: 12 }}>❤️</span>}
                          {r.status === 'wishlist' && <Bookmark size={12} />}
                        </div>
                        <div className="restaurant-row-meta">
                          {meta}{labelsPreview && ` · ${labelsPreview}`}
                          {r.notes && ` · ${r.notes.slice(0, 30)}${r.notes.length > 30 ? '…' : ''}`}
                        </div>
                      </div>
                      <div className="restaurant-row-aside">
                        {r.rating && (
                          <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
                            ★ {r.rating}
                          </span>
                        )}
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(`${r.restaurant_name} ${r.restaurant_address || ''} ${r.restaurant_city || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Apri su Google Maps"
                          style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', padding: 6, borderRadius: 6, background: 'var(--accent-glow)' }}
                        >
                          <MapPin size={18} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
          )}
        </div>
      )}

      {/* ── TAB: SCOPRI ── */}
      {tab === 'Scopri' && (
        <div className="section">
          {userCities.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">📍</div>
                <h3>Nessuna città configurata</h3>
                <p>Aggiungi almeno una città preferita per scoprire ristoranti popolari.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('I miei ristoranti')}>
                  Aggiungi città
                </button>
              </div>
            : <>
                <div className="city-chips-row" style={{ marginBottom: 12 }}>
                  {userCities.map(c => (
                    <button
                      key={c.id}
                      className={`city-chip ${selectedCity === c.city_name ? 'active' : ''}`}
                      onClick={() => setSelectedCity(c.city_name)}
                    >
                      {c.city_name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      className={`btn btn-sm ${selectedCategory === c ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {selectedCity && selectedCategory
                  ? loadingPopular
                    ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
                    : popular.length === 0
                    ? <div className="empty-state">
                        <div className="empty-state-icon">🍽️</div>
                        <h3>Nessun risultato</h3>
                        <p>Prova un'altra categoria o città.</p>
                      </div>
                    : <div className="movies-grid">
                        {popular.map(p => (
                          <div key={p.id} className="movie-card" onClick={() => setSelectedRestaurantId(p.id)}>
                            {p.cover
                              ? <img className="movie-card-poster" src={p.cover} alt={p.name} loading="lazy" />
                              : <RestaurantPlaceholder cuisine={p.cuisine} className="movie-card-poster" />}
                            {p.rating && <div className="movie-card-badge">★ {p.rating}</div>}
                            <div className="movie-card-body">
                              <div className="movie-card-title">{p.name}</div>
                              <div className="movie-card-year">{p.cuisine}</div>
                              <div style={{ fontSize: 11, marginTop: 2 }}>
                                <span className="price-level">{priceSymbol(p.priceLevel)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                  : <div className="empty-state">
                      <div className="empty-state-icon">🍽️</div>
                      <h3>Scegli città e categoria</h3>
                      <p>Seleziona una città preferita e una categoria qui sopra.</p>
                    </div>}
              </>}
        </div>
      )}

      {/* ── TAB: CONSIGLI AI ── */}
      {tab === 'Consigli AI' && (
        <div className="section">
          {visited.length < 3
            ? <div className="empty-state">
                <div className="empty-state-icon"><Sparkles size={40} /></div>
                <h3>Aggiungi almeno 3 ristoranti visitati</h3>
                <p>I consigli AI si basano sui tuoi gusti!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('I miei ristoranti')}>
                  Vai a I miei ristoranti
                </button>
              </div>
            : !aiSuggestions
            ? <div className="ai-card" style={{ textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Consigli personalizzati</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                  L'AI analizzerà i tuoi {visited.length} ristoranti visitati per suggerirti nuovi posti da provare.
                </p>
                <button className="btn btn-primary" onClick={async () => {
                  setLoadingAi(true)
                  const suggestions = await ai.getPersonalizedRestaurantSuggestions(visitedRestaurants)
                  setAiSuggestions(suggestions)
                  setLoadingAi(false)
                }} disabled={loadingAi}>
                  {loadingAi ? <><span className="loader" style={{ width: 14, height: 14 }} /> Analisi...</> : <><Sparkles size={14} /> Genera consigli</>}
                </button>
              </div>
            : <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {aiSuggestions.map((s, i) => (
                    <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiClick(s)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {s.name}
                          {s.city && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> · {s.city}</span>}
                        </div>
                        {s.stars && <div style={{ color: 'var(--accent)', fontSize: 14 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                      </div>
                      {s.cuisine && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{s.cuisine}</div>}
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{s.reason}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setAiSuggestions(null)}>↺ Rigenera</button>
              </div>}
        </div>
      )}

      {selectedRestaurantId && (
        <RestaurantModal
          restaurantId={selectedRestaurantId}
          onClose={() => setSelectedRestaurantId(null)}
          visitedRestaurants={visitedRestaurants}
          onUpdate={loadRestaurants}
        />
      )}
    </div>
  )
}
