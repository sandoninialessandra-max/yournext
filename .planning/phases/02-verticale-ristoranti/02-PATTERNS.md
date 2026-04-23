# Phase 2: Verticale Ristoranti — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 13 (new + modified + doc + schema)
**Analogs found:** 13/13 (ogni file ha un analog concreto nel codebase)

> Il mapping è **book-first, cinema-secondario**: la verticale Libri è la più recente e vicina in semantica a Ristoranti (rating mezzi voti, prerequisito 3 items per AI, modal a due azioni read/wishlist, `formatBook` normalizer, notifiche multi-tipo). Cinema rimane analog per sidebar nav, route shell, unread polling, merge feed in `NotificationsPage`.

---

## File Classification

| File | Kind | Role | Data Flow | Closest Analog(s) | Match |
|---|---|---|---|---|---|
| `src/lib/placesProvider.js` | NEW | lib / dispatcher | request-response | `src/lib/tmdb.js`, `src/lib/googlebooks.js` | role-match (nuovo kind: dispatcher — non esiste precedente) |
| `src/lib/foursquare.js` | NEW | lib / REST client | request-response | `src/lib/googlebooks.js` (1-64) + `formatBook` (3-19) | exact |
| `src/components/restaurants/RistorantiPage.jsx` | NEW | page / 3-tab container | CRUD + AI batch | `src/components/books/BooksPage.jsx` (1-320) | exact |
| `src/components/restaurants/RestaurantModal.jsx` | NEW | modal / detail+actions | CRUD + event-driven | `src/components/books/BookModal.jsx` (1-312) | exact |
| `src/components/shared/StarRating.jsx` | NEW (opzionale, estratto) | shared component | event-driven | `src/components/books/BookModal.jsx` (9-34) | exact (copy inline) |
| `src/lib/db.js` | MODIFIED | service / Supabase CRUD | CRUD | same file — sezioni `// ── LIBRI` (134-209) + `// Watched movies` (4-107) | exact (estensione namespace const-object) |
| `src/lib/gemini.js` | MODIFIED | ai / LLM orchestrator | request-response (Promise.allSettled) | same file — `getSimilarBooks` (142-157) + `getPersonalizedBookSuggestions` (160-191) | exact |
| `src/App.jsx` | MODIFIED | route shell + unread polling | event-driven (setInterval) | same file (30-86) | exact (aggiungere route + somma polling) |
| `src/components/layout/Sidebar.jsx` | MODIFIED | nav | event-driven | same file (11-15) | exact (push su `navItems`) |
| `src/components/cinema/NotificationsPage.jsx` | MODIFIED | feed aggregator | batch / request-response | same file (13-32) — `Promise.all` merge 2 stream | exact (passare a 3 stream) |
| `src/styles/main.css` | MODIFIED | global stylesheet | static | `.movie-card`, `.ai-card`, `.suggestion-card`, `.tab`, `.btn` (esistenti — append-only) | partial (classi nuove `.city-chip` / `.label-pill` / `.price-level` da aggiungere) |
| `supabase_schema.sql` | MODIFIED | schema DDL + RLS | static | same file — `watched_movies` (16-28) + `movie_suggestions` (40-51) + RLS (57-83) | exact |
| `.env.example` | MODIFIED | config | static | same file (1-12) | exact (append `VITE_PLACES_PROVIDER` + `VITE_FOURSQUARE_API_KEY`) |
| `.planning/PROJECT.md` | MODIFIED (DOC) | planning artifact | — | existing Key Decisions row | exact (in-place text update) |
| `.planning/REQUIREMENTS.md` | MODIFIED (DOC) | planning artifact | — | same file RIST-01..09 block (81-89) + traceability matrix (128-136) | exact (add RIST-10 row + extend RIST-01 source path) |
| `.planning/ROADMAP.md` | MODIFIED (DOC) | planning artifact | — | same file (36) | exact (RIST-10 nel Requirements list) |

---

## Pattern Assignments

### 1. `src/lib/placesProvider.js` (NEW — dispatcher layer)

**Analog:** nessun precedente diretto di dispatcher. Modellare la **forma** su `src/lib/tmdb.js` (namespace const-object) + la **selezione provider** su un blocco `if/else` in testa al file che risolve `import.meta.env.VITE_PLACES_PROVIDER`.

**Pattern da replicare — namespace shape (da `src/lib/tmdb.js:5-54`):**
```js
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

export const tmdb = {
  posterUrl: (path, size = 'w500') => path ? `${TMDB_IMG}/${size}${path}` : null,
  async search(query) { ... },
  async getMovie(id) { ... },
  ...
}
```

**Pattern da costruire (scheletro target):**
```js
import { foursquare } from './foursquare.js'

const PROVIDER = import.meta.env.VITE_PLACES_PROVIDER || 'foursquare'

function active() {
  if (PROVIDER === 'foursquare') return foursquare
  if (PROVIDER === 'google') throw new Error('Provider "google" non implementato in v1')
  throw new Error(`VITE_PLACES_PROVIDER="${PROVIDER}" non supportato`)
}

export const placesProvider = {
  search: (query, city) => active().search(query, city),
  getPlace: (id) => active().getPlace(id),
  getPopular: (city, category) => active().getPopular(city, category),
  coverUrl: (photo) => active().coverUrl(photo),
}
```

**Deviazioni richieste:**
- È un dispatcher puro, non un REST client. Non fa `fetch` né tiene `BASE`/`KEY` costanti — quelle vivono in `foursquare.js`.
- L'errore "provider non implementato" è **intenzionalmente visibile** (non silenzioso) per coerenza con criterio success #6 del ROADMAP.

**Gotchas:**
- `export const placesProvider = { ... }` (named, non default) — stesso idiom di `tmdb` / `googleBooks` / `db` / `ai`.
- Import con estensione `.js` esplicita: `from './foursquare.js'`.
- No semicolons finali, 2-space indent, single quotes.

---

### 2. `src/lib/foursquare.js` (NEW — REST client)

**Analog primario:** `src/lib/googlebooks.js` (intero file — 64 righe).
**Analog secondario (struttura URL + env):** `src/lib/tmdb.js` (1-3, 15-17).

**Pattern da replicare — normalizer puro + namespace (`src/lib/googlebooks.js:3-42`):**
```js
const BOOKS_BASE = 'https://www.googleapis.com/books/v1'

function formatBook(item) {
  if (!item) return null
  const info = item.volumeInfo || {}
  return {
    id: item.id,
    title: info.title || 'Titolo sconosciuto',
    authors: info.authors?.join(', ') || 'Autore sconosciuto',
    cover: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    ...
  }
}

export const googleBooks = {
  async search(query) {
    const res = await fetch(
      `${BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=12&langRestrict=it`
    )
    const data = await res.json()
    return (data.items || []).map(formatBook).filter(Boolean)
  },
  async getBook(id) { ... },
  async getTrending() { ... },
  coverUrl(cover) { return cover || null }
}
```

**Pattern da costruire (scheletro target):**
```js
const FSQ_BASE = 'https://api.foursquare.com/v3/places'
const FSQ_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY

function formatPlace(item) {
  if (!item) return null
  const loc = item.location || {}
  const name = item.name || 'Locale sconosciuto'
  const address = loc.address || ''
  return {
    id: item.fsq_id,
    name,
    address,
    city: loc.locality || '',
    cuisine: item.categories?.[0]?.name || '',
    priceLevel: item.price || null,
    rating: item.rating ?? null,
    cover: item.photos?.[0] ? `${item.photos[0].prefix}300x300${item.photos[0].suffix}` : null,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${address}`)}`,
  }
}

export const foursquare = {
  async search(query, city) {
    const res = await fetch(
      `${FSQ_BASE}/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(city || '')}&limit=12&fields=fsq_id,name,location,categories,price,rating,photos`,
      { headers: { Accept: 'application/json', Authorization: FSQ_KEY } }
    )
    const data = await res.json()
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  async getPlace(id) {
    const res = await fetch(
      `${FSQ_BASE}/${id}?fields=fsq_id,name,location,categories,price,rating,photos,description,hours,website`,
      { headers: { Accept: 'application/json', Authorization: FSQ_KEY } }
    )
    return formatPlace(await res.json())
  },
  async getPopular(city, category) { ... },
  coverUrl(photo) { return photo || null }
}
```

