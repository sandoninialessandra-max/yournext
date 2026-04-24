# Analisi Funzionale e Tecnica - YourNext (Cinematica)

> Documento di analisi completo del progetto. Versione: 1.0 | Data: 22 Aprile 2026

---

## Indice

1. [Overview del Progetto](#1-overview-del-progetto)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Architettura del Sistema](#3-architettura-del-sistema)
4. [Struttura del Progetto](#4-struttura-del-progetto)
5. [Analisi Funzionale](#5-analisi-funzionale)
6. [Modello Dati (Database Schema)](#6-modello-dati-database-schema)
7. [Integrazioni API Esterne](#7-integrazioni-api-esterne)
8. [Sistema di Autenticazione](#8-sistema-di-autenticazione)
9. [Routing e Navigazione](#9-routing-e-navigazione)
10. [Gestione dello Stato](#10-gestione-dello-stato)
11. [UI/UX e Design System](#11-uiux-e-design-system)
12. [Build e Deployment](#12-build-e-deployment)
13. [Punti di Forza e Criticita](#13-punti-di-forza-e-criticita)

---

## 1. Overview del Progetto

**YourNext** e una web application social per il tracking e la scoperta di film e libri. Consente agli utenti di:

- Catalogare film visti e libri letti
- Gestire wishlist personali
- Ricevere suggerimenti personalizzati generati da intelligenza artificiale
- Condividere suggerimenti con amici
- Esplorare contenuti in tendenza e in uscita

L'app e pensata per un pubblico italiano (UI interamente in italiano, risultati localizzati per l'Italia).

---

## 2. Stack Tecnologico

### Frontend

| Tecnologia | Versione | Ruolo |
|---|---|---|
| React | 18.2.0 | Libreria UI |
| React Router DOM | 6.21.0 | Routing client-side (SPA) |
| Vite | 5.0.8 | Build tool e dev server |
| Lucide React | 0.309.0 | Libreria icone SVG |
| date-fns | 3.0.6 | Utility per date |

### Backend (BaaS)

| Tecnologia | Versione | Ruolo |
|---|---|---|
| Supabase JS | 2.39.0 | Database PostgreSQL + Autenticazione |

### API Esterne

| Servizio | Ruolo |
|---|---|
| TMDB (The Movie Database) | Metadati film, trending, ricerca |
| Google Books API | Metadati libri, ricerca, trending |
| Google Gemini 2.5 Flash | Suggerimenti AI (contenuti recenti) |
| Groq LLaMA 3.3 70B | Suggerimenti AI (contenuti classici / fallback) |

### Deployment

| Tecnologia | Ruolo |
|---|---|
| Vercel | Hosting e deploy |

### Assenze Notevoli

- **Nessun framework CSS** (no Tailwind, no Bootstrap) - CSS custom puro
- **Nessun state manager globale** (no Redux, no Zustand) - Context API + stato locale
- **Nessun linter/formatter** configurato (no ESLint, no Prettier)
- **Nessun framework di testing** (no Jest, no Vitest, no Cypress)
- **Nessun TypeScript** - solo JSX puro (i tipi sono presenti solo come devDependencies per l'IDE)

---

## 3. Architettura del Sistema

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|   Browser/SPA    | <---> |    Supabase      | <---> |   PostgreSQL     |
|   (React+Vite)   |       |   (Auth+API)     |       |   (Database)     |
|                  |       |                  |       |                  |
+--------+---------+       +------------------+       +------------------+
         |
         |  Fetch API (REST)
         |
    +----+----+-----+-----+
    |         |           |
+---v---+ +---v---+ +-----v-----+
|  TMDB | | Google| |  Gemini / |
|  API  | | Books | |  Groq AI  |
+-------+ +-------+ +-----------+
```

### Pattern Architetturali

- **Single Page Application (SPA)**: Navigazione interamente client-side
- **Backend-as-a-Service (BaaS)**: Nessun backend custom, Supabase gestisce DB e auth
- **Component-based Architecture**: Componenti React funzionali con hooks
- **Context Pattern**: AuthContext e ToastContext per stato globale
- **Modal Pattern**: MovieModal e BookModal come componenti controllati dal parent
- **Hybrid AI Strategy**: Due provider AI (Gemini primario, Groq fallback) con logica di selezione basata sull'epoca del contenuto

---

## 4. Struttura del Progetto

```
cinematica/
|-- index.html                    # Entry point HTML
|-- package.json                  # Dipendenze e scripts
|-- vite.config.js                # Configurazione Vite
|-- vercel.json                   # Configurazione deployment (SPA rewrites)
|-- favicon.svg                   # Favicon
|-- .env.local                    # Variabili d'ambiente (secrets)
|-- .gitignore                    # Git ignore rules
|
|-- src/
|   |-- main.jsx                  # Entry point React (ReactDOM.createRoot)
|   |-- App.jsx                   # Router principale + AppShell + ComingSoon
|   |
|   |-- components/
|   |   |-- auth/
|   |   |   |-- LoginPage.jsx     # Pagina di login (Google OAuth)
|   |   |
|   |   |-- cinema/
|   |   |   |-- CinemaPage.jsx    # Hub film (tabs: i miei, scopri, AI)
|   |   |   |-- MovieModal.jsx    # Dettaglio film (modal)
|   |   |   |-- NotificationsPage.jsx  # Feed suggerimenti da amici
|   |   |   |-- ProfilePage.jsx   # Profilo utente + gestione amici
|   |   |
|   |   |-- books/
|   |   |   |-- BooksPage.jsx     # Hub libri (tabs: i miei, scopri, AI)
|   |   |   |-- BookModal.jsx     # Dettaglio libro (modal)
|   |   |
|   |   |-- layout/
|   |   |   |-- Sidebar.jsx       # Navigazione laterale/bottom
|   |   |
|   |   |-- shared/
|   |       |-- Toast.jsx         # Sistema notifiche toast + ToastContext
|   |
|   |-- hooks/
|   |   |-- useAuth.jsx           # AuthProvider + useAuth hook
|   |
|   |-- lib/
|   |   |-- supabase.js           # Client Supabase + signIn/signOut
|   |   |-- db.js                 # Layer di accesso dati (tutte le query)
|   |   |-- tmdb.js               # Client TMDB API
|   |   |-- gemini.js             # Client AI (Gemini + Groq)
|   |   |-- googlebooks.js        # Client Google Books API
|   |
|   |-- styles/
|       |-- main.css              # Unico foglio di stile (tutto il CSS)
```

### Conteggio Componenti

| Categoria | Componenti | File |
|---|---|---|
| Pagine | 5 | LoginPage, CinemaPage, BooksPage, NotificationsPage, ProfilePage |
| Modali | 2 | MovieModal, BookModal |
| Layout | 2 | Sidebar, AppShell (inline in App.jsx) |
| Shared | 2 | Toast, ComingSoon (inline in App.jsx) |
| Hooks | 1 | useAuth |
| Librerie | 4 | db.js, tmdb.js, gemini.js, googlebooks.js |
| **Totale** | **16** | |

---

## 5. Analisi Funzionale

### 5.1 Sezione Cinema (`/cinema`)

La sezione principale dell'app, organizzata in tre tab:

#### Tab 1: I Miei Film

| Funzionalita | Descrizione |
|---|---|
| Subtab "Visti" | Lista film con status `watched`, ordinati per data |
| Subtab "Da vedere" | Lista film con status `wishlist` |
| Ricerca | Ricerca per titolo tramite TMDB API |
| Filtro Preferiti | Toggle per mostrare solo i film contrassegnati come preferiti |
| Aggiunta rapida | Da risultati ricerca: segna come visto o aggiungi a wishlist |
| Apertura dettaglio | Click su card apre MovieModal |

#### Tab 2: Scopri

| Funzionalita | Descrizione |
|---|---|
| Al cinema | Film attualmente nelle sale (regione: Italia) |
| Di tendenza | Film trending della settimana |
| In arrivo | Prossime uscite (regione: Italia) |

#### Tab 3: Consigli AI

| Funzionalita | Descrizione |
|---|---|
| Prerequisito | Minimo 3 film visti per attivare i suggerimenti |
| Logica ibrida | Groq per classici (pre-2020), Gemini per recenti (2020+) |
| Output | Lista di film suggeriti con motivazione e affinita (1-5 stelle) |
| Verifica | I film suggeriti vengono verificati su TMDB per metadati e poster |

#### MovieModal (Dettaglio Film)

| Funzionalita | Descrizione |
|---|---|
| Info base | Poster, backdrop, titolo, titolo originale, anno, durata, generi |
| Valutazione | Rating IMDb (da TMDB) + rating personale (1-5 stelle) |
| Azioni | Segna come visto, aggiungi a wishlist, preferito, valuta |
| Trama completa | Generata via AI (con avviso spoiler) |
| Film simili | Suggerimenti AI basati sul film corrente |
| Dove vederlo | Provider di streaming per la regione Italia |
| Suggerisci ad amico | Seleziona amico dalla lista + commento opzionale |

### 5.2 Sezione Libri (`/books`)

Struttura speculare alla sezione Cinema:

#### Tab 1: I Miei Libri

| Funzionalita | Descrizione |
|---|---|
| Subtab "Letti" | Libri con status `read` |
| Subtab "In lettura" | Libri con status `reading` |
| Subtab "Da leggere" | Libri con status `wishlist` |
| Ricerca | Ricerca per titolo/autore tramite Google Books API |
| Filtro Preferiti | Toggle preferiti |

#### Tab 2: Scopri

| Funzionalita | Descrizione |
|---|---|
| Trending Fiction | Libri di narrativa in tendenza |
| Novita | Libri pubblicati nell'anno corrente |

#### Tab 3: Consigli AI

| Funzionalita | Descrizione |
|---|---|
| Logica ibrida | Groq per classici (pre-2000), Gemini per recenti (2010+) |
| Output | Lista libri con motivazione e affinita |

#### BookModal (Dettaglio Libro)

| Funzionalita | Descrizione |
|---|---|
| Info base | Copertina, titolo, autori, editore, anno, pagine |
| Rating | Google Books rating + rating personale |
| Categorie | Generi/categorie dal catalogo |
| Progresso lettura | Tracker pagine per libri "In lettura" |
| Cambio stato | Toggle tra letto/in lettura/da leggere |
| Libri simili | Suggerimenti AI |
| Suggerisci ad amico | Come per i film |

### 5.3 Notifiche (`/notifications`)

| Funzionalita | Descrizione |
|---|---|
| Feed unificato | Suggerimenti di film e libri ricevuti da amici |
| Filtri | Tutti, Solo Film, Solo Libri |
| Info mostrate | Mittente, poster/copertina, titolo, commento opzionale |
| Lettura automatica | Segna come letti alla visita della pagina |
| Badge | Conteggio non letti visibile sulla sidebar (polling ogni 60s) |

### 5.4 Profilo (`/profile`)

| Funzionalita | Descrizione |
|---|---|
| Info utente | Avatar Google, nome completo, email |
| Logout | Disconnessione dalla sessione |
| Lista amici | Visualizzazione amici con avatar e nome |
| Cerca amici | Ricerca per email nella tabella profiles |
| Aggiungi amico | Creazione relazione bidirezionale di amicizia |

### 5.5 Viaggi (`/travel`)

Sezione placeholder con messaggio "In arrivo!". Nessuna funzionalita implementata.

---

## 6. Modello Dati (Database Schema)

Database PostgreSQL gestito tramite Supabase.

### Tabella: `profiles`

| Colonna | Tipo | Note |
|---|---|---|
| `id` | UUID (PK) | Corrisponde a auth.users.id |
| `email` | TEXT (UNIQUE) | Email Google dell'utente |
| `full_name` | TEXT | Nome completo da Google |
| `avatar_url` | TEXT | URL avatar da Google |

### Tabella: `watched_movies`

| Colonna | Tipo | Note |
|---|---|---|
| `user_id` | UUID (PK, FK) | Riferimento a profiles.id |
| `movie_id` | INTEGER (PK) | ID TMDB del film |
| `movie_title` | TEXT | Titolo del film |
| `movie_poster` | TEXT | Path poster TMDB |
| `movie_year` | TEXT | Anno di uscita (YYYY) |
| `movie_genres` | TEXT[] | Array generi |
| `status` | TEXT | `'watched'` o `'wishlist'` |
| `rating` | INTEGER | Valutazione 1-5 (nullable) |
| `is_favorite` | BOOLEAN | Flag preferito |
| `created_at` | TIMESTAMP | Data inserimento |

### Tabella: `read_books`

| Colonna | Tipo | Note |
|---|---|---|
| `user_id` | UUID (PK, FK) | Riferimento a profiles.id |
| `book_id` | TEXT (PK) | ID Google Books |
| `book_title` | TEXT | Titolo del libro |
| `book_cover` | TEXT | URL copertina |
| `book_year` | TEXT | Anno pubblicazione |
| `book_authors` | TEXT | Autori (stringa separata da virgole) |
| `book_pages` | INTEGER | Numero di pagine |
| `status` | TEXT | `'read'`, `'reading'` o `'wishlist'` |
| `current_page` | INTEGER | Pagina corrente (default: 0) |
| `rating` | INTEGER | Valutazione 1-5 (nullable) |
| `is_favorite` | BOOLEAN | Flag preferito |
| `created_at` | TIMESTAMP | Data inserimento |

### Tabella: `movie_suggestions`

| Colonna | Tipo | Note |
|---|---|---|
| `id` | UUID (PK) | Auto-generato |
| `from_user_id` | UUID (FK) | Chi suggerisce |
| `to_user_id` | UUID (FK) | Chi riceve |
| `movie_id` | INTEGER | ID TMDB |
| `movie_title` | TEXT | Titolo film |
| `movie_poster` | TEXT | Path poster |
| `movie_year` | TEXT | Anno |
| `comment` | TEXT | Commento opzionale (nullable) |
| `read` | BOOLEAN | Letto? (default: false) |
| `created_at` | TIMESTAMP | Data invio |

### Tabella: `book_suggestions`

| Colonna | Tipo | Note |
|---|---|---|
| `id` | UUID (PK) | Auto-generato |
| `from_user_id` | UUID (FK) | Chi suggerisce |
| `to_user_id` | UUID (FK) | Chi riceve |
| `book_id` | TEXT | ID Google Books |
| `book_title` | TEXT | Titolo libro |
| `book_cover` | TEXT | URL copertina |
| `book_authors` | TEXT | Autori |
| `comment` | TEXT | Commento opzionale (nullable) |
| `read` | BOOLEAN | Letto? (default: false) |
| `created_at` | TIMESTAMP | Data invio |

### Tabella: `friendships`

| Colonna | Tipo | Note |
|---|---|---|
| `user_id` | UUID (PK, FK) | Utente A |
| `friend_id` | UUID (PK, FK) | Utente B |
| `created_at` | TIMESTAMP | Data creazione |

> **Nota**: Le amicizie vengono inserite in modo bidirezionale (due righe per ogni relazione).

### Diagramma Relazioni

```
profiles ─────< watched_movies
    |
    |─────< read_books
    |
    |─────< movie_suggestions (from_user_id)
    |─────< movie_suggestions (to_user_id)
    |
    |─────< book_suggestions (from_user_id)
    |─────< book_suggestions (to_user_id)
    |
    |─────< friendships (user_id)
    |─────< friendships (friend_id)
```

---

## 7. Integrazioni API Esterne

### 7.1 TMDB (The Movie Database)

| Parametro | Valore |
|---|---|
| Base URL | `https://api.themoviedb.org/3` |
| Autenticazione | API Key via query parameter |
| Lingua | `it-IT` |
| Regione | `IT` |

**Endpoint utilizzati:**

| Endpoint | Uso nell'app |
|---|---|
| `GET /search/movie` | Ricerca film per titolo |
| `GET /movie/{id}` | Dettagli film (con credits, watch providers, similar, videos) |
| `GET /movie/now_playing` | Film al cinema (Italia) |
| `GET /movie/upcoming` | Prossime uscite (Italia) |
| `GET /trending/movie/week` | Trending settimanale |
| `GET /movie/popular` | Film popolari |

**Immagini:** `https://image.tmdb.org/t/p/{size}` con formati w92, w185, w500, w1280, original.

### 7.2 Google Books API

| Parametro | Valore |
|---|---|
| Base URL | `https://www.googleapis.com/books/v1` |
| Autenticazione | Nessuna (API pubblica) |
| Lingua | `langRestrict=it` |

**Endpoint utilizzati:**

| Endpoint | Uso nell'app |
|---|---|
| `GET /volumes?q=...` | Ricerca libri |
| `GET /volumes/{id}` | Dettaglio libro |
| `GET /volumes?q=subject:fiction` | Trending fiction |
| `GET /volumes?q=subject:fiction+inpublisher:{year}` | Novita dell'anno |

### 7.3 Google Gemini AI

| Parametro | Valore |
|---|---|
| Modello | `gemini-2.5-flash` |
| Base URL | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| Temperature | 0.8 |
| Max tokens | 4096 |

**Casi d'uso:**
- Suggerimenti film recenti (dal 2020 in poi)
- Suggerimenti libri recenti (dal 2010 in poi)
- Trama completa con spoiler
- Film/libri simili

### 7.4 Groq (LLaMA)

| Parametro | Valore |
|---|---|
| Modello | `llama-3.3-70b-versatile` |
| Base URL | `https://api.groq.com/openai/v1/chat/completions` |
| Temperature | 0.8 |
| Max tokens | 1024 |

**Casi d'uso:**
- Suggerimenti film classici (pre-2020)
- Suggerimenti libri classici (pre-2000)
- Fallback quando Gemini non e disponibile

### Strategia AI Ibrida

```
Input: lista film/libri dell'utente
    |
    v
Classificazione temporale del catalogo utente
    |
    +-- Prevalenza classici --> Groq (LLaMA 3.3 70B)
    |                           Prompt: "suggerisci classici intramontabili"
    |
    +-- Prevalenza recenti --> Gemini 2.5 Flash
    |                          Prompt: "suggerisci uscite recenti"
    |
    v
Risposta JSON (titolo, motivazione, affinita)
    |
    v
Verifica su TMDB/Google Books (poster, metadati)
    |
    v
Rendering nella UI
```

---

## 8. Sistema di Autenticazione

### Flusso di Login

```
1. Utente clicca "Continua con Google"
       |
2. supabase.auth.signInWithOAuth({ provider: 'google' })
       |
3. Redirect a Google OAuth (PKCE flow)
       |
4. Utente autorizza l'app
       |
5. Redirect back con access_token + refresh_token in URL
       |
6. AuthProvider intercetta la sessione
       |
7. Pulizia URL (rimozione token dal hash)
       |
8. Sync profilo: upsert in tabella 'profiles'
       |   (id, email, full_name, avatar_url da Google)
       |
9. Stato 'user' popolato --> render app autenticata
```

### Protezione Route

- **Non autenticato**: Viene mostrata solo `LoginPage`
- **Autenticato**: Viene mostrato `AppShell` con Sidebar + Routes
- **Persistenza**: Supabase gestisce sessione via localStorage con auto-refresh token
- **Logout**: `supabase.auth.signOut()` + pulizia stato

### AuthContext

```jsx
// Fornito da AuthProvider
{
  user: {
    id: string,          // UUID Supabase
    email: string,
    user_metadata: {
      full_name: string,
      avatar_url: string
    }
  } | null,
  loading: boolean       // true durante il check iniziale della sessione
}
```

---

## 9. Routing e Navigazione

### Mappa Route

| Path | Componente | Accesso | Descrizione |
|---|---|---|---|
| `/` | `Navigate` | Auth | Redirect a `/cinema` |
| `/cinema` | `CinemaPage` | Auth | Hub film |
| `/books` | `BooksPage` | Auth | Hub libri |
| `/travel` | `ComingSoon` | Auth | Placeholder |
| `/notifications` | `NotificationsPage` | Auth | Feed suggerimenti |
| `/profile` | `ProfilePage` | Auth | Profilo e amici |
| (fallback) | `LoginPage` | Public | Mostrata se non autenticati |

### Sidebar / Navigazione

- **Desktop (>768px)**: Sidebar verticale fissa a sinistra (72px larghezza)
  - Logo "YN" in alto
  - Icone navigazione centrali con tooltip
  - Badge notifiche non lette
- **Mobile (<768px)**: Barra orizzontale fissa in basso
  - Icone in riga con label
  - Badge notifiche

### Top Bar

Barra superiore nell'AppShell con:
- Avatar utente + nome (click -> profilo)
- Pulsante "Esci" (logout)

---

## 10. Gestione dello Stato

### Stato Globale (Context API)

| Context | Hook | Dati | Scope |
|---|---|---|---|
| AuthContext | `useAuth()` | `user`, `loading` | Tutta l'app |
| ToastContext | `useToast()` | Coda notifiche, `showToast()` | Tutta l'app |

### Stato Locale (useState per componente)

#### CinemaPage / BooksPage
- `tab` - Tab attivo (i miei, scopri, AI)
- `subTab` - Subtab attivo (visti, da vedere...)
- `items` - Lista film/libri dell'utente
- `searchQuery` / `searchResults` - Ricerca
- `trending`, `nowPlaying`, `upcoming` - Dati discovery
- `aiSuggestions`, `loadingAi` - Stato suggerimenti AI
- `filterFav` - Filtro preferiti attivo
- `selectedItemId` - ID per apertura modal

#### MovieModal / BookModal
- `item` - Dettagli completi del contenuto
- `loading` - Stato caricamento
- `fullPlot` / `showFullPlot` - Trama AI
- `similar` - Contenuti simili
- `rating` - Rating corrente
- `sendModal` / `friends` / `sendComment` - Stato invio suggerimento

#### NotificationsPage
- `suggestions` - Lista suggerimenti ricevuti
- `loading` - Stato caricamento
- `filter` - Filtro attivo (all, movies, books)

#### ProfilePage
- `friends` - Lista amici
- `emailSearch` / `searchResults` / `searching` - Ricerca amici

### Pattern di Caricamento Dati

```
useEffect(() => {
  const load = async () => {
    setLoading(true)
    try {
      const data = await db.getXxx(user.id)
      setData(data)
    } catch (err) {
      showToast('Errore...', 'error')
    } finally {
      setLoading(false)
    }
  }
  load()
}, [user, dependency])
```

---

## 11. UI/UX e Design System

### Tema e Colori

**Palette scura** (dark theme nativo):

| Variabile | Valore | Uso |
|---|---|---|
| `--bg` | `#0a0a0f` | Background principale |
| `--bg2` | `#111118` | Background secondario |
| `--bg3` | `#1a1a24` | Background terziario |
| `--bg4` | `#22222f` | Background elevato |
| `--surface` | `#16161f` | Superfici (card, sidebar) |
| `--accent` | `#e8b84b` | Colore primario (oro) |
| `--accent2` | `#c9983a` | Colore primario scuro |
| `--red` | `#e85555` | Errori, preferiti |
| `--green` | `#55b87a` | Successo, completamento |
| `--text` | `#f0efe8` | Testo primario |
| `--text2` | `#a8a79e` | Testo secondario |
| `--text3` | `#6b6a65` | Testo terziario |

### Tipografia

| Font | Uso |
|---|---|
| **DM Serif Display** (Google Fonts) | Headings (h1, h2, h3) - serif elegante |
| **DM Sans** (Google Fonts) | Body text - sans-serif leggibile |

### Componenti UI

- **Buttons**: `.btn` con varianti `primary` (accent), `secondary`, `ghost`, `danger`, `sm`, `lg`, `icon`
- **Cards**: `.movie-card` con poster, overlay gradient, titolo e anno
- **Modal**: Overlay con backdrop blur + animazione slide-up
- **Toast**: Notifiche a comparsa (angolo basso destro) con bordo colorato per tipo
- **Tabs**: Tabs con underline animata per lo stato attivo
- **Stars**: Sistema di rating a stelle con hover interattivo
- **Grid**: Grid responsive con `auto-fill` e `minmax`
- **Search bar**: Input con icona integrata
- **Loader**: Spinner con animazione rotazione (bordo accent)
- **Empty state**: Messaggio centrato con icona e testo

### Responsive Design

| Breakpoint | Layout |
|---|---|
| Desktop (>768px) | Sidebar verticale 72px + contenuto con padding 32px |
| Mobile (<768px) | Bottom bar orizzontale + contenuto con padding 16px, grid card piu piccole |

### Animazioni

| Nome | Tipo | Uso |
|---|---|---|
| `modalIn` | keyframe | Apertura modal (slide-up + scale) |
| `toastIn` | keyframe | Comparsa toast (slide da destra) |
| `spin` | keyframe | Spinner di caricamento |

---

## 12. Build e Deployment

### Scripts NPM

```bash
npm run dev      # Avvia server di sviluppo Vite (hot reload)
npm run build    # Build di produzione --> cartella dist/
npm run preview  # Anteprima build di produzione in locale
```

### Variabili d'Ambiente

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_TMDB_API_KEY=xxxxxxxx
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GROQ_API_KEY=gsk_...      # Opzionale (fallback AI)
```

### Deployment Vercel

- Configurazione in `vercel.json`: rewrite di tutte le route a `index.html` (SPA)
- Build command: `vite build`
- Output directory: `dist/`

---

## 13. Punti di Forza e Criticita

### Punti di Forza

| Aspetto | Dettaglio |
|---|---|
| **Semplicita architetturale** | Stack minimale senza over-engineering; Context API sufficiente per la scala attuale |
| **AI ibrida** | Strategia intelligente con due provider AI diversi per coprire contenuti classici e recenti, con fallback automatico |
| **UX coerente** | Design system consistente con tema scuro elegante e palette dorata distintiva |
| **Localizzazione** | App completamente in italiano con risultati localizzati per la regione Italia |
| **Social features** | Sistema di amicizie e suggerimenti che aggiunge valore sociale al tracking |
| **Responsive** | Layout adattivo ben gestito per desktop e mobile |
| **BaaS** | Supabase elimina la necessita di un backend custom, semplificando manutenzione e deploy |

### Criticita e Aree di Miglioramento

| Area | Criticita | Severita |
|---|---|---|
| **Testing** | Nessun test (unit, integration, e2e) | Alta |
| **Error handling** | Errori gestiti con try-catch + toast generici; nessun error boundary React | Media |
| **API Keys esposte** | Le chiavi TMDB, Gemini e Groq sono nel client-side (visibili nel bundle) | Alta |
| **Linting/Formatting** | Nessun ESLint o Prettier configurato | Bassa |
| **TypeScript** | Assente; tipi solo come devDep per l'IDE, nessun type-checking reale | Media |
| **Accessibilita** | Nessun attributo ARIA esplicito; navigazione da tastiera non testata | Media |
| **SEO** | SPA senza SSR/SSG; nessun meta tag dinamico | Bassa (app privata) |
| **Scalabilita CSS** | Unico file CSS monolitico (~1200+ righe); nessun CSS modules o scoping | Media |
| **Performance** | Nessun lazy loading delle route; tutti i componenti caricati al boot | Bassa |
| **Stato AI** | Nessun caching dei risultati AI; ogni navigazione rigenera le richieste | Media |
| **Gestione amicizie** | Nessuna conferma richiesta amicizia (aggiunta diretta bidirezionale) | Bassa |
| **Sezione Viaggi** | Placeholder non implementato; presente nel routing ma senza funzionalita | Bassa |
| **Indentazione mista** | Alcune parti del codice (es. App.jsx) usano tab e spazi in modo inconsistente | Bassa |

---

*Documento generato il 22 Aprile 2026.*
