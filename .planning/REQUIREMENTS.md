# Requirements — YourNext v1

> Canonical v1 requirements, scoped and numbered with REQ-IDs.
> `PROJECT.md` ha la narrativa; questo file è il registro atomico e testabile.

**Last updated:** 2026-04-22

---

## Requirement quality criteria

Ogni requirement in questo documento rispetta:
- **Specifico e testabile:** una condizione osservabile di successo.
- **User-centric:** "l'utente può X" piuttosto che "il sistema fa Y".
- **Atomico:** una sola capacità per riga.
- **Con fonte:** per i Validated, il file che lo implementa; per gli Active, la fase che li risolverà.

---

## Validated (già in produzione o in working tree)

Requirement coperti da codice esistente. Diventano la baseline di partenza — non vanno re-implementati, ma vanno verificati e conservati.

### Autenticazione & profilo

- [x] **AUTH-01** L'utente può fare login con il proprio account Google via Supabase (flusso PKCE) — `src/hooks/useAuth.jsx`, `src/lib/supabase.js`
- [x] **AUTH-02** La sessione dell'utente persiste fra tab e si auto-rinnova senza re-login — `src/lib/supabase.js` (`persistSession: true`, `autoRefreshToken: true`)
- [x] **AUTH-03** L'utente può fare logout da qualunque pagina (top-bar) — `src/App.jsx`
- [x] **PROF-01** Al primo login il profilo utente (email, full_name, avatar) è creato automaticamente su `profiles` — trigger `handle_new_user` in `supabase_schema.sql` + fallback `syncProfile` in `src/hooks/useAuth.jsx`

### Cinema

- [x] **CIN-01** L'utente può cercare film via TMDB e vedere risultati con poster, anno, rating — `src/lib/tmdb.js`, `src/components/cinema/CinemaPage.jsx`
- [x] **CIN-02** L'utente può marcare un film come visto o aggiungerlo alla wishlist — `src/lib/db.js#addWatchedMovie`, `#addToWishlist`
- [x] **CIN-03** L'utente può dare un voto 1–5 stelle e marcare un film come favorite — `watched_movies.rating` (CHECK 1..5), `is_favorite`
- [x] **CIN-04** L'utente può chiedere all'AI la trama completa di un film (Gemini con fallback Groq) — `src/lib/gemini.js#getFullPlot`
- [x] **CIN-05** L'utente può chiedere all'AI film simili a uno selezionato — `src/lib/gemini.js#getSimilarMovies`
- [x] **CIN-06** L'utente può ricevere suggerimenti AI personalizzati basati sui film che ha visto — `src/lib/gemini.js#getPersonalizedSuggestions`
- [x] **CIN-07** L'utente può vedere credits, watch providers, trailer e film correlati TMDB in un modal dettaglio — `src/components/cinema/MovieModal.jsx`

### Libri (implementato, non ancora committato)

- [x] **LIB-01** L'utente può cercare libri via Google Books — `src/lib/googlebooks.js` (untracked)
- [x] **LIB-02** L'utente può marcare un libro come letto, in lettura, o wishlist — `read_books.status` (tabella in drift rispetto a `supabase_schema.sql`)
- [x] **LIB-03** L'utente può aggiornare il progresso pagine del libro in lettura — `src/lib/db.js#updateBookProgress`
- [x] **LIB-04** L'utente può dare rating a mezza stella a un libro letto — componente `StarRating` in `src/components/books/BookModal.jsx` (untracked)
- [x] **LIB-05** L'utente può chiedere all'AI libri simili a uno selezionato — `src/lib/gemini.js#getSimilarBooks`
- [x] **LIB-06** L'utente può ricevere suggerimenti AI personalizzati basati sui libri letti — `src/lib/gemini.js#getPersonalizedBookSuggestions`

### Social

- [x] **FR-01** L'utente può cercare un amico per email e aggiungerlo alla sua rete — `src/components/cinema/ProfilePage.jsx#handleAddFriend`
- [x] **SUG-01** L'utente può inviare a un amico un consiglio film con commento libero — `src/lib/db.js#sendSuggestion`
- [x] **SUG-02** L'utente può inviare a un amico un consiglio libro con commento libero — `src/lib/db.js#sendBookSuggestion`
- [x] **SUG-03** L'utente riceve un feed unificato di consigli film+libri ordinato per data, con auto-mark-as-read — `src/components/cinema/NotificationsPage.jsx`
- [x] **SUG-04** L'utente vede un badge con conteggio consigli non letti in sidebar (refresh 60s) — `src/App.jsx#AppShell` + `src/components/layout/Sidebar.jsx`