**Deviazioni richieste rispetto a `googlebooks.js`:**
- Foursquare richiede `Authorization: <apiKey>` come **header** (non querystring). Google Books è key-less per le query basiche.
- `id` = `fsq_id` (non `item.id`).
- `cover` si costruisce concatenando `photo.prefix + size + photo.suffix` (idiom Foursquare v3).
- `mapsUrl` è calcolato **lato normalizer** (D-09): `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + address)}`.

**Gotchas:**
- Seguire il pattern laissez-faire di `googlebooks.js` su `res.ok` — **non** aggiungere controllo `res.ok` in v1 (QUAL-02 è Phase 3, non Phase 2; documentato in CONVENTIONS.md §"Error Handling" riga 105-107).
- Niente `throw`. Defaults inline (`|| []`, `|| null`).
- Stesso stile: no semicolons, single quotes, 2-space indent, export const-object.

---

### 3. `src/components/restaurants/RistorantiPage.jsx` (NEW — page)

**Analog primario:** `src/components/books/BooksPage.jsx` (intero file — 320 righe).
**Analog secondario:** `src/components/cinema/CinemaPage.jsx` (subtab pattern — 81-117).

**Pattern da replicare — TABS + state + loader (`src/components/books/BooksPage.jsx:1-37`):**
```jsx
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
  ...

  const loadBooks = useCallback(async () => {
    if (!user) return
    setLoadingBooks(true)
    const data = await db.getReadBooks(user.id)
    setReadBooks(data)
    setLoadingBooks(false)
  }, [user])

  useEffect(() => { loadBooks() }, [loadBooks])
```

**Pattern da replicare — derived filter inline (`src/components/books/BooksPage.jsx:73-81`):**
```jsx
const byStatus = (status) => readBooks.filter(b => b.status === status)
const read = byStatus('read')
const reading = byStatus('reading')
const wishlist = byStatus('wishlist')

const displayed =
  subTab === 'read' ? (filterFav ? read.filter(b => b.is_favorite) : read)
  : subTab === 'reading' ? reading
  : wishlist
```

**Pattern da replicare — tabs render (`src/components/books/BooksPage.jsx:94-96`):**
```jsx
<div className="tabs" style={{ marginTop: 24 }}>
  {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
</div>
```

**Pattern da replicare — AI empty state + button (`src/components/books/BooksPage.jsx:240-261`):**
```jsx
{read.length < 3
  ? <div className="empty-state">
      <div className="empty-state-icon"><Sparkles size={40} /></div>
      <h3>Aggiungi almeno 3 libri letti</h3>
      <p>I consigli AI si basano sui tuoi gusti!</p>
    </div>
  : !aiSuggestions
  ? <div className="ai-card" style={{ textAlign: 'center' }}>
      <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: 16 }} />
      ...
      <button className="btn btn-primary" onClick={async () => {
        setLoadingAi(true)
        const suggestions = await ai.getPersonalizedBookSuggestions(readBooks)
        setAiSuggestions(suggestions)
        setLoadingAi(false)
      }} disabled={loadingAi}>
        {loadingAi ? <><span className="loader" /> Analisi...</> : <><Sparkles size={14} /> Genera consigli</>}
      </button>
    </div>
  : <div>{/* cards */}</div>}
```

**Pattern da replicare — search handler (`src/components/books/BooksPage.jsx:46-53`):**
```jsx
const handleSearch = async (q) => {
  setSearchQuery(q)
  if (q.length < 2) { setSearchResults([]); return }
  setSearching(true)
  const results = await googleBooks.search(q)
  setSearchResults(results)
  setSearching(false)
}
```

**Deviazioni richieste rispetto a `BooksPage.jsx`:**
- `TABS = ['I miei ristoranti', 'Scopri', 'Consigli AI']`.
- **Subtab pattern: solo 2 stati** (`visited` / `wishlist`) invece di 3 — più vicino a `CinemaPage.jsx` che a `BooksPage.jsx`. Niente `reading`.
- **Filtri cumulativi città × status × etichette** (D-05, D-06, D-07): computati inline in render (no `useMemo`) — specchiare `byStatus` + chain ad esempio:
  ```jsx
  const displayed = visited
    .filter(r => selectedCity === 'Altro' ? !userCities.includes(r.restaurant_city) : r.restaurant_city === selectedCity)
    .filter(r => selectedLabels.length === 0 || r.labels?.some(l => selectedLabels.includes(l)))
  ```
- **Selettore città orizzontale** (nuovo — non in BooksPage): `<div className="scroll-x">` con chip riusati `.btn btn-sm` o nuova classe `.city-chip`.
- **Input aggiungi città inline** (nuovo): input + bottone `+` chiama `db.addUserCity(user.id, cityName)`; `×` su ogni chip chiama `db.removeUserCity(...)`.
- **Search bar disabilitata se nessuna città selezionata** (D-07): `disabled={!selectedCity}` + tooltip/placeholder "Seleziona prima una città".
- `handleSearch(q)` passa `placesProvider.search(q, selectedCity)` (D-07).
- Tab Scopri: filtro categoria pill row (8 valori: Aperitivo, Cena, Romantico, Pizza, Italiano, Giapponese, Cinese, Hamburger). `placesProvider.getPopular(selectedCity, category)`. Empty state se `userCities.length === 0` con CTA "aggiungi città".
- AI prereq: `visited.length < 3` invece di `read.length < 3`; bottone CTA nell'empty state porta a `setTab('I miei ristoranti')`.
- Card display: campo `restaurant_cover`, `restaurant_name`, `restaurant_cuisine`, `priceLevel` mapping €/€€/€€€/€€€€, primi 3 label come `.label-pill` + `+N`, nota troncata a 40 char.

**Gotchas:**
- `.jsx` estensione esplicita in import: `from './RestaurantModal.jsx'`.
- No `useMemo` — filtri cumulativi sempre inline in render (CONCERNS pattern — `CinemaPage.jsx:81-88`).
- Keys su DB-backed lists: `key={r.restaurant_id}` (no indices). Per AI output `key={i}` è tollerato (BooksPage:268).
- Tutte le stringhe UI in italiano; console log in inglese.
- State pattern: **molti `useState` separati**, non `useReducer` (CONVENTIONS §"State Patterns" riga 99-100).
- Price level mapping helper (locale al componente):
  ```js
  const priceSymbol = (n) => n ? '€'.repeat(n) : '—'
  ```

---

### 4. `src/components/restaurants/RestaurantModal.jsx` (NEW — modal)

**Analog primario:** `src/components/books/BookModal.jsx` (intero file — 312 righe).

**Pattern da replicare — StarRating component (`src/components/books/BookModal.jsx:9-34`):** riuso **diretto** (half-steps, hover preview, clear `x`). Vedi sezione "Shared Patterns" più sotto per la decisione riuso/extract.

