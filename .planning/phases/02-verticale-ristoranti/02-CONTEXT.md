# Phase 2: Verticale Ristoranti - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Terza verticale "Ristoranti" paritaria a Cinema e Libri: ricerca tramite un provider di places (Foursquare attivo, layer astratto pronto per Google in futuro), tracking personale (visited/wishlist, rating mezzi voti, favorite, note, etichette), invio consigli ad amici con commento, suggerimenti AI (Gemini + Groq fallback, prerequisito 3 visited), integrazione in sidebar / route `/ristoranti` / `NotificationsPage` / badge unread.

**Non fa parte di questa fase:**
- Error boundary app-shell + toast errori lib (Phase 3 — QUAL-01/02)
- Implementazione concreta del provider Google Places (solo stub in v1 — deferred)
- Tabella `user_labels` dedicata per autocomplete etichette (semplice scansione client-side in v1 — deferred)
- Geolocalizzazione browser per derivare città (niente GPS prompt in v1 — deferred)

</domain>

<decisions>
## Implementation Decisions

### D-01 — Provider layer

**Creare `src/lib/placesProvider.js` come layer di astrazione + `src/lib/foursquare.js` come unica implementazione concreta attiva in v1.**

- Config via env: `VITE_PLACES_PROVIDER=foursquare` (default). Valori futuri: `google`.
- `placesProvider.js` espone l'interfaccia unica: `search(query, city)`, `getPlace(id)`, `getPopular(city, category)`, `coverUrl(photo)`. Al suo interno fa dispatch sul provider attivo.
- Modello dati normalizzato restituito dal provider: `{ id, name, address, city, cuisine, priceLevel (1-4), rating (0-10), cover, mapsUrl }`. I componenti consumano SOLO questa forma.
- `src/lib/foursquare.js` = namespace const-object (pattern `tmdb.js` / `googlebooks.js`) che implementa l'interfaccia chiamando Foursquare Places API v3.
- Niente `google.js` concreto in v1 — il layer è predisposto ma il ramo google del dispatcher lancia un errore chiaro "provider non implementato". Aggiungere Google sarà un deferred/v2.
- **Impatto documenti:** aggiornare PROJECT.md Key Decision ("Foursquare Places" → "Layer astratto, Foursquare attivo, Google predisposto") + aggiornare RIST-01 in REQUIREMENTS.md (src/lib/foursquare.js → src/lib/placesProvider.js + src/lib/foursquare.js).

### D-02 — Nuovo REQ-ID: RIST-10 città preferite

**Aggiungere RIST-10 in REQUIREMENTS.md + traceability + ROADMAP.md.**

Testo proposto:
> **RIST-10** L'utente può gestire una lista illimitata di città preferite (aggiungi inline con input + tasto +, rimuovi con ×), riutilizzate come filtro in "I miei ristoranti" e come selettore in "Scopri".

Richiede la tabella `user_cities` (DDL fornito dal req) con RLS per-utente.

### D-03 — Prerequisito "Consigli AI"

**Empty state + CTA sotto i 3 ristoranti visitati.**

- Il tab "Consigli AI" è sempre cliccabile.
- Con `< 3` visited: contenuto = empty-state ("Aggiungi almeno 3 ristoranti visitati per ricevere consigli AI") + bottone CTA che porta alla tab "I miei ristoranti" (dove può cercare/aggiungere).
- Con `>= 3` visited: chiamata AI standard (Gemini primario + Groq fallback) — `ai.getPersonalizedRestaurantSuggestions(userId)` legge visited e costruisce il prompt.

### D-04 — Etichette custom

**Custom labels vivono solo nell'array `visited_restaurants.labels[]` del singolo ristorante. Niente tabella dedicata in v1.**

- Set fisso (hard-coded nel componente): 🍹 Aperitivo, 🍽️ Cena, ☀️ Pranzo, 💑 Romantico, 👥 Amici, 👨‍👩‍👧 Famiglia, 💼 Lavoro, ⭐ Speciale
- Input inline nel modal per aggiungere custom label; la custom viene appesa a `labels[]` del ristorante corrente.
- Per suggerimento/autocomplete: al mount del modal il componente può fare una scansione client-side di tutti i `visited_restaurants` dell'utente e derivare la lista delle custom label già usate. Semplice, nessuna nuova tabella.
- Label disponibili solo per ristoranti già in libreria (visited o wishlist) — coerente con la spec utente.
- **Deferred:** tabella `user_labels` con usage_count per autocomplete strutturato (v2).

### D-05 — Filtro etichette: multi-select OR

**In "I miei ristoranti", il filtro per etichette è multi-select con semantica OR.**

