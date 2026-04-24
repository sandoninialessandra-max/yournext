# YourNext

> *Un posto solo per tracciare film, libri e ristoranti — e scambiarsi consigli con il proprio gruppo di amici.*

## What This Is

App social privata per un piccolo gruppo di amici stretti. Ogni utente segna cosa ha visto, letto o mangiato, dà voti e commenti, invia consigli mirati agli amici, e riceve suggerimenti personalizzati dall'AI.

**Tre verticali, un solo posto:**
- **Cinema** — film (TMDB) — già completo e in produzione
- **Libri** — libri (Google Books) — appena implementato, da consolidare
- **Ristoranti** — ristoranti (Foursquare Places) — da costruire in v1

Non è un prodotto pubblico. È un tool per ~5-10 persone che si consigliano cose a vicenda.

## Who Uses It

- **Owner** (Alessandra) + **5-10 amici stretti** invitati manualmente.
- Autenticazione solo con **Google OAuth** (Supabase PKCE).
- Nessun signup aperto. Chi non è invitato non passa.

## Core Value

> *"Un'unica app dove posso tracciare tutto ciò che consumo — film, libri, ristoranti — e consigliarlo con un commento alle stesse persone che frequento."*

Perché non esiste già:

| Competitor | Film | Libri | Ristoranti | Stessi amici |
|---|---|---|---|---|
| Letterboxd | ✓ | ✗ | ✗ | silos |
| Goodreads | ✗ | ✓ | ✗ | silos |
| TripAdvisor | ✗ | ✗ | ✓ | recensioni pubbliche, non cerchia chiusa |
| **YourNext** | ✓ | ✓ | ✓ | **gruppo fisso** |

## Context

**Stato attuale (2026-04-22):**
- Prototipo deployato su Vercel, funzionante.
- **Cinema**: completo in produzione — search, watched/wishlist, rating 1-5, favorite, AI full plot, AI similar, AI personalized, send-suggestion con commento, notifiche.
- **Libri**: implementazione appena completata, file ancora non committati in `src/components/books/` e `src/lib/googlebooks.js` — **lavoro da conservare assolutamente**.
- **Ristoranti**: non iniziato.
- **Viaggi**: placeholder `ComingSoon` in `src/App.jsx:18` — fuori v1.

**Debito tecnico che blocca uno stato "pulito":**
- Secrets committati in `primo commit`: `.env.local` trackato, `SETUP.md` con JWT Supabase reale + Client Secret Google OAuth + chiavi TMDB/Gemini in chiaro.
- `.gitignore` non trackato (untracked), quindi la regola non ha mai avuto effetto.
- `node_modules/` trackato (~10.770 file).
- Schema drift: `read_books`, `book_suggestions` e la colonna `watched_movies.status` sono usati in codice ma non in `supabase_schema.sql`.
- Clone pulito non compila: `src/App.jsx:8` importa `src/components/books/BooksPage.jsx` che è untracked.

Per il dettaglio completo vedere `.planning/codebase/` (7 documenti).

## Requirements

### Validated (già funzionanti in produzione)

**Auth & profili:**
- ✓ **AUTH-01** Login con Google OAuth via Supabase PKCE — `src/hooks/useAuth.jsx`, `src/lib/supabase.js`
- ✓ **AUTH-02** Sessione persistente cross-tab, autorefresh token — configurato in `src/lib/supabase.js`
- ✓ **AUTH-03** Logout da qualunque pagina — top-bar in `src/App.jsx`
- ✓ **PROF-01** Upsert profilo su login (email + full_name + avatar) — trigger `handle_new_user` + fallback `syncProfile`

**Cinema (completo):**
- ✓ **CIN-01** Ricerca film via TMDB — `src/lib/tmdb.js`
- ✓ **CIN-02** Marcare film come visto o come wishlist — `src/lib/db.js#addWatchedMovie/addToWishlist`
- ✓ **CIN-03** Rating 1–5 stelle e flag favorite — `watched_movies.rating`, `is_favorite`
- ✓ **CIN-04** AI: trama completa (Gemini → fallback Groq) — `ai.getFullPlot`
- ✓ **CIN-05** AI: film simili — `ai.getSimilarMovies`
- ✓ **CIN-06** AI: suggerimenti personalizzati basati sui film visti — `ai.getPersonalizedSuggestions`
- ✓ **CIN-07** TMDB: credits, watch providers, trailer, similar — `MovieModal.jsx`

**Libri (implementazione appena completata, da conservare):**
- ✓ **LIB-01** Ricerca libri via Google Books — `src/lib/googlebooks.js`
- ✓ **LIB-02** Stato libro: letto / in lettura / wishlist — `read_books.status`
- ✓ **LIB-03** Tracking progresso pagine (`current_page`) — `db.updateBookProgress`
- ✓ **LIB-04** Rating mezza-stella (StarRating in `BookModal.jsx`)
- ✓ **LIB-05** AI: libri simili — `ai.getSimilarBooks`
- ✓ **LIB-06** AI: suggerimenti personalizzati basati sui libri letti — `ai.getPersonalizedBookSuggestions`