**Pattern da replicare — modal shell + overlay + close (`src/components/books/BookModal.jsx:144-148, 309-311`):**
```jsx
return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose}><X size={18} /></button>
      ...
    </div>
  </div>
)
```

**Pattern da replicare — entry lookup + derived booleans (`src/components/books/BookModal.jsx:51-55`):**
```jsx
const entry = readBooks.find(b => b.book_id === bookId)
const isRead = entry?.status === 'read'
const isReading = entry?.status === 'reading'
const isWishlist = entry?.status === 'wishlist'
const inLibrary = !!entry
```

**Pattern da replicare — status toggle handler (`src/components/books/BookModal.jsx:66-77`):**
```jsx
const handleStatus = async (status) => {
  if (!book) return
  if (inLibrary && entry.status === status) {
    await db.removeReadBook(user.id, bookId)
    toast(`"${book.title}" rimosso dalla libreria`, 'success')
  } else {
    await db.addReadBook(user.id, book, status)
    toast(`"${book.title}" segnato come ${labels[status]}!`, 'success')
  }
  onUpdate()
}
```

**Pattern da replicare — rating handler (`src/components/books/BookModal.jsx:85-89`):**
```jsx
const handleRating = async (rating) => {
  if (!inLibrary) return
  await db.updateBookRating(user.id, bookId, rating)
  onUpdate()
}
```

**Pattern da replicare — suggerisci ad amico flow (`src/components/books/BookModal.jsx:100-107, 252-276`):**
```jsx
const handleSuggest = async () => {
  if (!selectedFriend || !book) return
  await db.sendBookSuggestion(user.id, selectedFriend, book, suggestComment)
  toast('Consiglio inviato!', 'success')
  setShowSuggest(false)
  setSuggestComment('')
  setSelectedFriend(null)
}
```
```jsx
{showSuggest && (
  <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 20 }}>
    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Suggerisci a un amico</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {friends.map(f => (
        <button key={f.friend_id}
          className={`btn btn-sm ${selectedFriend === f.friend_id ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedFriend(f.friend_id)}>
          {f.profiles?.full_name || f.profiles?.email}
        </button>
      ))}
    </div>
    <input className="input" placeholder="Aggiungi un commento (opzionale)"
      value={suggestComment} onChange={e => setSuggestComment(e.target.value)} />
    <button className="btn btn-primary btn-sm" onClick={handleSuggest} disabled={!selectedFriend}>
      <Send size={12} /> Invia consiglio
    </button>
  </div>
)}
```

**Pattern da replicare — collapsible similar (`src/components/books/BookModal.jsx:109-129, 278-308`):**
```jsx
const handleLoadSimilar = async () => {
  if (!book) return
  setLoadingSimilar(true)
  setShowSimilar(true)
  const readTitles = readBooks.map(b => b.book_title)
  const results = await ai.getSimilarBooks(book, readTitles)
  setSimilar(results)
  setLoadingSimilar(false)
}
```

**Pattern da replicare — data load + friends (`src/components/books/BookModal.jsx:57-60`):**
```jsx
useEffect(() => {
  googleBooks.getBook(bookId).then(b => { setBook(b); setLoading(false) })
  db.getFriends(user.id).then(setFriends)
}, [bookId, user.id])
```

**Deviazioni richieste rispetto a `BookModal.jsx`:**
- Props signature: `function RestaurantModal({ restaurantId, onClose, visitedRestaurants, onUpdate })`. Pattern identico a `BookModal({ bookId, onClose, readBooks, onUpdate })`.
- Fonte dati modale: `placesProvider.getPlace(restaurantId)` invece di `googleBooks.getBook(...)`.
- Status toggle: **solo 2 stati** (`visited` / `wishlist`), non 3 — specchiare più da vicino `MovieModal.jsx`. `isVisited`, `isWishlist`, `inLibrary` booleans.
- **Rating mezzi voti** (D-08): `StarRating` riusato identico (stelle 0.5-5).
- **Hero nuovo**: foto + nome + cucina + `priceSymbol(priceLevel)` + rating. Se `book.cover` null → placeholder icona `Utensils` (lucide) su `var(--bg3)`.
- **Bottone "Apri in Google Maps"** (D-09): `<a href={place.mapsUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><MapPin size={13} /> Apri in Google Maps</a>`.
- **Note section** (nuovo rispetto a BookModal — che ha invece progress pages): textarea con `save on blur`, disponibile solo `inLibrary`. Chiama `db.updateRestaurantNotes(user.id, restaurantId, notes)`. Placeholder: "Com'è andata? Cosa hai mangiato?...".
- **Labels section** (nuovo): set fisso `['🍹 Aperitivo', '🍽️ Cena', '☀️ Pranzo', '💑 Romantico', '👥 Amici', '👨‍👩‍👧 Famiglia', '💼 Lavoro', '⭐ Speciale']` + input custom + chip toggle. Disponibile solo `inLibrary`. Autocomplete custom: scan client-side dei `visitedRestaurants.flatMap(r => r.labels || [])` → unique set (D-04). Chiama `db.updateRestaurantLabels(user.id, restaurantId, labels)`.
- **Similar via AI**: `ai.getSimilarRestaurants(place, visitedTitles)` (pattern identico a `getSimilarBooks`).
- **Similar click**: `placesProvider.search(s.name, s.city)` → se `results.length > 0`, swap place (stesso re-swap pattern di `handleSimilarClick` in BookModal:119-129) o aprire nuovo modal sostituendo `restaurantId`.
- Send suggestion: `db.sendRestaurantSuggestion(user.id, selectedFriend, place, comment)` (pattern identico).

**Gotchas:**
- `modal-close` classe **non è definita** in `main.css` (verificato — classe orfana usata in BookModal/MovieModal senza regola CSS). Convive comunque perché ha styling inline di fatto zero / font inheritato. **Lasciare così** — non aggiungere regola in Phase 2 (fuori scope).
- `modal-overlay` + `modal` invece sono definiti (main.css:229-249). Riusare identici.
- 15+ `useState` in testa al componente: pattern accettato (CONVENTIONS §"Component Patterns" riga 59-60). No `useReducer`, no `useRef`.
- Effetto di caricamento place + friends in parallelo: **non** usare `Promise.all` qui, ma due `.then(...)` come in BookModal:57-60 (se uno fallisce l'altro continua — fail-silent idiom).
- Deps `useEffect` occasionalmente incomplete: tollerato (CONVENTIONS riga 68).
- Label input custom: input testo + bottone `+` che fa `push` locale in `selectedLabels` state prima di `db.updateRestaurantLabels`.
- `save on blur` per note: `onBlur={() => db.updateRestaurantNotes(...)}` sul `<textarea>`.

---

### 5. `src/components/shared/StarRating.jsx` (NEW opzionale — shared extraction)

**Analog:** copia letterale da `src/components/books/BookModal.jsx:9-34` (inline component `StarRating`).

**Pattern da replicare — full component (copy-paste):**
```jsx
import { useState } from 'react'

export default function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null)
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
```

**Deviazioni:** zero — è una copy verbatim con `export default`.

**Decisione estrazione:**
- **OPZIONE A (preferita, coerente con STRUCTURE):** estrarre in `src/components/shared/StarRating.jsx` e **refactorare** `BookModal.jsx` per importarlo, eliminando la definizione interna. Import path: `from '../shared/StarRating.jsx'`.
- **OPZIONE B (tollerata, anti-pattern noto):** lasciare `StarRating` inline in BookModal e fare import cross-verticale da `restaurants/RestaurantModal.jsx` → `from '../books/BookModal.jsx'`. Precedente in codebase: `NotificationsPage` è in `cinema/` ma legge book data (CONTEXT §"Reusable Assets" riga 159).

**Raccomandazione al planner:** OPZIONE A per pulizia (basta esportare il componente — nessuna logica cambia). Se stretto su tempo, OPZIONE B è safe.

**Gotchas:**
- Se OPZIONE A: aggiornare `BookModal.jsx` per fare `import StarRating from '../shared/StarRating.jsx'` e **rimuovere** la `function StarRating` locale (righe 9-34). Assicurarsi di aggiungere `import { useState }` se non già presente (c'è già, riga 1).
- Se OPZIONE B: `import BookModal, { StarRating } from '../books/BookModal.jsx'` **NON funziona** — `StarRating` non è esportato in BookModal.jsx. Servirebbe aggiungere `export { StarRating }` accanto al default export. OPZIONE A è più pulita.

---

### 6. `src/lib/db.js` (MODIFIED — append block ristoranti)

**Analog:** sezione `// ── LIBRI ────` (134-209) nello stesso file. Da specchiare **1:1** come sezione `// ── RISTORANTI ────` appesa in fondo (prima della chiusura `}` finale alla riga 211).

