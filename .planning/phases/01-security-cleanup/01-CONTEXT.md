# Phase 1: Security & Cleanup - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Bonifica minima del repo per renderlo safe da clonare e da pubblicare, **senza ruotare chiavi e senza riscrivere la git history**. Focus: `.gitignore` tracciato e completo, `node_modules/` e `.env.local` rimossi dall'indice, `SETUP.md` scrubato a soli placeholder + warning, schema drift di Libri sanato in `supabase_schema.sql` con blocco idempotente, file attualmente untracked committati in 3 commit separati, verifica finale che un clone pulito builda end-to-end.

**Scope ridotto vs REQUIREMENTS.md originale:** SEC-01 (rotazione chiavi) e SEC-06 (history rewrite) sono stati spostati a v2/Out of Scope (accept risk) — vedi D-01 e D-02. La Phase 1 rimane con 7 REQ attivi: SEC-02, SEC-03, SEC-04, SEC-05, CLEAN-01, CLEAN-02, CLEAN-03.

**Non fa parte di questa fase:**
- **Rotazione delle chiavi** (Supabase anon JWT, Google OAuth Client Secret, TMDB, Gemini, Groq) — deferred a v2 con motivazione "accept risk" (D-01).
- **Rewrite della git history** (BFG / git-filter-repo) — deferred a v2, pairing con D-01 (D-02).
- **Migrazione a Supabase CLI migrations** (`supabase/migrations/*.sql`) — fuori scope, il pattern `supabase_schema.sql` idempotente resta.
- **Review manuale del contenuto di `ANALISI_PROGETTO.md`** prima del commit — se al commit troviamo dati sensibili (chiavi, email non pubbliche, screenshot), si scruba ad-hoc; altrimenti commit as-is.
- **Refactor del codice books** per allinearlo alle convenzioni — si committa così com'è, eventuali fix stilistici in una fase successiva.

</domain>

<decisions>
## Implementation Decisions

### D-01 — SEC-01 (rotazione chiavi) → v2 / accept risk

**Spostare SEC-01 da "Active v1" a "v2 / Out of Scope" con motivazione esplicita "accept risk".**

Motivazione (da registrare in `PROJECT.md` §Key Decisions e `REQUIREMENTS.md` §v2 / Out of Scope):
- L'app è invite-only per 5-10 amici stretti; il repo è personale e non pubblico.
- Blast radius basso: un eventuale leak di Supabase anon JWT consente a un attaccante di leggere/scrivere solo dati governati dalle RLS policy (quindi solo dati propri, non altrui). Google OAuth Client Secret è usato solo nel redirect flow via Supabase — non concede accesso a dati Google. TMDB/Gemini/Groq hanno quote free-tier e zero accesso a dati utente.
- La rotazione sarà eseguita **prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo privato attuale** — questo trigger va documentato come pre-condizione nel PROJECT.md v2 plan.
- La Phase 1 si concentra su pulizia tracking + schema + working tree, che sono azioni sicure e incrementalmente utili a prescindere.

**Impatto documenti (eseguito in Phase 1 planning/execute):**
- `REQUIREMENTS.md` § v1 Active: rimuovere la riga SEC-01.
- `REQUIREMENTS.md` § v2 / Out of Scope: aggiungere riga "Rotazione chiavi leakate (Supabase / Google OAuth / TMDB / Gemini / Groq)" con motivazione sopra.
- `REQUIREMENTS.md` § Traceability matrix: rimuovere la riga SEC-01 (o marcarla "v2 deferred").
- `ROADMAP.md` § Phase 1 Requirements: rimuovere `SEC-01`.
- `ROADMAP.md` § Phase 1 Success Criteria: rimuovere il criterion 1 (rotazione chiavi) o riformularlo in "La decisione di accept risk è documentata in PROJECT.md §Key Decisions".
- `PROJECT.md` § Key Decisions: aggiungere riga con data "2026-04-23", decisione, motivazione e trigger di riapertura.