Un ristorante matcha se ha **almeno una** delle etichette selezionate (unione). Combinato con città (single-select) e status (single-select tra Visitati/Wishlist) come filtri cumulativi AND tra assi.

### D-06 — Voce "Altro" nel selettore città

**"Altro" mostra i ristoranti di città NON presenti in `user_cities`.**

Utile per tracciare esperienze di viaggio singolo che non meritano una città permanente nella lista preferiti. Quando l'utente clicca "Altro", il filtro in "I miei ristoranti" diventa `restaurant_city NOT IN (user_cities)`.

### D-07 — Search: città dal selettore corrente

**La search (tab "I miei ristoranti" in aggiunta, tab "Scopri") usa sempre la città attualmente selezionata nel selettore orizzontale del tab.**

- Se nessuna città è selezionata (lista vuota o selezione vuota) → search bar disabilitata con tooltip "Seleziona prima una città".
- Search chiama `placesProvider.search(query, selectedCity)`.
- Semplice, zero ambiguità, niente input città duplicato.

### D-08 — Rating: mezzi voti (pattern libri)

**Schema `visited_restaurants.rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5)`** — allineato al pattern di `read_books` (LIB-04), non al pattern di `watched_movies` (CIN-03, integer 1-5).

Riusa il componente `StarRating` di `BookModal.jsx` (che supporta mezzi voti).

### D-09 — Google Maps URL diretto (no API key)

**Il bottone "Apri in Google Maps" nel `RestaurantModal` genera URL diretto:**
```
https://maps.google.com/?q={encodeURIComponent(name + ' ' + address)}
```
Zero API key, zero SDK. Apre Google Maps nel browser/app. Esposto tramite `normalizedPlace.mapsUrl` dal provider.

### D-10 — Scope conferme dal req

Sono decisioni del req.txt (non controverse) che registro qui per completezza:
- Tabs: "I miei ristoranti" / "Scopri" / "Consigli AI" (TABS array identico a Cinema/Libri).
- Schema DDL: `user_cities`, `visited_restaurants`, `restaurant_suggestions` (copiato dal req, full RLS owner-only).
- Card griglia: foto + nome + cucina + fascia prezzo (€/€€/€€€/€€€€) + pill etichette (max 3 + "+N") + nota troncata a 40 caratteri.
- Tab "Scopri" filtro occasione/cucina: Aperitivo, Cena, Romantico, Pizza, Italiano, Giapponese, Cinese, Hamburger.
- AI output JSON: `[{name, city, cuisine, reason, stars}]`; click → `placesProvider.search(name, city)` → modal.
- RestaurantModal: simili collassabile, suggerisci-a-amico identico a BookModal, note textarea con save on blur (solo se in libreria), labels toggle chip (solo se in libreria).
- Empty state tab Scopri con 0 città: CTA "aggiungi città".

### Claude's Discretion

- Ordinamento default delle card in "I miei ristoranti": per `created_at DESC` (ultimo aggiunto in testa). Utente non ha specificato — coerente con pattern watched_movies.
- Ordine delle 8 etichette fisse: quello fornito dal req (Aperitivo, Cena, Pranzo, Romantico, Amici, Famiglia, Lavoro, Speciale).
- Layout del selettore città: orizzontale scrollabile con CSS `overflow-x: auto` + chip styling esistente (`.btn btn-sm` o nuovo `.city-chip` in main.css se necessario). Preferenza per riuso classi esistenti.
- Fascia prezzo "€/€€/€€€/€€€€": mapping semplice da `priceLevel 1-4` → string di simboli.
- Foto hero del modal: prima foto disponibile dal provider; se assente, placeholder grigio con icona `lucide-react` (`Utensils` o `MapPin`).

### Folded Todos

Nessun todo pendente in STATE.md al momento di questa discussione.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source requirements (locked)
- `.planning/phases/02-verticale-ristoranti/02-USER-REQ.md` — **Requirement specifico dell'owner (req.txt copiato qui per preservarlo).** Schema DDL esatto, struttura 3 tab, spec modal, set etichette fisso, tema colore (#e8b84b oro), classi CSS da riusare.
- `.planning/REQUIREMENTS.md` — REQ-ID RIST-01..09 (da estendere con RIST-10 per `user_cities`).
- `.planning/ROADMAP.md` §Phase 2 — goal + success criteria + REQ coverage.
- `.planning/PROJECT.md` §Key Decisions — voce Foursquare Places da aggiornare a "layer astratto + Foursquare attivo".