**Pattern da replicare — read list (`src/lib/db.js:136-143`):**
```js
async getReadBooks(userId) {
  const { data } = await supabase
    .from('read_books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}
```
→ **Target**: `getVisitedRestaurants(userId)` stessa forma, tabella `visited_restaurants`.

**Pattern da replicare — upsert insert (`src/lib/db.js:145-162`):**
```js
async addReadBook(userId, book, status = 'read') {
  const { data, error } = await supabase
    .from('read_books')
    .upsert({
      user_id: userId,
      book_id: book.id,
      book_title: book.title,
      book_cover: book.cover,
      book_year: book.year,
      book_authors: book.authors,
      book_pages: book.pages,
      status,
      current_page: 0,
      is_favorite: false,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,book_id' })
  return { data, error }
}
```
→ **Target**: `addVisitedRestaurant(userId, place, status = 'visited')` — campi `restaurant_id`, `restaurant_name`, `restaurant_cover`, `restaurant_address`, `restaurant_city`, `restaurant_cuisine`, `restaurant_price_level`, `status`, `is_favorite: false`, `labels: []`. `onConflict: 'user_id,restaurant_id'`.

**Pattern da replicare — single-field update (`src/lib/db.js:176-182`):**
```js
async updateBookRating(userId, bookId, rating) {
  return supabase.from('read_books').update({ rating }).eq('user_id', userId).eq('book_id', bookId)
}

async toggleBookFavorite(userId, bookId, current) {
  return supabase.from('read_books').update({ is_favorite: !current }).eq('user_id', userId).eq('book_id', bookId)
}
```
→ **Target**: `updateRestaurantRating`, `toggleRestaurantFavorite`, `updateRestaurantNotes(userId, restaurantId, notes)`, `updateRestaurantLabels(userId, restaurantId, labels)`, `removeRestaurant`.

**Pattern da replicare — suggestion insert (`src/lib/db.js:184-196`):**
```js
async sendBookSuggestion(fromUserId, toUserId, book, comment = '') {
  return supabase.from('book_suggestions').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    book_id: book.id,
    book_title: book.title,
    book_cover: book.cover,
    book_authors: book.authors,
    comment,
    read: false,
    created_at: new Date().toISOString()
  })
}
```
→ **Target**: `sendRestaurantSuggestion(fromUserId, toUserId, place, comment = '')` — campi da schema: `restaurant_id`, `restaurant_name`, `restaurant_cover`, `restaurant_city`, `restaurant_cuisine`, `comment`, `read: false`.

**Pattern da replicare — suggestion read + mark (`src/lib/db.js:198-209`):**
```js
async getBookSuggestions(userId) {
  const { data } = await supabase
    .from('book_suggestions')
    .select('*, profiles(full_name, avatar_url)')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

async markBookSuggestionRead(id) {
  return supabase.from('book_suggestions').update({ read: true }).eq('id', id)
}
```
→ **Target**: `getRestaurantSuggestions`, `markRestaurantSuggestionRead`.

**Nuovo — user_cities (nessun analog diretto, pattern da specchiare su `friendships` insert):**
```js
async getUserCities(userId) {
  const { data } = await supabase
    .from('user_cities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return data || []
}

async addUserCity(userId, cityName) {
  const { data, error } = await supabase
    .from('user_cities')
    .upsert({ user_id: userId, city_name: cityName, created_at: new Date().toISOString() }, { onConflict: 'user_id,city_name' })
  return { data, error }
}

async removeUserCity(userId, cityName) {
  return supabase.from('user_cities').delete().eq('user_id', userId).eq('city_name', cityName)
}
```

**Lista completa metodi target (14):**
1. `getVisitedRestaurants(userId)` → reads `→ data || []`
2. `addVisitedRestaurant(userId, place, status = 'visited')` → writes `→ { data, error }`
3. `addToRestaurantWishlist(userId, place)` → writes `→ { data, error }` — *convenienza, può essere alias di `addVisitedRestaurant(userId, place, 'wishlist')`*
4. `updateRestaurantStatus(userId, restaurantId, status)` → raw query builder result
5. `updateRestaurantRating(userId, restaurantId, rating)` → raw query builder result
6. `toggleRestaurantFavorite(userId, restaurantId, current)` → raw query builder result
7. `updateRestaurantNotes(userId, restaurantId, notes)` → raw query builder result
8. `updateRestaurantLabels(userId, restaurantId, labels)` → raw query builder result
9. `removeRestaurant(userId, restaurantId)` → raw query builder result
10. `sendRestaurantSuggestion(fromUserId, toUserId, place, comment = '')` → raw query builder result
11. `getRestaurantSuggestions(userId)` → reads `→ data || []`
12. `markRestaurantSuggestionRead(id)` → raw query builder result
13. `getUserCities(userId)` → reads `→ data || []`
14. `addUserCity(userId, cityName)` → writes `→ { data, error }`
15. `removeUserCity(userId, cityName)` → raw query builder result

**Deviazioni richieste:**
- **Rating tipo: `NUMERIC(2,1)` non `INTEGER`** (D-08). Nessuna conversione client-side — passare direttamente il float. Supabase accetta `0.5` come numeric.
- `labels` è un Postgres `TEXT[]` — passare array JS: `update({ labels: ['🍹 Aperitivo', '⭐ Speciale'] })`. Supabase-js serializza correttamente.
- `UNIQUE(user_id, restaurant_id)` — stesso pattern di `read_books`.

**Gotchas:**
- **Return shape inconsistency è voluta** (CONTEXT §"Established Patterns" riga 165 + CONVENTIONS riga 127): reads return `data || []`, upserts return `{ data, error }`, bare updates/deletes return il query builder result raw. **Non correggere**.
- La sezione ristoranti va **appesa** dentro il namespace `export const db = { ... }`. Non creare un secondo `export const` separato.
- Indent: 2 spaces, no semicolons, single quotes.
- Separatore di sezione come da pattern esistente: `// ── RISTORANTI ──────────────────────────────────────────────` (stile identico a riga 134 `// ── LIBRI ──────────────`).

---

### 7. `src/lib/gemini.js` (MODIFIED — append 2 metodi AI)

**Analog primario:** `getSimilarBooks` (142-157) + `getPersonalizedBookSuggestions` (160-191) nello stesso file. Sono **1:1** gli analog di ciò che servirà per ristoranti.

