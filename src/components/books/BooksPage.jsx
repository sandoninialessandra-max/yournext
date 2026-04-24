import { useState, useEffect, useCallback } from 'react'
import { Search, Heart, Sparkles, TrendingUp } from 'lucide-react'
import { googleBooks } from '../../lib/googlebooks.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'
import BookModal from './BookModal.jsx'

const TABS = ['I miei libri', 'Scopri', 'Consigli AI']

export default function BooksPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('I miei libri')
  const [subTab, setSubTab] = useState('read')
  const [readBooks, setReadBooks] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [trending, setTrending] = useState([])
  const [newReleases, setNewReleases] = useState([])
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [filterFav, setFilterFav] = useState(false)

  const loadBooks = useCallback(async () => {
    if (!user) return
    setLoadingBooks(true)
    const data = await db.getReadBooks(user.id)
    setReadBooks(data)
    setLoadingBooks(false)
  }, [user])

  useEffect(() => { loadBooks() }, [loadBooks])

  useEffect(() => {
    if (tab === 'Scopri') {
      googleBooks.getTrending().then(setTrending)
      googleBooks.getNewReleases().then(setNewReleases)
    }
  }, [tab])

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await googleBooks.search(q)
    setSearchResults(results)
    setSearching(false)
  }

  const handleAddBook = async (book, status = 'read') => {
    await db.addReadBook(user.id, book, status)
    const labels = { read: 'letto', reading: 'in lettura', wishlist: 'da leggere' }
    toast(`"${book.title}" aggiunto come ${labels[status]}! 📚`, 'success')
    loadBooks()
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAiBookClick = async (title, originalTitle, authors, year) => {
    const query = `${originalTitle || title} ${authors || ''} ${year || ''}`.trim()
    let results = await googleBooks.search(query)
    if (!results.length) results = await googleBooks.search(originalTitle || title)
    if (!results.length) results = await googleBooks.search(title)
    if (results.length > 0) setSelectedBookId(results[0].id)
    else toast('Libro non trovato', 'error')
  }

  const byStatus = (status) => readBooks.filter(b => b.status === status)
  const read = byStatus('read')
  const reading = byStatus('reading')
  const wishlist = byStatus('wishlist')

  const displayed =
    subTab === 'read' ? (filterFav ? read.filter(b => b.is_favorite) : read)
    : subTab === 'reading' ? reading
    : wishlist

  return (
    <div className="scroll-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Libri</h1>
          <p className="page-subtitle">
            {read.length} letti · {reading.length} in lettura · {wishlist.length} da leggere · {read.filter(b => b.is_favorite).length} preferiti
          </p>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* ── TAB: I MIEI LIBRI ── */}
      {tab === 'I miei libri' && (
        <div className="section">
          {/* Subtoggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${subTab === 'read' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('read')}>
              ✓ Letti ({read.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'reading' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('reading')}>
              📖 In lettura ({reading.length})
            </button>
            <button className={`btn btn-sm ${subTab === 'wishlist' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubTab('wishlist')}>
              🔖 Da leggere ({wishlist.length})
            </button>
            {subTab === 'read' && (
              <button className={`btn btn-sm ${filterFav ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setFilterFav(!filterFav)}>
                <Heart size={12} fill={filterFav ? 'currentColor' : 'none'} /> Preferiti
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <div className="search-bar">
              <Search size={16} className="search-bar-icon" />
              <input className="input" placeholder="Cerca un libro..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            </div>
            {searchQuery.length >= 2 && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', marginTop: 4, overflow: 'hidden' }}>
                {searching && <div style={{ padding: 16, textAlign: 'center' }}><div className="loader" /></div>}
                {!searching && searchResults.length === 0 && <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>Nessun risultato</div>}
                {searchResults.slice(0, 6).map(b => {
                  const alreadyRead = readBooks.some(r => r.book_id === b.id && r.status === 'read')
                  const inReading = readBooks.some(r => r.book_id === b.id && r.status === 'reading')
                  const inWishlist = readBooks.some(r => r.book_id === b.id && r.status === 'wishlist')
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
                      {b.cover
                        ? <img src={b.cover} alt={b.title} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 54, background: 'var(--bg4)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📚</div>}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.authors} · {b.year}</div>
                      </div>
                      {alreadyRead
                        ? <span style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0, whiteSpace: 'nowrap' }}>✓ Letto</span>
                        : inReading
                        ? <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0, whiteSpace: 'nowrap' }}>📖 In lettura</span>
                        : inWishlist
                        ? <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0, whiteSpace: 'nowrap' }}>🔖 Wishlist</span>
                        : <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAddBook(b, 'read')}>✓</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAddBook(b, 'reading')}>📖</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAddBook(b, 'wishlist')}>🔖</button>
                          </div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Grid */}
          {loadingBooks
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
            : displayed.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h3>
                  {subTab === 'wishlist' ? 'Nessun libro da leggere'
                   : subTab === 'reading' ? 'Nessun libro in lettura'
                   : filterFav ? 'Nessun preferito'
                   : 'Nessun libro ancora'}
                </h3>
                <p>Cerca un libro qui sopra!</p>
              </div>
            : <div className="movies-grid">
                {displayed.map(b => (
                  <div key={b.book_id} className="movie-card" onClick={() => setSelectedBookId(b.book_id)}>
                    {b.book_cover
                      ? <img className="movie-card-poster" src={b.book_cover} alt={b.book_title} loading="lazy" />
                      : <div className="movie-card-poster-placeholder">📚</div>}
                    {b.is_favorite && <div className="movie-card-fav">❤️</div>}
                    {b.rating && <div className="movie-card-badge">★ {b.rating}</div>}
                    {b.status === 'wishlist' && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>🔖</div>}
                    {b.status === 'reading' && b.book_pages > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--bg4)' }}>
                        <div style={{ height: '100%', background: 'var(--accent)', width: `${Math.min(100, ((b.current_page || 0) / b.book_pages) * 100)}%`, transition: 'width 0.3s' }} />
                      </div>
                    )}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{b.book_title}</div>
                      <div className="movie-card-year">{b.book_authors}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* ── TAB: SCOPRI ── */}
      {tab === 'Scopri' && (
        <div className="section">
          <div className="section-title"><TrendingUp size={18} /> Trending</div>
          {trending.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid" style={{ marginBottom: 32 }}>
                {trending.map(b => {
                  const inLib = readBooks.some(r => r.book_id === b.id)
                  return (
                    <div key={b.id} className="movie-card" onClick={() => setSelectedBookId(b.id)}>
                      {b.cover ? <img className="movie-card-poster" src={b.cover} alt={b.title} loading="lazy" /> : <div className="movie-card-poster-placeholder">📚</div>}
                      {inLib && <div className="movie-card-fav" style={{ color: 'var(--green)' }}>✓</div>}
                      <div className="movie-card-body">
                        <div className="movie-card-title">{b.title}</div>
                        <div className="movie-card-year">{b.authors}</div>
                      </div>
                    </div>
                  )
                })}
              </div>}

          <div className="section-title">🆕 Nuove uscite</div>
          {newReleases.length === 0
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loader" /></div>
            : <div className="movies-grid">
                {newReleases.map(b => (
                  <div key={b.id} className="movie-card" onClick={() => setSelectedBookId(b.id)}>
                    {b.cover ? <img className="movie-card-poster" src={b.cover} alt={b.title} loading="lazy" /> : <div className="movie-card-poster-placeholder">📚</div>}
                    <div className="movie-card-body">
                      <div className="movie-card-title">{b.title}</div>
                      <div className="movie-card-year">{b.authors} · {b.year}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* ── TAB: CONSIGLI AI ── */}
      {tab === 'Consigli AI' && (
        <div className="section">
          {read.length < 3
            ? <div className="empty-state">
                <div className="empty-state-icon"><Sparkles size={40} /></div>
                <h3>Aggiungi almeno 3 libri letti</h3>
                <p>I consigli AI si basano sui tuoi gusti!</p>
              </div>
            : !aiSuggestions
            ? <div className="ai-card" style={{ textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Consigli personalizzati</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
                  L'AI analizzerà i tuoi {read.length} libri e i {read.filter(b => b.is_favorite).length} preferiti per darti suggerimenti su misura.
                </p>
                <button className="btn btn-primary" onClick={async () => {
                  setLoadingAi(true)
                  const suggestions = await ai.getPersonalizedBookSuggestions(readBooks)
                  setAiSuggestions(suggestions)
                  setLoadingAi(false)
                }} disabled={loadingAi}>
                  {loadingAi ? <><span className="loader" style={{ width: 14, height: 14 }} /> Analisi...</> : <><Sparkles size={14} /> Genera consigli</>}
                </button>
              </div>
            : <div>
                {aiSuggestions.classics?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">📖 Classici per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.classics.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiBookClick(s.title, s.original_title, s.authors, s.year)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {s.original_title || s.title}
                              {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> / {s.title}</span>}
                              <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> ({s.year})</span>
                            </div>
                            {s.stars && <div style={{ color: 'var(--accent)', fontSize: 14 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                          </div>
                          {s.authors && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{s.authors}</div>}
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiSuggestions.recent?.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">📚 Recenti per te</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.recent.map((s, i) => (
                        <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleAiBookClick(s.title, s.original_title, s.authors, s.year)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {s.original_title || s.title}
                              {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> / {s.title}</span>}
                              <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> ({s.year})</span>
                            </div>
                            {s.stars && <div style={{ color: 'var(--accent)', fontSize: 14 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                          </div>
                          {s.authors && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{s.authors}</div>}
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

      {selectedBookId && (
        <BookModal
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
          readBooks={readBooks}
          onUpdate={loadBooks}
        />
      )}
    </div>
  )
}