**Social:**
- ✓ **FR-01** Cercare amico per email e aggiungerlo — `ProfilePage.jsx#handleAddFriend`
- ✓ **SUG-01** Inviare consiglio film a un amico con commento — `db.sendSuggestion`
- ✓ **SUG-02** Inviare consiglio libro a un amico con commento — `db.sendBookSuggestion`
- ✓ **SUG-03** Pagina notifiche unificata (film + libri) con auto-mark-as-read — `NotificationsPage.jsx`
- ✓ **SUG-04** Badge unread in sidebar, polling 60s — `App.jsx#AppShell`

**Infra:**
- ✓ **INF-01** Deploy su Vercel con SPA rewrite — `vercel.json`
- ✓ **INF-02** Autorizzazione via Supabase RLS (per le tabelle dichiarate) — `supabase_schema.sql`

### Active (v1, da costruire)

**Prima fase — Security & cleanup (blocca tutto il resto):**

- [ ] **SEC-01** Rotazione di tutte le chiavi esposte in `primo commit` (Supabase anon JWT, Google OAuth Client Secret, TMDB, Gemini, Groq)
- [ ] **SEC-02** Scrub di `SETUP.md`: sostituire valori reali con placeholder, aggiungere warning "⚠ non committare mai chiavi reali"
- [ ] **SEC-03** Committare un `.gitignore` completo (coprire `.env*.local`, `node_modules/`, `.DS_Store`, `.vercel/`, `*.log`)
- [ ] **SEC-04** Rimuovere `node_modules/` dal tracking (git rm -r --cached)
- [ ] **SEC-05** Rimuovere `.env.local` dal tracking
- [ ] **SEC-06** Decisione esplicita: rewrite della git history per rimuovere i leak, oppure accettazione documentata del rischio (repo privato)
- [ ] **CLEAN-01** Reconcile `supabase_schema.sql` con lo stato reale del DB: aggiungere DDL e RLS per `read_books`, `book_suggestions`, colonna `watched_movies.status`
- [ ] **CLEAN-02** Committare i file untracked che sono lavoro in corso legittimo: `src/components/books/`, `src/lib/googlebooks.js`, `favicon.svg`, `ANALISI_PROGETTO.md`
- [ ] **CLEAN-03** Verificare che `npm install && npm run dev` funzioni da clone pulito

**Seconda fase — Ristoranti vertical:**

- [ ] **RIST-01** Integrazione Foursquare Places API (`src/lib/foursquare.js`) con search, dettagli place (foto, rating, fascia prezzo, indirizzo, categoria)
- [ ] **RIST-02** Schema DB: tabella `visited_restaurants` (analoga a `watched_movies`/`read_books`) con RLS per-utente
- [ ] **RIST-03** Schema DB: tabella `restaurant_suggestions` (analoga a `movie_suggestions`/`book_suggestions`)
- [ ] **RIST-04** `RistorantiPage.jsx` con tabs "I miei ristoranti" / "Scopri" / "Consigli AI"
- [ ] **RIST-05** `RestaurantModal.jsx`: dettagli, rating 1-5, flag visited/wishlist, invia-a-amico con commento
- [ ] **RIST-06** AI ristoranti: suggerimenti personalizzati + simili (pattern Gemini + Groq fallback come `gemini.js`)
- [ ] **RIST-07** Estendere `NotificationsPage.jsx` e unread polling per includere `restaurant_suggestions`
- [ ] **RIST-08** Voce sidebar + route `/ristoranti` in `App.jsx`

**Terza fase — Quality baseline (minimo per uso continuato):**