**Pattern da replicare — getSimilarX (`src/lib/gemini.js:142-157`):**
```js
async getSimilarBooks(book, readTitles = []) {
  const read = readTitles.length ? `L'utente ha già letto: ${readTitles.slice(0, 20).join(', ')}.` : ''
  const prompt = `Sei un esperto letterario. L'utente ha amato "${book.title}" di ${book.authors || 'autore sconosciuto'}.
${read}
Suggerisci 6 libri simili NON già letti. Per ognuno: titolo, autore, anno, motivazione e stelle di affinità (1-5).
Rispondi SOLO in JSON: [{"title": "...", "original_title": "...", "authors": "...", "year": "...", "reason": "...", "stars": 4}]`

  try {
    const text = await askGemini(prompt)
    const result = parseJSON(text, null)
    if (result) return result
  } catch {}

  const text = await askGroq(prompt)
  return parseJSON(text, [])
}
```
→ **Target**: `getSimilarRestaurants(place, visitedTitles = [])`. Prompt: menzionare `place.name` + `place.city` + `place.cuisine`. Output JSON shape target (da D-10): `[{ name, city, cuisine, reason, stars }]`.

**Pattern da replicare — getPersonalizedX (`src/lib/gemini.js:160-191`):**
```js
async getPersonalizedBookSuggestions(readBooks) {
  if (!readBooks?.length) return { classics: [], recent: [] }

  const favorites = readBooks.filter(b => b.is_favorite).slice(0, 10)
  const recent = readBooks.slice(0, 15)
  const favTitles = favorites.map(b => b.book_title).join(', ') || 'nessuno ancora'
  const recentTitles = recent.map(b => `${b.book_title}${b.rating ? ` (voto ${b.rating}/5)` : ''}`).join(', ')

  const classicsPrompt = `...` // Groq call
  const recentPrompt = `...`   // Gemini call con fallback Groq

  const [classicsText, recentText] = await Promise.allSettled([
    askGroq(classicsPrompt),
    askGemini(recentPrompt).catch(() => askGroq(recentPrompt))
  ])

  const classics = classicsText.status === 'fulfilled' ? parseJSON(classicsText.value, []) : []
  const recentData = recentText.status === 'fulfilled' ? parseJSON(recentText.value, []) : []

  return { classics, recent: recentData }
}
```
→ **Target**: `getPersonalizedRestaurantSuggestions(visitedRestaurants)`. Input: rows da `visited_restaurants`. Analizza (da 02-USER-REQ.md): cucine preferite, fasce prezzo, città frequentate, etichette più usate. Output JSON shape (da D-10): `[{ name, city, cuisine, reason, stars }]`. Struttura dual-call (Gemini primario + Groq fallback/classics) opzionale — può anche collassare in **una sola chiamata Gemini → fallback Groq** se semanticamente non ha senso distinguere "classici" vs "recenti" per ristoranti. Planner decide — entrambe le forme sono coerenti col pattern.

**Deviazioni richieste:**
- Output key: `name` invece di `title` (coerente con CONTEXT D-10 riga 101).
- Campi da aggregare in `favTitles`/`recentTitles`: `r.restaurant_name`, `r.restaurant_cuisine`, `r.restaurant_city`, `r.labels?.join(' ')`, `r.rating` (mezzi voti).
- Menzionare nel prompt città preferite e fasce prezzo se disponibili.

**Gotchas:**
- Namespace `export const ai = { ... }` già aperto in riga 53. **Appendere** i 2 nuovi metodi prima della chiusura `}` finale (riga 192), separati da virgola dal metodo precedente.
- `askGemini`, `askGroq`, `parseJSON` sono **helper privati** del file — non servono import, basta chiamarli.
- Empty `catch {}` idiom per silenziare Gemini → caduta su Groq è **voluto** (CONVENTIONS §"Error Handling" riga 106-107).
- Il fallback Groq alla fine di `getSimilarBooks` non è in try/catch — se anche Groq fallisce, l'errore propaga al caller e il caller (RestaurantModal `handleLoadSimilar`) vede un uncaught rejection. **Pattern accettato**, non aggiungere safety net in Phase 2.

---

### 8. `src/App.jsx` (MODIFIED — route + polling estensione)

**Analog:** same file. Due modifiche discrete.

**Pattern da replicare — import + route (`src/App.jsx:7-10, 75-82`):**
```jsx
import CinemaPage from './components/cinema/CinemaPage.jsx'
import BooksPage from './components/books/BooksPage.jsx'
import NotificationsPage from './components/cinema/NotificationsPage.jsx'
...
<Routes>
  <Route path="/" element={<Navigate to="/cinema" replace />} />
  <Route path="/cinema" element={<CinemaPage />} />
  <Route path="/books" element={<BooksPage />} />
  <Route path="/travel" element={<ComingSoon title="Viaggi — In arrivo!" />} />
  <Route path="/notifications" element={<NotificationsPage onRead={() => setUnreadCount(0)} />} />
  <Route path="/profile" element={<ProfilePage />} />