### D-02 — SEC-06 (history rewrite) → v2 / accept risk

**Spostare anche SEC-06 da "Active v1" a "v2 / Out of Scope" con pairing esplicito su D-01.**

Motivazione:
- La rewrite della history (BFG / git-filter-repo) serve a rimuovere le chiavi leakate dai commit passati. Se le chiavi **non vengono ruotate** (D-01), la rewrite è una mitigazione puramente cosmetica: le chiavi restano valide, chiunque abbia un clone precedente le ha ancora, e la history force-pushata può desincronizzare il deploy Vercel e/o collaboratori esterni.
- Pair logico con D-01: entrambi si riaprono **prima di condividere pubblicamente il repo**.

**Impatto documenti (eseguito in Phase 1 planning/execute):**
- Stesse patch di D-01: rimozione da v1, aggiunta a v2 con motivazione "pairing con SEC-01, rewrite utile solo in combinazione con rotazione".
- `ROADMAP.md` § Phase 1 Requirements: rimuovere `SEC-06`.
- `ROADMAP.md` § Phase 1 Success Criteria: rimuovere il criterion 3 (decisione rewrite) o riformularlo in "SEC-06 è stato spostato a v2 insieme a SEC-01; decisione documentata in PROJECT.md §Key Decisions".

### D-03 — CLEAN-01 schema drift = append di un blocco idempotente

**Aggiungere in coda a `supabase_schema.sql` un blocco delimitato `-- ── LIBRI (CLEAN-01) ──` che contiene:**

```sql
-- ── LIBRI (CLEAN-01) ──────────────────────────────────────────
ALTER TABLE watched_movies
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'watched'
  CHECK (status IN ('watched', 'wishlist'));

CREATE TABLE IF NOT EXISTS read_books (
  ... (DDL completo dal dump reale del DB prod o dal componente BooksPage per inferenza)
);

CREATE TABLE IF NOT EXISTS book_suggestions (
  ...
);

-- RLS owner-only per read_books (pattern watched_movies)
ALTER TABLE read_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_books_select_own ON read_books FOR SELECT USING (auth.uid() = user_id);
... (INSERT / UPDATE / DELETE analoghi)

-- RLS per book_suggestions (pattern movie_suggestions)
ALTER TABLE book_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS book_suggestions_select ON book_suggestions FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
... (INSERT / UPDATE analoghi)
```

**Rule:** Tutti gli statements usano `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` → applicare il file su un DB già in stato-produzione è no-op; applicarlo su un DB vuoto crea tutto (e soddisfa CLEAN-03 clone pulito).

**DDL source of truth per il blocco LIBRI:** derivare dal codice esistente in `src/lib/db.js` (metodi `getReadBooks`, `addReadBook`, `sendBookSuggestion` — leggono/scrivono campi specifici), `src/components/books/BookModal.jsx` (campi usati nel modal rating/progresso). Se esiste accesso al DB prod, preferire `pg_dump --schema-only --table=read_books --table=book_suggestions` per avere la verità esatta; altrimenti inferenza dal codice è accettabile per CLEAN-01 (verifica CLEAN-03 la copre).

**Anti-pattern esplicito:** NON riscrivere l'intero `supabase_schema.sql` da zero — rischio di introdurre drift opposto rispetto al prod (colonne aggiunte in prod ma non note al codice). Preserve-and-append è più safe.

### D-04 — CLEAN-02 commit untracked = 3 commit separati

**I file attualmente untracked vengono committati in 3 commit distinti, nell'ordine:**

1. `feat(books): add books vertical (BooksPage, BookModal, googlebooks lib)`
   - `src/components/books/BooksPage.jsx`
   - `src/components/books/BookModal.jsx`
   - Qualunque altro file in `src/components/books/` non tracciato
   - `src/lib/googlebooks.js`

2. `chore: add app favicon`
   - `favicon.svg`

3. `docs: add initial project analysis`
   - `ANALISI_PROGETTO.md`