- [ ] **QUAL-01** React error boundary a livello app-shell (oggi un render error bianca tutta l'app)
- [ ] **QUAL-02** Error surfacing minimo nei lib (`tmdb.js`, `googlebooks.js`, `foursquare.js`): almeno `res.ok` check + toast d'errore

### Out of Scope

- **Viaggi / travel** — placeholder `ComingSoon` resta in codice disabilitato, feature rinviata a v2 / milestone successivo. *Motivazione: la v1 dichiarata è film+libri+ristoranti; aggiungere viaggi raddoppia il lavoro Foursquare-like senza priorità.*
- **Testing framework** (Vitest + RTL + MSW) — gap reale, ma 5-10 utenti privati non giustificano l'investimento in v1. *Motivazione: alto rapporto costo/beneficio in v1, gap documentato in `.planning/codebase/TESTING.md` e `CONCERNS.md`.*
- **TypeScript migration** — non richiesto dall'utente. *Motivazione: codebase già coerente in JS, nessun bug chiaramente risolvibile solo con tipi.*
- **Signup pubblico / auth non-Google** — rimane invite-only. *Motivazione: è il design scelto, non un'omissione.*
- **CI/CD pipeline** — Vercel auto-deploy da `main` è sufficiente per la taglia del gruppo. *Motivazione: serve CI quando servono test e code review — non è il caso ora.*
- **Audit accessibility / a11y fixes** — gap noto (nessun `aria-*`, div-cliccabili non tastiera-accessibili), ma utenti = amici senza esigenze specifiche. *Motivazione: fix mirato se/quando emerge bisogno reale.*
- **Proxy serverless per chiavi LLM** — `VITE_GEMINI_KEY`/`VITE_GROQ_KEY` restano client-side. *Motivazione: costo/beneficio accettato — gruppo privato, monitoriamo il consumo.*

## Key Decisions

| Decisione | Rationale | Stato |
|---|---|---|
| Supabase BaaS, nessun backend server custom | 5-10 utenti, costo ~zero, RLS risolve authorization | ✓ Validated (in produzione) |
| Chiavi API client-side (VITE_*) | App privata, gruppo chiuso, trade-off accettato | ✓ Validated (con caveat SEC-01..06) |
| Hybrid LLM: Gemini primario + Groq fallback | Resilienza a rate-limit / quota Gemini free tier | ✓ Validated |
| Italiano per tutta la UI | Utenti = amici italiani | ✓ Validated |
| Stile identificatori misto (en per il codice, it per i testi utente) | Convenzione già affermata nel codebase | ✓ Validated |
| Nessun global store (niente Redux / Zustand / React Query) | State leggero per-page; ok per la scala corrente | ✓ Validated |
| Single global stylesheet `main.css` con CSS custom properties | Già in uso, semplice, niente build step extra | ✓ Validated |
| **Foursquare Places** per Ristoranti (non Google Places / OSM / manuale) | Tier gratuito più generoso, dati Italia buoni, pattern REST identico a TMDB/GoogleBooks | ⏳ Pending (RIST-01) |
| **Security hardening prima di Ristoranti** | Chiavi esposte in git history sono rischio concreto anche con repo privato; meglio pulire prima di aggiungere una terza API key | ⏳ Pending (Fase 1) |
| **Viaggi fuori v1** | v1 dichiarata = film+libri+ristoranti; viaggi duplicherebbe lavoro senza priorità | ⏳ Pending |
| Schema DB come source of truth in `supabase_schema.sql` | Evita il drift che si è già creato per `read_books` / `book_suggestions` | ⏳ Pending (CLEAN-01) |
| **SEC-01 rotazione chiavi → v2 (accept-risk)** | Repo privato invite-only, blast radius basso (RLS limita Supabase anon; Google OAuth secret solo redirect flow; LLM/TMDB solo free-tier quotas). Trigger di riapertura: prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo attuale. | ⏳ Deferred 2026-04-23 (Fase 1 planning) |
| **SEC-06 history rewrite → v2 (accept-risk)** | Pair logico con SEC-01: senza rotazione, la rewrite è cosmetica. Riapertura insieme a SEC-01. | ⏳ Deferred 2026-04-23 (Fase 1 planning) |

## Constraints

- **Budget:** gratuito o quasi. Supabase free tier + Vercel free tier + Gemini free tier + Foursquare free tier. Se un servizio inizia a costare, valutiamo alternative.
- **Utenti attivi massimi previsti:** 10.
- **Dispositivi:** desktop + mobile web. Nessuna app nativa.
- **Lingua UI:** italiano only.
- **No hardcoded secrets** dopo SEC-01..06: da quel momento, solo `VITE_*` via `.env.local` (git-ignored) o Vercel env vars.

## Naming note

Il folder è `cinematica`, il `<title>` in `index.html` è "Your Next", il brand in login è "YourNext ❤️". In questo documento e nelle future fasi usiamo **YourNext** come nome pubblico. La rinomina del folder è un'operazione separata (non bloccante).

## Evolution

Questo documento evolve ai phase transition e ai milestone boundary.

**Dopo ogni phase transition** (via `/gsd-next` o `/gsd-execute-phase`):
1. Requirement invalidato? → Spostare in Out of Scope con motivo
2. Requirement validato? → Spostare in Validated con reference alla fase
3. Nuovi requirement emersi? → Aggiungere in Active
4. Decisioni da loggare? → Aggiungere in Key Decisions
5. "What This Is" ancora accurato? → Aggiornare se c'è drift

**Dopo ogni milestone** (via `/gsd-complete-milestone`):
1. Review completa di tutte le sezioni
2. Core Value check — è ancora la priorità giusta?
3. Audit Out of Scope — i motivi sono ancora validi?
4. Aggiornare Context con lo stato corrente

---

*Last updated: 2026-04-22 after initialization.*
