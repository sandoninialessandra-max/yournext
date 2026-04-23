# Roadmap: YourNext v1

## Overview

Il repo YourNext parte da uno stato "prototipo deployato, ma lavoro non committato + secrets in chiaro in git". La v1 chiude il gap in tre fasi: prima si bonifica il repo e si allinea lo schema DB (condizione bloccante per toccare qualsiasi altra cosa), poi si costruisce la terza verticale (Ristoranti su Foursquare) per completare il pattern film/libri/ristoranti, e infine si alza la soglia minima di robustezza con error boundary e gestione errori nei lib. Granularità **coarse**, 3 fasi, 1-3 plan ciascuna.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security & Cleanup** - Bonifica secrets, gitignore, schema drift, working tree untracked
- [ ] **Phase 2: Verticale Ristoranti** - Terza verticale completa su Foursquare Places (lib, DB, UI, AI, notifiche)
- [ ] **Phase 3: Quality Baseline** - Error boundary a livello app-shell + error surfacing nei lib esterni

## Phase Details

### Phase 1: Security & Cleanup
**Goal**: Il repo è safe da clonare e da pubblicare: nessuna chiave valida leakata, `.gitignore` effettivo, `supabase_schema.sql` allineato al DB di produzione, working tree coerente.
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. Tutte le chiavi che comparivano in `primo commit` (Supabase anon JWT, Google OAuth Client Secret, TMDB, Gemini, Groq) sono ruotate e quelle vecchie non autenticano più contro i rispettivi servizi.
  2. `SETUP.md` contiene solo placeholder e un warning esplicito "non committare chiavi vere"; `.env.local` e `node_modules/` non sono più tracciati; `.gitignore` è tracciato e copre `.env*`, `node_modules/`, `dist/`, `.vercel/`, `.DS_Store`, `*.log`.
  3. Esiste una decisione documentata (in PROJECT.md Key Decisions o in un commento dedicato) su rewrite della git history vs accettazione del rischio; se la decisione è "rewrite", l'operazione è stata eseguita e verificata.
  4. `supabase_schema.sql` contiene DDL + RLS per `read_books`, `book_suggestions` e la colonna `watched_movies.status`, ed eseguendolo su un DB vuoto si ottiene lo stesso schema del DB di produzione.
  5. Un clone pulito su una macchina senza `.env.local` (ma con le env vars popolate) esegue `npm install && npm run dev` senza errori di import o build, e il routing `/cinema` e `/books` carica senza runtime error.
**Plans**: 1 plan
Plans:
- [ ] 01-01-PLAN.md — Security cleanup + schema drift reconcile + commit untracked + defer SEC-01/SEC-06 to v2 (9 commits + 1 manual DDL push + clean-clone verify)

### Phase 2: Verticale Ristoranti
**Goal**: L'utente ha una terza verticale "Ristoranti" funzionalmente paritaria a Cinema e Libri: ricerca Foursquare, tracking personale, consigli AI, invio a un amico con commento, integrazione in sidebar e notifiche.
**Depends on**: Phase 1
**Requirements**: RIST-01, RIST-02, RIST-03, RIST-04, RIST-05, RIST-06, RIST-07, RIST-08, RIST-09
**Success Criteria** (what must be TRUE):
  1. L'utente può navigare a `/ristoranti` dalla sidebar, cercare un ristorante via Foursquare e vedere risultati con foto, fascia prezzo, indirizzo, categoria e rating.
  2. L'utente può marcare un ristorante come visited o wishlist, dare rating 1-5, marcarlo favorite, e la persistenza è garantita da RLS per-utente su `visited_restaurants`.
  3. L'utente può aprire un ristorante e inviarlo a un amico con commento libero; l'amico lo riceve in `/notifications` nello stesso feed unificato (film + libri + ristoranti) ordinato per `created_at` con auto-mark-as-read.
  4. Il badge unread in sidebar somma anche i `restaurant_suggestions` non letti e si aggiorna con lo stesso polling a 60 secondi.
  5. L'utente può generare suggerimenti AI "ristoranti simili" e "ristoranti personalizzati" basati sui ristoranti visited, con fallback Gemini → Groq coerente con `src/lib/gemini.js`.
  6. `.env.example` documenta `VITE_FOURSQUARE_API_KEY` e l'app fallisce in modo visibile (non silenziosa) se la chiave manca.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Quality Baseline
**Goal**: L'app non mostra più pagine bianche su render error e non lascia più l'utente su spinner infiniti quando le API esterne falliscono.
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Un render-time exception in una qualsiasi pagina o modal (es. forzando un throw in `MovieModal`, `BookModal`, `RestaurantModal`) mostra un fallback UI leggibile in italiano con opzione di ricarica, invece della pagina bianca attuale.
  2. Simulando una risposta 500 da TMDB, Google Books o Foursquare, l'utente vede un toast di errore entro ~3 secondi invece di uno spinner infinito o una lista vuota senza spiegazione.
  3. Ogni lib esterno (`src/lib/tmdb.js`, `src/lib/googlebooks.js`, `src/lib/foursquare.js`) fa `res.ok` check e propaga un errore tipizzato che il chiamante sa trasformare in toast.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Cleanup | 0/1 | Not started | - |
| 2. Verticale Ristoranti | 0/TBD | Not started | - |
| 3. Quality Baseline | 0/TBD | Not started | - |