**Stage esplicito per-commit:** mai `git add .` / `git add -A` (CLAUDE.md rule — `.env.local` è ancora tracciato come mod fino a SEC-05 eseguito, un add generico potrebbe includere drift di config). Usare sempre la lista esatta dei file.

**Review prima del commit di ANALISI_PROGETTO.md:** il planner/executor deve aprire il file e confermare che non contiene chiavi API, screenshot con dati personali, o URL interni sensibili. Se lo contiene, scrubbing ad-hoc prima del commit.

### D-05 — Ordine di esecuzione (Claude's Discretion)

**Ordine suggerito dei task nel plan di Phase 1 (ottimizzato per sicurezza e reversibilità):**

1. **`.gitignore`** — Creare/aggiornare il file (attualmente 2 righe: `.env.local`, `node_modules`) includendo tutti i pattern richiesti da SEC-03: `.env`, `.env*.local`, `node_modules/`, `.vercel/`, `dist/`, `.DS_Store`, `*.log`. Commit: `chore: track comprehensive .gitignore`. **Prima di tutto** così i passi successivi non reintroducono file ignorati.
2. **`git rm -r --cached node_modules`** — Unstage `node_modules/` senza cancellarlo su disco. Commit: `chore: stop tracking node_modules`. (SEC-04)
3. **`git rm --cached .env.local`** — Unstage `.env.local`. **Verifica manuale preliminare**: assicurarsi che il contenuto su disco sia backup-ato (idealmente in un password manager) prima di rimuoverlo dall'indice, visto che D-01 mantiene le stesse chiavi in uso. Commit: `chore: stop tracking .env.local`. (SEC-05)
4. **`SETUP.md` scrub** — Sostituire qualunque valore reale con placeholder (`YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY`, `YOUR_GOOGLE_OAUTH_CLIENT_ID`, `YOUR_TMDB_KEY`, `YOUR_GEMINI_KEY`, `YOUR_GROQ_KEY`) + aggiungere warning banner in testa: `> ⚠️ Mai committare chiavi reali. Usa `.env.local` (già gitignored).`. Commit: `docs: scrub SETUP.md to placeholders only`. (SEC-02)
5. **`supabase_schema.sql` schema drift append** — Aggiungere il blocco `-- ── LIBRI (CLEAN-01) ──` di D-03. Commit: `fix(schema): append LIBRI DDL + RLS to align with prod (CLEAN-01)`. (CLEAN-01)
6. **CLEAN-02 3 commit** — books feature, favicon, ANALISI in quest'ordine (D-04).
7. **CLEAN-03 verifica clone** — eseguire in una directory temporanea:
   ```
   git clone <this-repo> /tmp/yournext-clone-test
   cd /tmp/yournext-clone-test
   cp /path/to/real/.env.local .env.local  # owner copy il file esistente (NON dal backup in git history)
   npm install
   npm run build
   npm run dev -- --port 5174 &
   # verify no errors on stdout + routes /cinema e /books rispondono 200
   ```
   Nessun commit per questo step (è solo verifica); annotare esito in `01-01-SUMMARY.md`. (CLEAN-03)
8. **Doc patches per D-01 e D-02** — REQUIREMENTS.md, ROADMAP.md, PROJECT.md come descritto nelle sezioni D-01 e D-02. Commit: `docs: defer SEC-01 and SEC-06 to v2 with accept-risk rationale`.

**Critical ordering gotcha:** Task 3 (`.env.local` untrack) deve avvenire **dopo** Task 1 (`.gitignore` tracciato con `.env*.local` pattern) — se l'ordine è invertito, un successivo `git status` potrebbe non mostrare `.env.local` come modificato e una modifica locale rientrerebbe nel tracking.

### D-06 — `node_modules/` sul disco

**Non rimuovere `node_modules/` dal disco** — solo `git rm -r --cached`. Il dev continua a usare la sua installazione locale. Re-`npm install` non sarà richiesto. Questo è esplicito per evitare fraintendimenti: `git rm -r --cached <path>` preserva il filesystem, non fa `rm -rf`.