</Routes>
```
→ **Target**: aggiungere `import RistorantiPage from './components/restaurants/RistorantiPage.jsx'` + `<Route path="/ristoranti" element={<RistorantiPage />} />`. Mantenere `/travel` come ComingSoon (v2).

**Pattern da replicare — unread polling (`src/App.jsx:36-45`):**
```jsx
useEffect(() => {
  if (!user) return
  const checkUnread = async () => {
    const suggestions = await db.getSuggestions(user.id)
    setUnreadCount(suggestions.filter(s => !s.read).length)
  }
  checkUnread()
  const interval = setInterval(checkUnread, 60000)
  return () => clearInterval(interval)
}, [user])
```
→ **Target — estensione a 3 stream con `Promise.all`:**
```jsx
const checkUnread = async () => {
  const [movies, books, restaurants] = await Promise.all([
    db.getSuggestions(user.id),
    db.getBookSuggestions(user.id),
    db.getRestaurantSuggestions(user.id),
  ])
  const unread = [...movies, ...books, ...restaurants].filter(s => !s.read).length
  setUnreadCount(unread)
}
```

**Deviazioni richieste:**
- **Bug latente sanato di conseguenza:** il polling corrente conta solo `db.getSuggestions` (film) e ignora libri. Estendendo a 3 stream si copre anche il caso libri — miglioramento collaterale coerente con RIST-07 success criteria.

**Gotchas:**
- `AppShell` usa mix tab+space indent nel blocco topbar (righe 59-74) — pattern accettato (CONVENTIONS §"Lint/Format GAP" riga 145). **Non** riformattare il file intero; aggiungere solo righe nello stesso stile delle zone circostanti (2-space nelle zone 2-space, tab nelle zone tab).
- L'useEffect polling ha deps `[user]` — mantenerle così. Aggiungendo un'altra table alla query si resta nelle stesse deps.
- Import path: `'./components/restaurants/RistorantiPage.jsx'` con estensione.

---

### 9. `src/components/layout/Sidebar.jsx` (MODIFIED — push su navItems)

**Analog:** same file, riga 11-15.

**Pattern da replicare (`src/components/layout/Sidebar.jsx:1-15`):**
```jsx
import { Film, BookOpen, Map, Bell, User, LogOut } from 'lucide-react'
...
const navItems = [
  { icon: Film, label: 'Cinema', path: '/cinema' },
  { icon: BookOpen, label: 'Libri', path: '/books' },
  { icon: Map, label: 'Viaggi', path: '/travel', soon: true },
]
```

**Target:**
```jsx
import { Film, BookOpen, Utensils, Map, Bell, User, LogOut } from 'lucide-react'
...
const navItems = [
  { icon: Film, label: 'Cinema', path: '/cinema' },
  { icon: BookOpen, label: 'Libri', path: '/books' },
  { icon: Utensils, label: 'Ristoranti', path: '/ristoranti' },
  { icon: Map, label: 'Viaggi', path: '/travel', soon: true },
]
```

**Deviazioni:** scelta icona `Utensils` (D-10/Specifics). `UtensilsCrossed` è alternativa accettabile; preferire `Utensils` (più pulita visivamente, verificata presente in `lucide-react`).

**Gotchas:**
- Ordine: **prima** di Viaggi (che è `soon`) ma **dopo** Libri — flusso natural reading.
- Nessun altro cambiamento al file; il render loop `navItems.map` gestisce già il nuovo item.

---

### 10. `src/components/cinema/NotificationsPage.jsx` (MODIFIED — merge 3° stream)

**Analog:** same file, righe 13-32 + 60-72 + 82-130.

**Pattern da replicare — Promise.all merge (`src/components/cinema/NotificationsPage.jsx:13-32`):**
```jsx
useEffect(() => {
  if (!user) return
  Promise.all([
    db.getSuggestions(user.id),
    db.getBookSuggestions(user.id)
  ]).then(([movies, books]) => {
    const all = [
      ...movies.map(s => ({ ...s, type: 'film' })),
      ...books.map(s => ({ ...s, type: 'libro' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setSuggestions(all)
    setLoading(false)

    movies.filter(s => !s.read).forEach(s => db.markSuggestionRead(s.id))
    books.filter(s => !s.read).forEach(s => db.markBookSuggestionRead(s.id))
    onRead?.()
  })
}, [user])
```

**Target:**
```jsx
Promise.all([
  db.getSuggestions(user.id),
  db.getBookSuggestions(user.id),
  db.getRestaurantSuggestions(user.id),
]).then(([movies, books, restaurants]) => {
  const all = [
    ...movies.map(s => ({ ...s, type: 'film' })),
    ...books.map(s => ({ ...s, type: 'libro' })),
    ...restaurants.map(s => ({ ...s, type: 'ristorante' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  setSuggestions(all)
  setLoading(false)
  movies.filter(s => !s.read).forEach(s => db.markSuggestionRead(s.id))
  books.filter(s => !s.read).forEach(s => db.markBookSuggestionRead(s.id))
  restaurants.filter(s => !s.read).forEach(s => db.markRestaurantSuggestionRead(s.id))
  onRead?.()
})
```

**Pattern da replicare — filter pills (`src/components/cinema/NotificationsPage.jsx:60-72`):** estendere array `['tutti', 'film', 'libri']` a `['tutti', 'film', 'libri', 'ristoranti']` + aggiungere case `ristoranti` nel ternario (riga 68-69).

**Pattern da replicare — card render (`src/components/cinema/NotificationsPage.jsx:82-130`):** estendere i ternari `isFilm` a tre-way:
```jsx
const isFilm = s.type === 'film'
const isBook = s.type === 'libro'
const isRestaurant = s.type === 'ristorante'
const poster = isFilm ? (s.movie_poster ? tmdb.posterUrl(s.movie_poster, 'w92') : null)
  : isBook ? (s.book_cover || null)
  : (s.restaurant_cover || null)
const title = isFilm ? s.movie_title : isBook ? s.book_title : s.restaurant_name
const sub = isFilm ? null : isBook ? s.book_authors : `${s.restaurant_cuisine || ''}${s.restaurant_city ? ` · ${s.restaurant_city}` : ''}`
const icon = isFilm ? '🎬' : isBook ? '📚' : '🍽️'
const typeLabel = isFilm ? '🎬 Film' : isBook ? '📚 Libro' : '🍽️ Ristorante'
const whatText = isFilm ? 'un film' : isBook ? 'un libro' : 'un ristorante'
```

**Deviazioni richieste:**
- Campo poster: `s.restaurant_cover` è già URL completo (dal normalizer Foursquare) — **nessuna** costruzione poster-URL lato notifiche (diverso da `tmdb.posterUrl(...)`).
- `year` non esiste per ristoranti — lasciare `{year && ...}` come condizionale esistente; il render skippa naturalmente.

**Gotchas:**
- `key={`${s.type}-${s.id}`}` pattern già corretto per collisioni fra tabelle diverse con UUID simili.
- Il sort cronologico unico sui 3 stream è già garantito dallo `.sort(...)` esistente.
- `onRead?.()` chiamato una sola volta per tutti e 3 gli stream — pattern già corretto.

---

### 11. `src/styles/main.css` (MODIFIED — append classi nuove)

**Analog:** stesso file. Pattern di naming e definizione classi: `.movie-card` (144-187), `.btn` + modificatori (190-207), `.ai-card` (322-327), `.tab` + `.tab.active` (279-287).

**Pattern da replicare — chained modifier class (`src/styles/main.css:190-207`):**
```css
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-sm);
  ...
}
.btn-primary { background: var(--accent); color: var(--bg); }
.btn-secondary { background: var(--bg3); color: var(--text2); border: 1px solid var(--border2); }
```

**Classi nuove da aggiungere (solo se non si può riusare esistenti):**
```css
/* City chips (selettore città orizzontale) */
.city-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--bg3); color: var(--text2);
  border: 1px solid var(--border2);
  font-size: 12px; cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}
.city-chip:hover { background: var(--bg4); color: var(--text); }
.city-chip.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); }
.city-chip-remove { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 11px; padding: 0 2px; }
.city-chip-remove:hover { color: var(--red); }

/* Label pills (etichette visited_restaurants.labels[]) */
.label-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 999px;
  background: var(--bg3); color: var(--text2);
  border: 1px solid var(--border2);
  font-size: 11px; cursor: pointer;
  transition: all var(--transition);
}
.label-pill:hover { background: var(--bg4); }
.label-pill.selected { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); }

/* Price level indicator */
.price-level {
  display: inline-block;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}
```

**Deviazioni richieste:**
- **Prima del commit: verificare** se classi già esistenti (`.rating-pill` a riga 353, `.btn-sm` a riga 205) coprono già il caso d'uso. `.rating-pill` potrebbe essere riusato per `priceLevel` con leggere differenze.
- Tema oro `#e8b84b`: **è già** `--accent` (riga 12). Non introdurre nuove custom properties.
- Niente `!important`, niente media queries oltre a quelle esistenti (riga 383-396). Stile append-only.

**Gotchas:**
- File usa **indent misto** (2-space a volte, tab altre) — append con 2-space seguendo pattern `.btn`/`.ai-card` (le sezioni più recenti sono 2-space).
- Design tokens **solo via `var(--...)`** — mai `#e8b84b` o `rgba(...)` hard-coded (CONVENTIONS riga 75).
- Selettori: kebab-case con prefix componente, NO BEM, NO underscore.
- Le nuove classi vanno appese in fondo al file (dopo `.coming-soon-badge` riga 402-407), non interlacciate.

---

### 12. `supabase_schema.sql` (MODIFIED — append DDL + RLS 3 tabelle)

**Analog:** same file — `watched_movies` DDL (16-28) + `movie_suggestions` DDL (40-51) + RLS owner-only block (57-83).

**Pattern da replicare — DDL tabella per-user (`supabase_schema.sql:16-28`):**
```sql
CREATE TABLE IF NOT EXISTS watched_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  movie_genres JSONB DEFAULT '[]',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);
```