### Codebase patterns to mirror (verticals già esistenti)
- `src/lib/tmdb.js` — pattern namespace const-object per provider REST (da riusare come scheletro per `foursquare.js`).
- `src/lib/googlebooks.js` — pattern `formatBook` normalizer (da specchiare come `formatPlace` dentro foursquare.js).
- `src/lib/gemini.js` — pattern `askGemini` + `askGroq` fallback, `parseJSON` helper. Aggiungere qui `ai.getSimilarRestaurants` e `ai.getPersonalizedRestaurantSuggestions`.
- `src/lib/db.js` — namespace `db` per Supabase CRUD. Aggiungere metodi `getVisitedRestaurants`, `addVisitedRestaurant`, `addToRestaurantWishlist`, `updateRestaurantRating`, `toggleRestaurantFavorite`, `updateRestaurantNotes`, `updateRestaurantLabels`, `removeRestaurant`, `sendRestaurantSuggestion`, `getRestaurantSuggestions`, `markRestaurantSuggestionRead`, `getUserCities`, `addUserCity`, `removeUserCity`.
- `src/components/books/BooksPage.jsx` — scheletro 3-tab più recente, da usare come riferimento per `RistorantiPage.jsx` (più simile a libri che a film per il rating mezzi-voti).
- `src/components/books/BookModal.jsx` — componente `StarRating` mezzi voti (riuso diretto o estrazione in shared).
- `src/components/cinema/NotificationsPage.jsx` — feed unificato da estendere per includere `restaurant_suggestions`.
- `src/components/layout/Sidebar.jsx` — `navItems` array + badge unread; aggiungere voce "Ristoranti" con icona `Utensils` o `UtensilsCrossed` da `lucide-react`.
- `src/App.jsx` — route `/ristoranti` + `AppShell` unread polling da aggiornare per sommare `restaurant_suggestions`.

### Schema SQL
- `supabase_schema.sql` — contiene DDL + RLS per cinema side. Phase 1 / CLEAN-01 risolverà il drift libri; Phase 2 aggiunge DDL per 3 nuove tabelle: `user_cities`, `visited_restaurants`, `restaurant_suggestions` (DDL completo nel 02-USER-REQ.md).

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — stile JSX, naming, 2-space indent, no semicolons, single quotes, `.js`/`.jsx` nei import.
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code" — dove piazzare provider, componenti, route, nav, CSS.
- `.planning/codebase/CONCERNS.md` — schema drift conosciuto (non aggiungerne); `src/lib/foursquare.js` e RestaurantPage devono partire dal primo commit nello schema canonico.

### Env
- `.env.example` da aggiornare: nuova voce `VITE_PLACES_PROVIDER=foursquare` + `VITE_FOURSQUARE_API_KEY=`.
- RIST-09 va esteso per coprire il dual-env (provider toggle + provider-specific key).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/books/BookModal.jsx` — componente interno `StarRating` per rating mezzi-voti; candidato all'estrazione in `src/components/shared/StarRating.jsx` durante Phase 2 per evitare import cross-verticale da `books/` a `ristoranti/`. Se l'estrazione è troppo scope, import diretto `from '../books/BookModal.jsx'` è tollerabile (pattern già rotto altrove: `NotificationsPage.jsx` è in `cinema/` ma è cross-verticale).
- `src/lib/gemini.js#askGemini`, `#askGroq`, `#parseJSON` — helper pronti per nuovi metodi AI ristoranti. Seguire idiom `Promise.allSettled` + `try/catch` silenzioso come in `getSimilarMovies`.
- `src/components/shared/Toast.jsx#useToast` — feedback azioni utente (aggiungere, rimuovere, inviare).
- `.city-chip` / `.badge` / `.pill` etichette — **non esistono in main.css**: vanno create come classi nuove seguendo naming hyphenated-kebab (es. `.city-chip`, `.label-pill`). Evitare Tailwind/inline-styling pesante per elementi riutilizzabili.

### Established Patterns
- **Return shapes inconsistenti di `db.js`** — replicare lo stesso inconsistent shape (reads `→ data || []`, writes `→ { data, error }`) per coerenza con callers. Non correggere in questa fase; è fuori scope (gap documentato in CONCERNS.md).
- **No `useMemo`/`useReducer`** — filtri cumulativi città×status×etichette vanno computati inline in render, come `byStatus`/`displayed` in `CinemaPage.jsx:81-88`.
- **Polling unread 60s** — `src/App.jsx#AppShell` va esteso per chiamare anche `db.getRestaurantSuggestions(user.id, { unreadOnly: true })` o equivalente e sommare al badge esistente.
- **TABS array come single source of truth** — `const TABS = ['I miei ristoranti', 'Scopri', 'Consigli AI']` all'inizio di `RistorantiPage.jsx` (come `CinemaPage.jsx:10` e `BooksPage.jsx:10`).