### D-07 — SETUP.md warning in italiano

**Il warning in testa a `SETUP.md` è scritto in italiano** (coerente con la policy "user copy in italiano" del progetto — anche la documentazione è user-facing per l'owner stesso e per futuri contributor in lingua italiana).

Formato: `> ⚠️ Mai committare chiavi reali. Usa `.env.local` (già gitignored). Se devi ruotare le chiavi: vedi `.planning/PROJECT.md` § Key Decisions per il piano v2.`

### D-08 — Vercel environment variables (verifica non bloccante)

**Non è richiesta una azione in Phase 1**, ma il planner annota come **todo manuale post-esecuzione per l'owner**: verificare che le env vars in Vercel (Production + Preview) corrispondano ancora al `.env.local` locale. Se il deploy Vercel fallisce dopo Phase 1, la causa più probabile è uno stale env var, non un problema del codice.

### Claude's Discretion

- **Formato messaggi commit:** conventional commits come già in uso nel progetto (vedi `git log` — `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`). Nessuna nuova convention.
- **`Co-Authored-By` tag:** presente sui commit generati da `/gsd-execute-phase` secondo pattern CLAUDE.md (già automatico nel flow GSD).
- **Branch strategy:** none (config.json `branching_strategy: "none"`) — tutti i commit di Phase 1 vanno direttamente su `main`. Accettabile data la scala: solo-dev, 5-10 utenti downstream.
- **Verifica CLEAN-03 in directory temporanea:** usare `$(mktemp -d)` o `/tmp/yournext-clone-test` (piattaforma — su Windows con bash, `$TEMP` è equivalente). Nessun side-effect permanente.

### Folded Todos

Nessun todo pendente in STATE.md al momento di questa discussione.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source requirements (locked)
- `.planning/REQUIREMENTS.md` — § v1 Active (prima di Phase 1 execute; sarà patchato come parte di Phase 1 stessa per riflettere D-01 e D-02), § v2 / Out of Scope (verrà esteso).
- `.planning/ROADMAP.md` § Phase 1 — goal + success criteria (sarà patchato come parte di Phase 1 execute per riflettere D-01/D-02).
- `.planning/PROJECT.md` § Key Decisions — verrà esteso con le righe D-01 e D-02 (accept risk con motivazione + trigger di riapertura).

### Codebase state da sanare
- `.gitignore` (root) — attualmente 2 righe (`.env.local`, `node_modules`) non tracciate o minimali; **expand secondo SEC-03**.
- `.env.local` — attualmente TRACCIATO in git (drift storico); contiene chiavi reali (non ruotate per D-01).
- `SETUP.md` — contiene (probabilmente) valori reali anziché placeholder; scrub completo richiesto.
- `supabase_schema.sql` — mancano DDL + RLS per `read_books`, `book_suggestions`, e la colonna `watched_movies.status` rispetto al DB prod.
- Untracked:
  - `src/components/books/` (BooksPage.jsx + BookModal.jsx)
  - `src/lib/googlebooks.js`
  - `favicon.svg`
  - `ANALISI_PROGETTO.md`

### Codebase maps
- `.planning/codebase/CONCERNS.md` — "SECURITY: `.env.local` tracciato con chiavi reali", "SCHEMA DRIFT: read_books/book_suggestions mancanti", "UNTRACKED: books feature, favicon, ANALISI". Confermano il diagnostic che motiva Phase 1.
- `.planning/codebase/STRUCTURE.md` — dove stanno i file da toccare.
- `.planning/codebase/CONVENTIONS.md` — commit message style, no-semicolons, 2-space indent.

### Template per SQL append
Pattern `movie_suggestions` già presente in `supabase_schema.sql` (RLS policy con `auth.uid() = from_user_id OR auth.uid() = to_user_id`) — da specchiare per `book_suggestions`.
Pattern `watched_movies` RLS (4 policy SELECT/INSERT/UPDATE/DELETE con `auth.uid() = user_id`) — da specchiare per `read_books`.

### Comandi di riferimento (per planner)
- `git rm -r --cached node_modules` — unstage senza rimuovere dal disco.
- `git rm --cached .env.local` — idem per file singolo.
- `npm run build` — smoke test post-cleanup.
- `npm run dev` — verifica runtime routes.
- `$(mktemp -d)` (Windows bash: `mktemp -d -t yournext-XXXX`) — temp dir per CLEAN-03.

</canonical_refs>

<specifics>
## Specific Ideas

### `.gitignore` completo (da SEC-03)
Pattern da includere (uno per riga, ordine logico):
```
# Env
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build output
dist/
build/

# Vercel
.vercel/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
```

### SETUP.md placeholders
Convenzione placeholder: `YOUR_<SERVICE>_<FIELD_TYPE>` in uppercase.
- `VITE_SUPABASE_URL=YOUR_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
- `VITE_TMDB_KEY=YOUR_TMDB_KEY`
- `VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY`
- `VITE_GROQ_API_KEY=YOUR_GROQ_API_KEY`
- Google OAuth client: configurato via Supabase Dashboard, non in `.env.local` → placeholder inline nel markdown dell'howto, non come env var.

### Commit message templates
- `chore: track comprehensive .gitignore (SEC-03)`
- `chore: stop tracking node_modules (SEC-04)`
- `chore: stop tracking .env.local (SEC-05)`
- `docs: scrub SETUP.md to placeholders only (SEC-02)`
- `fix(schema): append LIBRI DDL + RLS to align with prod (CLEAN-01)`
- `feat(books): add books vertical (BooksPage, BookModal, googlebooks lib) (CLEAN-02a)`
- `chore: add app favicon (CLEAN-02b)`
- `docs: add initial project analysis (CLEAN-02c)`
- `docs: defer SEC-01 and SEC-06 to v2 with accept-risk rationale`

### Criterio "clean clone build" per CLEAN-03
```
cd $(mktemp -d)
git clone <this-repo-url> .
# owner manualmente: copia .env.local dal source di verità (password manager o file esistente)
npm install     # deve completare senza errori
npm run build   # deve completare senza errori
# (optional) npm run dev e verifica /cinema e /books rispondono
```

</specifics>

<deferred>
## Deferred Ideas

### Per v2 / milestone futuri

- **SEC-01 Rotazione chiavi** (Supabase anon JWT, Google OAuth Client Secret, TMDB, Gemini, Groq) — deferred con accept-risk. Trigger di riapertura: **prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo privato attuale**.
- **SEC-06 Git history rewrite** (BFG / git-filter-repo) — deferred, pairing con SEC-01. Trigger di riapertura identico.
- **Migrazione a Supabase CLI migrations** (`supabase/migrations/*.sql` con `supabase db push`) — il pattern monolitico `supabase_schema.sql` manualmente applicato è sufficiente per la scala attuale. Considerare v2 se il team crescesse.
- **Serverless proxy per chiavi AI** (Gemini / Groq / TMDB) — già flagged in `.planning/codebase/CONCERNS.md` e `REQUIREMENTS.md` § v2 come "Proxy serverless per chiavi LLM". Phase 1 non lo tocca.
- **Scrub automatico + precommit hook per `.env*`** — evitare future re-tracciature di file con secrets. Utile ma richiede husky / lint-staged (nuova dipendenza) → fuori dalla policy "no new deps senza giustificazione" di CLAUDE.md.
- **Adozione ESLint + Prettier** — dovrebbe precedere qualunque grande refactor. Fuori scope Phase 1 (ref `.planning/codebase/CONVENTIONS.md` "Lint / Format Tooling — GAP").

### Reviewed Todos (not folded)

Nessun todo review da STATE.md in questa sessione.

</deferred>

---

*Phase: 01-security-cleanup*
*Context gathered: 2026-04-23*
