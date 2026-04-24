import { useState, useEffect } from 'react'
import { X, Heart, BookOpen, Bookmark, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { googleBooks } from '../../lib/googlebooks.js'
import { db } from '../../lib/db.js'
import { ai } from '../../lib/gemini.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../shared/Toast.jsx'

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null)
  const stars = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => {
          const active = hover !== null ? hover : value
          const full = active >= star
          const half = !full && active >= star - 0.5
          return (
            <div key={star} style={{ position: 'relative', width: 20, height: 20, cursor: 'pointer' }}>
              <svg viewBox="0 0 20 20" style={{ width: 20, height: 20, position: 'absolute' }}>
                <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={full ? 'var(--accent)' : half ? 'url(#half)' : 'var(--bg4)'} stroke="var(--accent)" strokeWidth="0.5" />
                <defs><linearGradient id="half"><stop offset="50%" stopColor="var(--accent)" /><stop offset="50%" stopColor="var(--bg4)" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }} onMouseEnter={() => setHover(star - 0.5)} onMouseLeave={() => setHover(null)} onClick={() => onChange(star - 0.5)} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%' }} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(null)} onClick={() => onChange(star)} />
            </div>
          )
        })}
      </div>
      {value && <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>✕</button>}
    </div>
  )
}

export default function BookModal({ bookId, onClose, readBooks, onUpdate }) {
  const { user } = useAuth()
  const toast = useToast()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [similar, setSimilar] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [friends, setFriends] = useState([])
  const [suggestComment, setSuggestComment] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [progressInput, setProgressInput] = useState('')
  const [editingProgress, setEditingProgress] = useState(false)

  const entry = readBooks.find(b => b.book_id === bookId)
  const isRead = entry?.status === 'read'
  const isReading = entry?.status === 'reading'
  const isWishlist = entry?.status === 'wishlist'
  const inLibrary = !!entry

  useEffect(() => {
    googleBooks.getBook(bookId).then(b => { setBook(b); setLoading(false) })
    db.getFriends(user.id).then(setFriends)
  }, [bookId, user.id])

  useEffect(() => {
    if (entry?.current_page) setProgressInput(String(entry.current_page))
  }, [entry])

  const handleStatus = async (status) => {
    if (!book) return
    if (inLibrary && entry.status === status) {
      await db.removeReadBook(user.id, bookId)
      toast(`"${book.title}" rimosso dalla libreria`, 'success')
    } else {
      await db.addReadBook(user.id, book, status)
      const labels = { read: 'letto ✓', reading: 'in lettura 📖', wishlist: 'da leggere 🔖' }
      toast(`"${book.title}" segnato come ${labels[status]}!`, 'success')
    }
    onUpdate()
  }

  const handleFavorite = async () => {
    if (!inLibrary || !book) return
    await db.toggleBookFavorite(user.id, bookId, entry.is_favorite)
    onUpdate()
  }

  const handleRating = async (rating) => {
    if (!inLibrary) return
    await db.updateBookRating(user.id, bookId, rating)
    onUpdate()
  }

  const handleProgress = async () => {
    const page = parseInt(progressInput)
    if (isNaN(page) || page < 0) return
    await db.updateBookProgress(user.id, bookId, page)
    toast('Progresso aggiornato!', 'success')
    setEditingProgress(false)
    onUpdate()
  }

  const handleSuggest = async () => {
    if (!selectedFriend || !book) return
    await db.sendBookSuggestion(user.id, selectedFriend, book, suggestComment)
    toast('Consiglio inviato!', 'success')
    setShowSuggest(false)
    setSuggestComment('')
    setSelectedFriend(null)
  }

  const handleLoadSimilar = async () => {
    if (!book) return
    setLoadingSimilar(true)
    setShowSimilar(true)
    const readTitles = readBooks.map(b => b.book_title)
    const results = await ai.getSimilarBooks(book, readTitles)
    setSimilar(results)
    setLoadingSimilar(false)
  }

  const handleSimilarClick = async (s) => {
    const query = `${s.original_title || s.title} ${s.authors || ''} ${s.year || ''}`.trim()
    let results = await googleBooks.search(query)
    if (!results.length) results = await googleBooks.search(s.original_title || s.title)
    if (results.length > 0) {
      setBook(null); setLoading(true); setSimilar([]); setShowSimilar(false)
      const newBook = await googleBooks.getBook(results[0].id)
      setBook(newBook); setLoading(false)
      window.history.replaceState(null, '', '')
    } else toast('Libro non trovato su Google Books', 'error')
  }

  const progressPct = book?.pages && entry?.current_page
    ? Math.min(100, Math.round((entry.current_page / book.pages) * 100)) : 0

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="loader" />
      </div>
    </div>
  )

  if (!book) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18} /></button>

        {/* Header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          {book.cover
            ? <img src={book.cover} alt={book.title} style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            : <div style={{ width: 100, height: 150, background: 'var(--bg4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>📚</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{book.title}</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{book.authors}</p>
            {book.publisher && <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 4 }}>{book.publisher}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
              {book.year && <span>📅 {book.year}</span>}
              {book.pages && <span>📄 {book.pages} pagine</span>}
              {book.averageRating && <span>★ {book.averageRating}/5</span>}
            </div>
            {book.categories?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {book.categories.slice(0, 3).map((c, i) => (
                  <span key={i} style={{ background: 'var(--bg4)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--text2)' }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rating */}
        {inLibrary && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Il tuo voto</div>
            <StarRating value={entry?.rating} onChange={handleRating} />
          </div>
        )}

        {/* Progress bar — solo se in lettura */}
        {isReading && book.pages > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Progresso lettura</span>
              <span style={{ fontSize: 12, color: 'var(--accent)' }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, marginBottom: 8 }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${progressPct}%`, transition: 'width 0.3s' }} />
            </div>
            {editingProgress
              ? <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" className="input" value={progressInput}
                    onChange={e => setProgressInput(e.target.value)}
                    placeholder="Pagina attuale" min={0} max={book.pages}
                    style={{ width: 120, fontSize: 13 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>/ {book.pages}</span>
                  <button className="btn btn-primary btn-sm" onClick={handleProgress}>Salva</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingProgress(false)}>Annulla</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setEditingProgress(true)}>
                  📖 Aggiorna pagina ({entry?.current_page || 0} / {book.pages})
                </button>}
          </div>
        )}

        {/* Trama */}
        {book.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{book.description.slice(0, 400)}{book.description.length > 400 ? '…' : ''}</div>
          </div>
        )}

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            className={`btn btn-sm ${isRead ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatus('read')}
          >
            <BookOpen size={13} /> {isRead ? 'Letto ✓' : 'Segna come letto'}
          </button>
          <button
            className={`btn btn-sm ${isReading ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatus('reading')}
          >
            📖 {isReading ? 'In lettura ✓' : 'Sto leggendo'}
          </button>
          <button
            className={`btn btn-sm ${isWishlist ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatus('wishlist')}
          >
            <Bookmark size={13} /> {isWishlist ? 'Da leggere ✓' : 'Da leggere'}
          </button>
          {inLibrary && (
            <button
              className={`btn btn-sm ${entry?.is_favorite ? 'btn-danger' : 'btn-secondary'}`}
              onClick={handleFavorite}
            >
              <Heart size={13} fill={entry?.is_favorite ? 'currentColor' : 'none'} />
              {entry?.is_favorite ? 'Preferito' : 'Preferito'}
            </button>
          )}
          {friends.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSuggest(!showSuggest)}>
              <Send size={13} /> Suggerisci
            </button>
          )}
        </div>

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
              className="input" placeholder="Aggiungi un commento (opzionale)"
              value={suggestComment} onChange={e => setSuggestComment(e.target.value)}
              style={{ marginBottom: 8, fontSize: 13 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSuggest} disabled={!selectedFriend}>
              <Send size={12} /> Invia consiglio
            </button>
          </div>
        )}

        {/* Libri simili */}
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={showSimilar ? () => setShowSimilar(false) : handleLoadSimilar}
            style={{ marginBottom: 12 }}
          >
            {showSimilar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Libri simili
          </button>
          {showSimilar && (
            loadingSimilar
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="loader" /></div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {similar.map((s, i) => (
                    <div key={i} className="ai-card" style={{ cursor: 'pointer' }} onClick={() => handleSimilarClick(s)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {s.original_title || s.title}
                          {s.original_title && s.original_title !== s.title && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}> / {s.title}</span>}
                          <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}> ({s.year})</span>
                        </div>
                        {s.stars && <div style={{ color: 'var(--accent)', fontSize: 13 }}>{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>}
                      </div>
                      {s.authors && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{s.authors}</div>}
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