**Pattern da replicare — DDL tabella social (`supabase_schema.sql:40-51`):**
```sql
CREATE TABLE IF NOT EXISTS movie_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Pattern da replicare — RLS owner-only (`supabase_schema.sql:67-71`):**
```sql
CREATE POLICY "watched_select" ON watched_movies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_insert" ON watched_movies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watched_update" ON watched_movies FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_delete" ON watched_movies FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

**Pattern da replicare — RLS social from/to (`supabase_schema.sql:78-83`):**
```sql
CREATE POLICY "suggestions_select" ON movie_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "suggestions_insert" ON movie_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "suggestions_update" ON movie_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);
```

**Target (DDL da 02-USER-REQ.md, da inserire come nuova sezione dopo i blocchi libri che CLEAN-01 aggiungerà in Phase 1):**
```sql
-- =========================================
-- RISTORANTI
-- =========================================

CREATE TABLE IF NOT EXISTS user_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, city_name)
);

CREATE TABLE IF NOT EXISTS visited_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_cover TEXT,
  restaurant_address TEXT,
  restaurant_city TEXT,
  restaurant_cuisine TEXT,
  restaurant_price_level INTEGER,
  status TEXT DEFAULT 'visited' CHECK (status IN ('visited', 'wishlist')),
  rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS restaurant_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_cover TEXT,
  restaurant_city TEXT,
  restaurant_cuisine TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE visited_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_suggestions ENABLE ROW LEVEL SECURITY;

-- user_cities: owner-only (non condivise)
CREATE POLICY "user_cities_select" ON user_cities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_cities_insert" ON user_cities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_cities_update" ON user_cities FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_cities_delete" ON user_cities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- visited_restaurants: owner-only
CREATE POLICY "visited_restaurants_select" ON visited_restaurants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "visited_restaurants_insert" ON visited_restaurants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visited_restaurants_update" ON visited_restaurants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "visited_restaurants_delete" ON visited_restaurants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- restaurant_suggestions: from/to visibili, insert solo mittente, update solo destinatario
CREATE POLICY "restaurant_suggestions_select" ON restaurant_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "restaurant_suggestions_insert" ON restaurant_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "restaurant_suggestions_update" ON restaurant_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);
```

**Deviazioni richieste:**
- `rating NUMERIC(2,1)` non `INTEGER` (D-08) — unica differenza da `watched_movies.rating`.
- `restaurant_id TEXT` non `INTEGER` (Foursquare `fsq_id` è alfanumerico, non integer come TMDB movie_id).
- `labels TEXT[] DEFAULT '{}'` — Postgres array, non JSONB come `movie_genres`.
- Naming policy RLS: `<table>_<op>` (es `visited_restaurants_select`) — mantiene il pattern `suggestions_insert` esistente.

**Gotchas:**
- Inserire il blocco **dopo** le tabelle `read_books` + `book_suggestions` che Phase 1 (CLEAN-01) aggiungerà. Phase 2 dipende da Phase 1 completata (ROADMAP riga 35).
- Separatore sezione: commento `-- ========= RISTORANTI =========` coerente col pattern riga 2-4, 53-55.
- RLS **sempre presente per ogni tabella** — INF-02 è Validated REQ-ID (REQUIREMENTS.md:61).

---

### 13. `.env.example` (MODIFIED — append variabili provider)

**Analog:** same file (1-12).

**Pattern (`.env.example:1-12`):**
```
# Supabase (da https://supabase.com → Settings → API)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TMDB (da https://www.themoviedb.org/settings/api)
VITE_TMDB_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Gemini (da https://aistudio.google.com/app/apikey)
VITE_GEMINI_API_KEY=AIzaSy...
```

**Target — append:**
```
# Google Books (nessuna chiave richiesta per query base)

# Groq (da https://console.groq.com/keys)
VITE_GROQ_API_KEY=gsk_...

# Places provider (foursquare | google)
VITE_PLACES_PROVIDER=foursquare

# Foursquare Places API v3 (da https://foursquare.com/developers/)
VITE_FOURSQUARE_API_KEY=fsq3...
```

**Deviazioni:** aggiungere anche `VITE_GROQ_API_KEY` se mancante (verificare in Phase 1 / SEC-02 scrub) — è usato in `gemini.js:2`. Non aggiungere `VITE_GOOGLE_BOOKS_KEY` perché Google Books non richiede chiave per query basiche (`googlebooks.js` non legge env var).

**Gotchas:**
- **Non** modificare `.env.local` in questa fase. CONTEXT riga 174 + CLAUDE.md riga 61 sono espliciti: `.env.local` è attualmente tracked ma sarà `git rm --cached` in Phase 1 / SEC-05. Scrivere solo `.env.example`. Il dev locale aggiornerà `.env.local` manualmente.
- Formato: `KEY=value_placeholder` (no quotes), commento `#` descrittivo sopra ogni gruppo.

---

### 14. `.planning/PROJECT.md` (DOC MODIFIED)

**Analog:** same file §Key Decisions. Aggiornare la riga che cita "Foursquare Places" → "Places layer astratto: Foursquare attivo, Google predisposto" (CONTEXT D-01 riga 31).

**Pattern:** text edit in-place, non aggiunta nuova riga.

**Gotchas:**
- Questa è **documentazione**, non codice. Non toccare la struttura del file — solo il testo della riga specifica.

---

### 15. `.planning/REQUIREMENTS.md` (DOC MODIFIED)

**Analog:** same file RIST-01..09 block (81-89) + traceability matrix (128-136).

**Target:**
1. **Update RIST-01** (riga 81): source path `src/lib/foursquare.js` → `src/lib/placesProvider.js + src/lib/foursquare.js` (CONTEXT D-01 riga 31).
2. **Add RIST-10** (nuova riga dopo RIST-09 riga 89):
   ```markdown
   - [ ] **RIST-10** L'utente può gestire una lista illimitata di città preferite (aggiungi inline con input + tasto +, rimuovi con ×), riutilizzate come filtro in "I miei ristoranti" e come selettore in "Scopri" — tabella `user_cities` in `supabase_schema.sql`
   ```
3. **Add traceability row** (dopo riga 136):
   ```markdown
   | RIST-10 | Phase 2 — Verticale Ristoranti | Tabella `user_cities` + RLS + UI selettore città |
   ```
4. **Update "Coverage" count** (riga 140): `20 / 20` → `21 / 21`.

**Gotchas:**
- Formato checkbox `- [ ]` identico agli altri Active items.
- REQ-ID pattern `RIST-10` continua il sequence `RIST-01..09`.
- ROADMAP.md Requirements list riga 36 va aggiornata di conseguenza per includere `RIST-10`.

---

### 16. `.planning/ROADMAP.md` (DOC MODIFIED)

**Analog:** same file riga 36.

**Target (riga 36):**
```
**Requirements**: RIST-01, RIST-02, RIST-03, RIST-04, RIST-05, RIST-06, RIST-07, RIST-08, RIST-09, RIST-10
```

**Gotchas:**
- Success Criteria della Phase 2 (righe 38-44) già coprono la funzionalità città nei criteri 1-2. Aggiungere esplicitamente un criterio RIST-10 non è strettamente necessario — opzionale.

---

## Shared Patterns

### Auth context
**Source:** `src/hooks/useAuth.jsx` — `useAuth()` → `{ user, loading }`.
**Apply to:** `RistorantiPage.jsx`, `RestaurantModal.jsx`.
**Excerpt — standard consumer:**
```jsx
const { user } = useAuth()
// poi user.id passato a tutte le chiamate db
```