### Infrastruttura

- [x] **INF-01** L'app è deployata su Vercel con rewrite SPA — `vercel.json`
- [x] **INF-02** Tabelle dichiarate in `supabase_schema.sql` hanno RLS policy che limita CRUD al solo owner — verificato per `profiles`, `watched_movies`, `friendships`, `movie_suggestions`

---

## v1 Active — da costruire

### Fase Security & Cleanup (priorità massima: blocca tutto il resto)

- [ ] **SEC-01** Tutte le chiavi leakate nel `primo commit` sono ruotate — Supabase anon JWT, Google OAuth Client Secret, TMDB API key, Gemini API key, Groq API key
- [ ] **SEC-02** `SETUP.md` contiene solo placeholder (mai valori reali) con warning esplicito "non committare chiavi vere"
- [ ] **SEC-03** Il repo ha un `.gitignore` tracciato che copre almeno: `.env`, `.env*.local`, `node_modules/`, `.vercel/`, `dist/`, `.DS_Store`, `*.log`
- [ ] **SEC-04** `node_modules/` non è più tracciato in git (git rm -r --cached applicato e committato)
- [ ] **SEC-05** `.env.local` non è più tracciato in git
- [ ] **SEC-06** Decisione esplicita documentata su git history rewrite (BFG / filter-repo) vs accettazione del rischio; se rewrite, esecuzione completata
- [ ] **CLEAN-01** `supabase_schema.sql` contiene DDL + RLS per `read_books`, `book_suggestions`, e la colonna `watched_movies.status`, allineato al DB di produzione
- [ ] **CLEAN-02** I file attualmente untracked (`src/components/books/`, `src/lib/googlebooks.js`, `favicon.svg`, `ANALISI_PROGETTO.md`) sono committati nel repo
- [ ] **CLEAN-03** Un `git clone` pulito seguito da `npm install && npm run dev` parte senza errori di import / build

### Fase Ristoranti — terza verticale

- [ ] **RIST-01** `src/lib/foursquare.js` espone metodi `search`, `getPlace`, `getTrending` contro Foursquare Places API v3 (pattern identico a `tmdb.js` / `googlebooks.js`)
- [ ] **RIST-02** Esistono tabelle `visited_restaurants` (per-utente, stato visited/wishlist, rating, favorite, commento personale) e relativa RLS in `supabase_schema.sql`
- [ ] **RIST-03** Esiste tabella `restaurant_suggestions` (from_user_id / to_user_id / dettagli place / commento / read) e relativa RLS
- [ ] **RIST-04** L'utente vede una pagina `/ristoranti` con tabs "I miei ristoranti" / "Scopri" / "Consigli AI", coerente con `CinemaPage` e `BooksPage`
- [ ] **RIST-05** L'utente può aprire un modal dettaglio ristorante (foto, fascia prezzo, indirizzo, categoria, rating Foursquare) e: marcarlo visited/wishlist, dare rating 1-5, marcarlo favorite, inviarlo a un amico con commento
- [ ] **RIST-06** L'utente può ricevere suggerimenti AI "ristoranti simili" e "ristoranti personalizzati" (Gemini primario + Groq fallback, come `gemini.js`) — aggiunti metodi `ai.getSimilarRestaurants`, `ai.getPersonalizedRestaurantSuggestions`
- [ ] **RIST-07** `NotificationsPage` e il badge unread mostrano anche `restaurant_suggestions`, ordinati per `created_at` insieme a film e libri
- [ ] **RIST-08** Il sidebar mostra la voce "Ristoranti" con icona `lucide-react` e route `/ristoranti` in `src/App.jsx`
- [ ] **RIST-09** `.env.example` e `.env.local` documentano `VITE_FOURSQUARE_API_KEY`

### Fase Quality Baseline — minimo di robustezza