### Integration Points
- `src/App.jsx` — nuovi import `RistorantiPage`, nuova `<Route path='/ristoranti' element={...} />` dentro `AppShell`.
- `src/components/layout/Sidebar.jsx` — aggiungere entry in `navItems` con icona `lucide-react` (`Utensils` o `UtensilsCrossed`), label "Ristoranti", path "/ristoranti".
- `src/components/cinema/NotificationsPage.jsx` — il `Promise.all` di loading va esteso per caricare anche `db.getRestaurantSuggestions`; il sorting `created_at DESC` copre già il merge cronologico di 3 flussi.
- `.env.local` e `.env.example` — nuove variabili `VITE_PLACES_PROVIDER` + `VITE_FOURSQUARE_API_KEY`. **Dipendenza forte da Phase 1 completata**: fino a SEC-05 (`.env.local` untracked), NON committare `.env.local` mai, nemmeno con nuova variabile.
- `supabase_schema.sql` — nuovo blocco DDL per le 3 tabelle + RLS, inserito dopo il blocco books (che sarà sanato in Phase 1 / CLEAN-01).

### Constraints (non toccare)
- No TypeScript, no framework CSS, no global store, no test framework — tutti gap noti e fuori scope v1.
- No nuove dipendenze npm senza necessità — tutto con fetch nativo.
- User copy in italiano; identificatori in inglese.

</code_context>

<specifics>
## Specific Ideas

### Tema e classi CSS (dal req)
- Tema scuro, accent oro **#e8b84b** — è già quello corrente di `main.css` (`--accent`); verificare e riusare senza override.
- Classi da riusare: `.movie-card`, `.movies-grid`, `.ai-card`, `.btn`, `.modal`, `.suggestion-card`, `.tabs`, `.tab`, `.section`, `.empty-state`, `.search-bar`, `.loader`.
- Nuove classi (probabilmente da creare in `main.css`): `.city-chip`, `.city-chip-add`, `.label-pill`, `.label-pill-selected`, `.price-level` (se non esistono già con altri nomi).

### Icone sidebar e UI
- Voce sidebar: `Utensils` o `UtensilsCrossed` da `lucide-react`.
- Azioni modal: `Plus` (aggiungi), `Bookmark` (wishlist), `Heart` (favorite), `Star` (rating), `Send` (suggerisci), `MapPin` (apri Maps), `Sparkles` (AI similar), `Tag` (etichette).

### Set etichette (hard-coded, con emoji)
```
['🍹 Aperitivo', '🍽️ Cena', '☀️ Pranzo', '💑 Romantico', '👥 Amici', '👨‍👩‍👧 Famiglia', '💼 Lavoro', '⭐ Speciale']
```
Archiviate in `visited_restaurants.labels[]` come stringhe complete incluso emoji (non come chiave separata). Le custom seguono lo stesso formato libero.

### Fascia prezzo
Mapping `priceLevel` intero → simboli: `1 → '€'`, `2 → '€€'`, `3 → '€€€'`, `4 → '€€€€'`, `null → '—'`.

### Normalizzazione Foursquare → modello
Foursquare v3 `/places/search` restituisce `fsq_id`, `name`, `location.address`, `location.locality`, `categories[].name`, `price` (intero 1-4), `rating` (0-10 scala Foursquare). Il normalizer `formatPlace` (da mettere in `src/lib/foursquare.js`) mappa → `{ id: fsq_id, name, address: location.address, city: location.locality, cuisine: categories[0]?.name, priceLevel: price, rating, cover: photos[0] ? coverUrl(photos[0]) : null, mapsUrl: ... }`.

</specifics>

<deferred>
## Deferred Ideas

### Per v2 / milestone futuri
- **Provider Google Places implementato e funzionante.** In v1 solo dispatch-ready. L'implementazione concreta richiede chiave Google + gestione fatturazione + testing = troppo per Phase 2.
- **Tabella `user_labels`** con `usage_count` per autocomplete etichette strutturato. In v1 basta la scansione client-side dei visited_restaurants.
- **Geolocalizzazione browser + reverse geocoding** per pre-fillare la città. Evita il permesso GPS intrusivo; la selezione manuale delle città preferite copre il caso d'uso principale.
- **Statistiche aggregate per label / cucina / città** (quante volte "Romantico", città più frequentata, cucina preferita). Utile ma non richiesto.
- **Import/export della lista `user_cities`** tra utenti.
- **Share pubblico di una città con la tua lista locale di ristoranti** (es. "i miei posti a Roma" come link).

### Reviewed Todos (not folded)
Nessun todo review da STATE.md in questa sessione.

</deferred>

---

*Phase: 02-verticale-ristoranti*
*Context gathered: 2026-04-22*