### Toast feedback
**Source:** `src/components/shared/Toast.jsx` — `useToast()` returns `addToast` callback direttamente.
**Apply to:** `RistorantiPage.jsx`, `RestaurantModal.jsx` per conferme aggiunta/rimozione/rating/send.
**Excerpt (`src/components/books/BookModal.jsx:70-74`):**
```jsx
const toast = useToast()
...
toast(`"${book.title}" rimosso dalla libreria`, 'success')
toast(`"${book.title}" segnato come ${labels[status]}!`, 'success')
```
**Italian copy obbligatoria. Types: `'success' | 'error'`.**

### Import organization (CONVENTIONS.md §"Import Organization")
**Apply to:** tutti i file JSX nuovi (`RistorantiPage.jsx`, `RestaurantModal.jsx`, `StarRating.jsx`).
**Ordine fisso:**
1. `react` hooks
2. `lucide-react` icons + `react-router-dom`
3. `../../lib/*.js` (relative, .js extension)
4. `../../hooks/useAuth.jsx`
5. `../shared/Toast.jsx`, siblings

### Error handling silent-fallback
**Source:** `src/lib/gemini.js:130-138` (getSimilarMovies).
**Apply to:** `ai.getSimilarRestaurants`, `ai.getPersonalizedRestaurantSuggestions` in `gemini.js`.
**Excerpt:**
```js
try {
  const text = await askGemini(prompt)
  const result = parseJSON(text, null)
  if (result) return result
} catch {}

const text = await askGroq(prompt)
return parseJSON(text, [])
```

### DB return-shape discipline (CONVENTIONS.md §"Function Design")
**Source:** `src/lib/db.js` mixed returns.
**Apply to:** nuovi metodi in `db.js` per ristoranti + user_cities.
- reads → `return data || []`
- upsert writes → `return { data, error }`
- bare update/delete → `return supabase.from(...).update(...).eq(...)` (raw builder)
**Rationale:** callers esistenti aspettano queste shape. Non correggere in Phase 2 (fuori scope v2).

### Polling 60s per badge unread
**Source:** `src/App.jsx:36-45` (AppShell useEffect setInterval).
**Apply to:** estensione a 3 stream (film + libri + ristoranti) via `Promise.all`. Vedi §8.

### Modal dismiss pattern
**Source:** `src/components/books/BookModal.jsx:144-148`.
**Apply to:** `RestaurantModal.jsx`.
**Excerpt:**
```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal" onClick={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={18} /></button>
    ...
  </div>
</div>
```

### Conditional render nesting (2-3 levels deep tolerated)
**Source:** `src/components/books/BooksPage.jsx:161-194` (grid loading/empty/displayed ternary).
**Apply to:** `RistorantiPage.jsx` grid e AI tab.
**Idiom:** `loading ? <Loader/> : empty ? <EmptyState/> : <Grid/>`.

---

## No Analog Found

Nessun file resta senza analog. I kind nuovi rispetto al codebase attuale:

| Concetto nuovo | Analog più vicino | Nota |
|---|---|---|
| Dispatcher layer (`placesProvider.js`) | `tmdb.js` / `googlebooks.js` namespace shape | Struttura namespace uguale, semantica dispatcher nuova |
| Selettore città orizzontale chip scrollabile | `.scroll-x` + `.btn btn-sm` | Classi esistenti + nuova `.city-chip`; `.tabs` è un pattern simile |
| Filtro multi-select OR su array colonna | nessun precedente | Computato inline: `r.labels?.some(l => selected.includes(l))` |
| Provider-dispatch toggle via env | `import.meta.env.VITE_*` boolean/string | Zero precedenti di branching env-driven; il pattern è nuovo ma trasparente |
| Labels array autocomplete client-side | nessun precedente | Scan `visitedRestaurants.flatMap(r => r.labels)` → unique set |
| Note textarea save-on-blur | nessun precedente | Pattern `onBlur={() => db.updateRestaurantNotes(...)}` — inventarlo on-the-fly, coerente con progress update in BookModal:91-98 |

---

## Cross-Cutting Gotchas (per tutti i file JSX/JS nuovi)

1. **Estensioni import esplicite** — `from './foo.js'`, `from './Bar.jsx'`. Verificato in tutti i sorgenti (CONVENTIONS riga 11).
2. **No semicolons** — ASI ovunque. Verifica `tmdb.js:1-3`.
3. **2-space indent** — con drift tollerato in zone legacy (App.jsx topbar). Nel nuovo codice: 2-space sempre.
4. **Single quotes** per stringhe JS; **double quotes** per attributi JSX; **backticks** per template literals.
5. **No TypeScript**. No JSDoc. No PropTypes. No `@types` import.
6. **ES modules**. `"type": "module"` già in package.json.
7. **Namespace const-object export** per lib: `export const foursquare = { ... }`, `export const placesProvider = { ... }`.
8. **Default export per componenti React**. `export default function RistorantiPage()`.
9. **snake_case dei campi DB passa direttamente in JSX** — nessun adapter camelCase (CONVENTIONS riga 45). Es: `r.restaurant_name`, `r.is_favorite`, `r.created_at`.
10. **No `useMemo`, `useReducer`, `useRef`** — solo `useState` / `useEffect` / `useCallback` / `useContext` (CONVENTIONS riga 67).
11. **No nuove dipendenze npm** — tutto con `fetch` nativo, `lucide-react` per icone (già presente), `react-router-dom` per routing (già presente). Verificato.
12. **UI copy in italiano**. Console log in inglese.
13. **Toast su ogni azione utente** — success per aggiunta/rimozione/send, error per "non trovato".
14. **No error boundary**, no `res.ok` check nei REST lib — coerente con Phase 2 scope (QUAL-01/02 sono Phase 3).
15. **RLS owner-only su tutte le nuove tabelle** — `auth.uid() = user_id` (o `from_user_id`/`to_user_id` per social).
16. **`.env.local` mai committato** — solo `.env.example` in Phase 2. La dipendenza SEC-05 in Phase 1 blocca qualunque commit di `.env.local`.

---

## Metadata

**Analog search scope:** `src/lib/**`, `src/components/**`, `src/styles/main.css`, `supabase_schema.sql`, `src/App.jsx`, `.env.example`, `.planning/**/*.md`.
**Files scanned (read in full o letti con Grep/Read mirato):**
- `src/lib/googlebooks.js` (64 L — full)
- `src/lib/tmdb.js` (55 L — full)
- `src/lib/db.js` (213 L — full)
- `src/lib/gemini.js` (192 L — full)
- `src/components/books/BooksPage.jsx` (320 L — full)
- `src/components/books/BookModal.jsx` (312 L — full)
- `src/components/cinema/NotificationsPage.jsx` (134 L — full)
- `src/components/layout/Sidebar.jsx` (40 L — full)
- `src/App.jsx` (99 L — full)
- `src/components/cinema/CinemaPage.jsx` (righe 1-100 — targeted)
- `src/styles/main.css` (407 L — full)
- `supabase_schema.sql` (106 L — full)
- `.env.example` (11 L — full)
- `.planning/phases/02-verticale-ristoranti/02-CONTEXT.md` (230 L — full)
- `.planning/phases/02-verticale-ristoranti/02-USER-REQ.md` (85 L — full)
- `.planning/ROADMAP.md` (67 L — full)
- `.planning/REQUIREMENTS.md` (141 L — full)
- `.planning/codebase/CONVENTIONS.md` (163 L — full)
- `.planning/codebase/STRUCTURE.md` (142 L — full)

**Pattern extraction date:** 2026-04-22