- [ ] **QUAL-01** Un React error boundary avvolge `AppShell` e mostra un fallback UI (non una pagina bianca) quando un figlio lancia
- [ ] **QUAL-02** `src/lib/tmdb.js`, `src/lib/googlebooks.js`, `src/lib/foursquare.js` fanno `res.ok` check e propagano errore visibile all'utente (toast, non loading infinito)

---

## v2 / Out of Scope

| Item | Motivazione |
|---|---|
| Viaggi / travel vertical | v1 dichiarata è film+libri+ristoranti. Placeholder `ComingSoon` in `src/App.jsx:18` può restare disabilitato. Candidato a v2. |
| Testing framework (Vitest + RTL + MSW) | Gap reale (`.planning/codebase/TESTING.md`), ma 5-10 utenti privati non giustificano l'investimento in v1. |
| TypeScript migration | Non richiesto; codebase coerente in JS. |
| Signup pubblico / auth non-Google | Design scelto: app invite-only. |
| CI/CD pipeline custom | Vercel auto-deploy da `main` sufficiente per la scala. |
| Audit a11y e fix aria / keyboard nav | Gap noto ma utenti sono amici senza esigenze specifiche. Fix mirato se/quando emerge bisogno. |
| Proxy serverless per chiavi LLM | Trade-off accettato — gruppo privato; monitoriamo il consumo. |
| Adapter camelCase per output Supabase | Le leggere inconsistenze in `db.js` return shapes restano; ripulibili in un refactor v2. |

---

## Traceability matrix

Mappatura REQ-ID → fase del `ROADMAP.md` (popolata il 2026-04-22 alla creazione del roadmap v1).

| REQ-ID | Fase | Note |
|---|---|---|
| SEC-01 | Phase 1 — Security & Cleanup | Rotazione chiavi (Supabase / Google OAuth / TMDB / Gemini / Groq) |
| SEC-02 | Phase 1 — Security & Cleanup | Scrub `SETUP.md` con placeholder + warning |
| SEC-03 | Phase 1 — Security & Cleanup | `.gitignore` tracciato e completo |
| SEC-04 | Phase 1 — Security & Cleanup | `git rm -r --cached node_modules` |
| SEC-05 | Phase 1 — Security & Cleanup | `git rm --cached .env.local` |
| SEC-06 | Phase 1 — Security & Cleanup | Decisione esplicita rewrite history vs accept risk |
| CLEAN-01 | Phase 1 — Security & Cleanup | DDL + RLS per `read_books`, `book_suggestions`, `watched_movies.status` |
| CLEAN-02 | Phase 1 — Security & Cleanup | Commit dei file untracked (books feature, favicon, ANALISI_PROGETTO) |
| CLEAN-03 | Phase 1 — Security & Cleanup | Clone pulito buildabile end-to-end |
| RIST-01 | Phase 2 — Verticale Ristoranti | `src/lib/foursquare.js` (search / getPlace / getTrending) |
| RIST-02 | Phase 2 — Verticale Ristoranti | Tabella `visited_restaurants` + RLS |
| RIST-03 | Phase 2 — Verticale Ristoranti | Tabella `restaurant_suggestions` + RLS |
| RIST-04 | Phase 2 — Verticale Ristoranti | `RistorantiPage.jsx` con 3 tab |
| RIST-05 | Phase 2 — Verticale Ristoranti | `RestaurantModal.jsx` con tutte le azioni utente |
| RIST-06 | Phase 2 — Verticale Ristoranti | AI suggerimenti ristoranti (Gemini + Groq fallback) |
| RIST-07 | Phase 2 — Verticale Ristoranti | `NotificationsPage` + badge unread estesi |
| RIST-08 | Phase 2 — Verticale Ristoranti | Voce sidebar + route `/ristoranti` |
| RIST-09 | Phase 2 — Verticale Ristoranti | `.env.example` + `.env.local` con `VITE_FOURSQUARE_API_KEY` |
| QUAL-01 | Phase 3 — Quality Baseline | React error boundary attorno ad `AppShell` |
| QUAL-02 | Phase 3 — Quality Baseline | `res.ok` + error surfacing nei tre lib esterni |

**Coverage:** 20 / 20 Active REQ-ID mappati — nessun orfano, nessun duplicato.
