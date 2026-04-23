# Phase 1: Security & Cleanup - Pattern Map

**Mapped:** 2026-04-22
**Phase type:** security + cleanup (NOT feature-build)
**Files touched (planner reference):** 4 code/config modifications, 2 git-index removals, 5 untracked-to-commit, 3 doc patches
**Mirror-pattern sources:** `supabase_schema.sql` (existing `watched_movies` + `movie_suggestions` blocks) → templates for `read_books` + `book_suggestions`
**Analogs found:** 2/2 SQL mirror-patterns exact-match; all non-SQL targets are config/doc patches (no code analog needed)

---

## File Classification

| File | Role | Data Flow | Operation | Closest Analog | Match Quality |
|------|------|-----------|-----------|----------------|---------------|
| `.gitignore` | config (vcs) | build-time | MODIFY (expand 2 → ~22 lines) + stage (currently `??` untracked) | — | config-only (no code analog) |
| `supabase_schema.sql` | migration/DDL | batch | MODIFY (append `-- ── LIBRI ──` block) | existing `watched_movies` + `movie_suggestions` blocks in same file | exact mirror |
| `SETUP.md` | doc | — | MODIFY (scrub real values → placeholders + warning banner) | — | doc-only |
| `node_modules/` (tracked files) | vendor | — | REMOVE-FROM-INDEX (`git rm -r --cached`, disk preserved) | — | git op |
| `.env.local` | config (secrets) | runtime | REMOVE-FROM-INDEX (`git rm --cached`, disk preserved) | — | git op |
| `src/components/books/BooksPage.jsx` | component (page) | request-response | COMMIT as-is (no code changes) | already mirrors `src/components/cinema/CinemaPage.jsx` | exact |
| `src/components/books/BookModal.jsx` | component (modal) | request-response | COMMIT as-is | already mirrors `src/components/cinema/MovieModal.jsx` | exact |
| `src/lib/googlebooks.js` | service (REST client) | request-response | COMMIT as-is | already mirrors `src/lib/tmdb.js` namespace pattern | exact |
| `favicon.svg` | static asset | — | COMMIT as-is | — | asset |
| `ANALISI_PROGETTO.md` | doc | — | COMMIT as-is (after content review) | — | doc |
| `.planning/REQUIREMENTS.md` | doc | — | MODIFY (move SEC-01, SEC-06 to v2) | — | doc patch |
| `.planning/ROADMAP.md` | doc | — | MODIFY (§Phase 1 Requirements + Success Criteria) | — | doc patch |
| `.planning/PROJECT.md` | doc | — | MODIFY (append 2 rows to §Key Decisions) | — | doc patch |

### Files explicitly OUT OF SCOPE for this phase

| File | Reason |
|------|--------|
| `.claude/` (untracked) | Claude Code session metadata — not in D-04 commit list; stays untracked |
| `req.txt` (untracked) | Not mentioned anywhere in REQUIREMENTS/CONTEXT — stays untracked |
| 10 modified `src/**` files | Feature drift from pre-phase dev work — NOT touched by Phase 1 (would require separate phase) |

---

## Git State Snapshot (verified 2026-04-22)

### Current `.gitignore` (verbatim — 24 bytes, CRLF)
```
.env.local
node_modules
```
Status: `??` (UNTRACKED). The rule has never taken effect — that's why `.env.local` and `node_modules/` remained tracked.

### Currently tracked targets for removal (from `git ls-files`)
- `.env.local` — 1 file, ~697 bytes, contains real keys
- `node_modules/` — 10,770 files (confirmed in CONCERNS.md item #4)
- `SETUP.md` — tracked, contains real secrets (lines 25, 26, 42, 43, 52, 61)

### Currently untracked targets for commit (from `git status --porcelain`)
```
?? .gitignore                          ← will become tracked WITH new content (task 1)
?? ANALISI_PROGETTO.md                 ← CLEAN-02c
?? favicon.svg                         ← CLEAN-02b
?? src/components/books/BookModal.jsx  ← CLEAN-02a
?? src/components/books/BooksPage.jsx  ← CLEAN-02a
?? src/lib/googlebooks.js              ← CLEAN-02a
```

### Untracked, intentionally NOT committed in this phase
```
?? .claude/        ← session metadata (will be ignored via .claude/ pattern or gitignore update if desired, but not required by SEC-03)
?? req.txt         ← unknown content, not in scope
```

**Planner note:** `.claude/` is not in the current CONTEXT.md `.gitignore` patterns, so after the new `.gitignore` is committed it will still appear as untracked. Consider adding `.claude/` to the gitignore expansion as a pragmatic bonus (non-blocking decision for the planner — CONTEXT.md does not mandate it, but it's one line and removes noise from future `git status`).

---

## Pattern Assignments

### 1. `.gitignore` — expand from 2 lines to full Node/Vite coverage

**Operation:** Overwrite file contents + `git add .gitignore` + commit.

**Target file content** (verbatim from CONTEXT.md §Specific Ideas, to be written exactly as-is):

```gitignore
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

**Commit message (verbatim from CONTEXT.md §Specific Ideas):**
```
chore: track comprehensive .gitignore (SEC-03)
```

**Critical ordering:** Must be task #1. If `.env.local` is untracked (task 3) before `.gitignore` covers `.env.local` and `.env*.local`, a subsequent write to `.env.local` could re-appear in `git status` with the old naive rule.

**Files staged:** `git add .gitignore` (explicit file, never `git add .` per CLAUDE.md rule).

---

### 2. `node_modules/` — remove from index, preserve on disk

**Operation:** `git rm -r --cached node_modules` → commit. Filesystem contents remain; `npm install` is NOT required afterward.

**Verification before commit:**
- `git status` should show ~10,770 deletions staged (one per vendor file).
- `ls node_modules/` on disk should still list content (unchanged).
- `.gitignore` from task 1 must already be committed — otherwise the next `git status` will re-list them as untracked.

**Commit message (verbatim from CONTEXT.md):**
```
chore: stop tracking node_modules (SEC-04)
```

**Files staged:** only the deletion manifest from `git rm -r --cached node_modules` (no `git add` needed).

**Safety note (D-06):** NEVER `rm -rf node_modules` on disk. `git rm --cached` is a different operation and this distinction must be preserved in the plan action text.

---

### 3. `.env.local` — remove from index, preserve on disk

**Operation:** `git rm --cached .env.local` → commit.

**Pre-flight check (D-05 explicit):**
- Owner must have the real `.env.local` contents backed up to a password manager BEFORE this step — since D-01 keeps the keys in use, losing the file = losing all 5 active keys.
- On disk: `cat .env.local` should show the real values before and after the command.

**Commit message (verbatim from CONTEXT.md):**
```
chore: stop tracking .env.local (SEC-05)
```

**Files staged:** deletion of `.env.local` only.

---

### 4. `SETUP.md` — scrub real values to placeholders + add warning banner

**Operation:** Edit in place. The file is already tracked (no staging quirk).

**Current state — grep-confirmed real values to replace:**

| Line # | Current (VERBATIM, secret data) | Replacement |
|--------|----------------------------------|-------------|
| 25 | `   - `Project URL` → es. `https://abcdef.supabase.co` --> https://YOUR_SUPABASE_URL.supabase.co` | `   - `Project URL` → es. `https://abcdef.supabase.co`` |
| 26 | `   - `anon public` key (quella lunga sotto "Project API keys") --> YOUR_SUPABASE_ANON_KEY` | `   - `anon public` key (quella lunga sotto "Project API keys")` |
| 42 | `CLIENT ID: YOUR_GOOGLE_OAUTH_CLIENT_ID` | `CLIENT ID: YOUR_GOOGLE_OAUTH_CLIENT_ID` |
| 43 | `SECRET: YOUR_GOOGLE_OAUTH_CLIENT_SECRET` | `SECRET: YOUR_GOOGLE_OAUTH_CLIENT_SECRET` |
| 52 | `5. Copia la **API Key (v3 auth)** — una stringa di 32 caratteri --> YOUR_TMDB_API_KEY` | `5. Copia la **API Key (v3 auth)** — una stringa di 32 caratteri` |
| 61 | `4. Copia la chiave (inizia con `AIzaSy...`) --> YOUR_GEMINI_API_KEY` | `4. Copia la chiave (inizia con `AIzaSy...`)` |
| 73 | `VITE_SUPABASE_URL=https://tuocodice.supabase.co` | `VITE_SUPABASE_URL=YOUR_SUPABASE_URL` |
| 74 | `VITE_SUPABASE_ANON_KEY=eyJhbGci...` | `VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY` |
| 75 | `VITE_TMDB_API_KEY=il_tuo_tmdb_key` | `VITE_TMDB_API_KEY=YOUR_TMDB_API_KEY` |
| 76 | `VITE_GEMINI_API_KEY=AIzaSy...` | `VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY` |

**Additional patch — D-08 / CONCERNS.md #42 follow-on:** `SETUP.md:77` currently shows only 4 env vars in the code block but `src/lib/gemini.js` uses `VITE_GROQ_API_KEY` too. The scrub should also ADD a line:
```
VITE_GROQ_API_KEY=YOUR_GROQ_API_KEY
```
after line 76 (just before the closing ```` ``` ````). Also adjust line 99 in the body ("aggiungi le 4 variabili") → "aggiungi le 5 variabili".

**Warning banner — insert at the very top (line 1), ABOVE the existing `# 🎬 Cinematica — Guida di Setup Completa` heading (D-07 verbatim, in Italian):**

```markdown
> ⚠️ Mai committare chiavi reali. Usa `.env.local` (già gitignored). Se devi ruotare le chiavi: vedi `.planning/PROJECT.md` § Key Decisions per il piano v2.

```

**Commit message (verbatim):**
```
docs: scrub SETUP.md to placeholders only (SEC-02)
```

**Files staged:** `git add SETUP.md`.

---

### 5. `supabase_schema.sql` — append `-- ── LIBRI (CLEAN-01) ──` block

**Analog (SAME FILE):** `supabase_schema.sql` lines 16-28 (`watched_movies` CREATE TABLE) and 68-71 (4 `watched_*` RLS policies); lines 40-51 (`movie_suggestions` CREATE TABLE) and 78-83 (3 `suggestions_*` RLS policies).

#### Mirror pattern A — `watched_movies` table → `read_books`

**Current `watched_movies` block (`supabase_schema.sql:15-28`, verbatim — TEMPLATE SOURCE):**
```sql
-- Film visti
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

**Current `watched_movies` RLS (`supabase_schema.sql:58, 67-71`, verbatim — TEMPLATE SOURCE):**
```sql
ALTER TABLE watched_movies ENABLE ROW LEVEL SECURITY;

-- Watched movies: visibili e modificabili solo dal proprietario
CREATE POLICY "watched_select" ON watched_movies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_insert" ON watched_movies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watched_update" ON watched_movies FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_delete" ON watched_movies FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

#### Mirror pattern B — `movie_suggestions` table → `book_suggestions`

**Current `movie_suggestions` block (`supabase_schema.sql:39-51`, verbatim — TEMPLATE SOURCE):**
```sql
-- Suggerimenti film tra amici
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

**Current `movie_suggestions` RLS (`supabase_schema.sql:60, 77-83`, verbatim — TEMPLATE SOURCE):**
```sql
ALTER TABLE movie_suggestions ENABLE ROW LEVEL SECURITY;

-- Suggestions: visibili da mittente e destinatario
CREATE POLICY "suggestions_select" ON movie_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "suggestions_insert" ON movie_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "suggestions_update" ON movie_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);
```

#### INFERRED DDL for the `read_books` table

**Inference sources** (grep-confirmed, read-only):
- `src/lib/db.js:145-162` (`addReadBook` upsert payload): columns `user_id, book_id, book_title, book_cover, book_year, book_authors, book_pages, status, current_page, is_favorite, created_at` + `onConflict: 'user_id,book_id'`.
- `src/lib/db.js:168-182`: columns updated individually — `status`, `current_page`, `rating`, `is_favorite`.
- `src/components/books/BookModal.jsx:51-53`: status enum = `'read' | 'reading' | 'wishlist'`.
- `src/components/books/BookModal.jsx:9-11` + `:177`: `rating` is half-star → `NUMERIC(2,1)` (values 0.5..5.0 step 0.5).
- `src/lib/googlebooks.js:7-18`: `id` is a Google Books volume id (string) → `book_id TEXT`.

**Anti-field confirmation:** `grep -n "notes" src/ -R` returned no matches (BookModal does NOT write any `notes` column). Do NOT add a `notes` column speculatively.

#### INFERRED DDL for the `book_suggestions` table

**Inference source** `src/lib/db.js:184-196` (`sendBookSuggestion` insert payload): columns `from_user_id, to_user_id, book_id, book_title, book_cover, book_authors, comment, read, created_at`. Note: intentionally NO `book_year` (cinema has `movie_year`, books does not — confirmed by diff of the two insert payloads).

#### Also covered by D-03: ensure `watched_movies.status` column exists

**Rationale:** `src/lib/db.js:24` writes `status: 'wishlist'` in `addToWishlist`, but the existing `watched_movies` DDL (`supabase_schema.sql:16-28`) does NOT define a `status` column. Confirmed by CONCERNS.md #17 and #27. Use `ADD COLUMN IF NOT EXISTS` so applying to prod (where the column was likely hand-added) is a no-op.

#### FULL BLOCK to append at end of `supabase_schema.sql` (planner should write this VERBATIM)

```sql

-- =========================================
-- ── LIBRI (CLEAN-01) ──────────────────────
-- =========================================
-- Appended 2026-04-22 to reconcile schema drift.
-- Idempotent: IF NOT EXISTS on every statement → no-op on prod, full create on empty DB.

-- 1. Backfill the missing status column on watched_movies
ALTER TABLE watched_movies
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'watched'
  CHECK (status IN ('watched', 'wishlist'));

-- 2. Libri letti / in lettura / wishlist (per-utente)
CREATE TABLE IF NOT EXISTS read_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_cover TEXT,
  book_year TEXT,
  book_authors TEXT,
  book_pages INTEGER,
  status TEXT DEFAULT 'read' CHECK (status IN ('read', 'reading', 'wishlist')),
  current_page INTEGER DEFAULT 0,
  rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 3. Suggerimenti libri tra amici
CREATE TABLE IF NOT EXISTS book_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_cover TEXT,
  book_authors TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS read_books — owner-only (pattern watched_movies)
ALTER TABLE read_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "read_books_select" ON read_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "read_books_insert" ON read_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "read_books_update" ON read_books FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "read_books_delete" ON read_books FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. RLS book_suggestions — sender + recipient (pattern movie_suggestions)
ALTER TABLE book_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "book_suggestions_select" ON book_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY IF NOT EXISTS "book_suggestions_insert" ON book_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY IF NOT EXISTS "book_suggestions_update" ON book_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);
```

**Postgres version caveat for the planner:** `CREATE POLICY IF NOT EXISTS` is supported from Postgres 15 onward. Supabase runs PG 15.x by default in 2026. If the execute step fails on an older PG, the fallback is to wrap each policy in a `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` block — flag as a contingency in the plan, do NOT pre-write it.

**Commit message (verbatim from CONTEXT.md):**
```
fix(schema): append LIBRI DDL + RLS to align with prod (CLEAN-01)
```

**Files staged:** `git add supabase_schema.sql`.

---

### 6. Books feature commit (CLEAN-02a)

**Operation:** `git add` 3 specific files, commit.

**Files (verbatim paths from `git status --porcelain`):**
```
src/components/books/BookModal.jsx
src/components/books/BooksPage.jsx
src/lib/googlebooks.js
```

**Pre-commit verification:** none required (these files already ship conforming to existing conventions — see STRUCTURE.md §"Where to Add New Code" and CONVENTIONS.md §"Module Design" — `googleBooks` as `export const` namespace + default-export components). D-01 of CONTEXT.md explicitly rules out any refactor.

**Commit message (verbatim from CONTEXT.md):**
```
feat(books): add books vertical (BooksPage, BookModal, googlebooks lib) (CLEAN-02a)
```

**Files staged:** explicit list above — NEVER `git add src/components/books/` alone (could drag in other untracked siblings added between now and execute).

---

### 7. Favicon commit (CLEAN-02b)

**Files:** `favicon.svg` (root, 1252 bytes, untracked).

**Commit message (verbatim from CONTEXT.md):**
```
chore: add app favicon (CLEAN-02b)
```

**Files staged:** `git add favicon.svg`.

---

### 8. ANALISI_PROGETTO.md commit (CLEAN-02c)

**Files:** `ANALISI_PROGETTO.md` (root, 24,374 bytes, untracked).

**Pre-commit verification (D-04 explicit):** the executor MUST read the file and confirm no embedded keys, no personal screenshots, no sensitive internal URLs. If any are found: scrub in place BEFORE `git add`. Minor text content is fine as-is.

**Commit message (verbatim from CONTEXT.md):**
```
docs: add initial project analysis (CLEAN-02c)
```

**Files staged:** `git add ANALISI_PROGETTO.md`.

---

### 9. CLEAN-03 clone-test verification (NO commit)

**Operation:** Sanity check — runs in a temp dir, produces no commit.

**Command sequence (from CONTEXT.md §Specific Ideas):**
```bash
# Windows bash equivalent of $(mktemp -d)
TMP_DIR=$(mktemp -d -t yournext-XXXX)
cd "$TMP_DIR"
git clone /c/Users/utente/Desktop/Ale/YourNext/cinematica .
cp /c/Users/utente/Desktop/Ale/YourNext/cinematica/.env.local .env.local
npm install
npm run build
# optional: npm run dev -- --port 5174 & then hit /cinema and /books via curl
```

**Success criteria (from ROADMAP.md §Phase 1 Success Criterion 5):** `npm install` exits 0, `npm run build` exits 0, no "Cannot find module './components/books/BooksPage'" import error.

**Outcome recorded where:** in the phase summary file (`01-01-SUMMARY.md`) at execute time, not in a commit.

---

### 10. Documentation patches for D-01 + D-02 (SEC-01 + SEC-06 → v2 accept-risk)

These three files are patched in a single commit at the END of the phase. Each patch is shown below with exact before/after text so the planner can hand this to the executor as a diff.

#### 10a. `.planning/REQUIREMENTS.md` patches

**Patch 1 — remove SEC-01 line from "v1 Active" (file line 69, verbatim):**

BEFORE:
```markdown
- [ ] **SEC-01** Tutte le chiavi leakate nel `primo commit` sono ruotate — Supabase anon JWT, Google OAuth Client Secret, TMDB API key, Gemini API key, Groq API key
```

AFTER: (delete this line entirely)

**Patch 2 — remove SEC-06 line from "v1 Active" (file line 74, verbatim):**

BEFORE:
```markdown
- [ ] **SEC-06** Decisione esplicita documentata su git history rewrite (BFG / filter-repo) vs accettazione del rischio; se rewrite, esecuzione completata
```

AFTER: (delete this line entirely)

**Patch 3 — add 2 rows to the "v2 / Out of Scope" table (the table currently ends at line 109 with the "Adapter camelCase..." row; insert after the last data row, before the line `---` at line 110):**

APPEND these two rows:
```markdown
| Rotazione chiavi leakate (Supabase anon / Google OAuth secret / TMDB / Gemini / Groq) — **SEC-01** deferred | Accept-risk: repo privato invite-only per ~5-10 amici, blast radius basso (RLS scopes Supabase anon; Google OAuth secret solo redirect flow via Supabase; TMDB/Gemini/Groq solo quote free-tier). Trigger di riapertura: **prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo privato attuale**. |
| Git history rewrite (BFG / git-filter-repo) — **SEC-06** deferred | Accept-risk: pairing logico con SEC-01. Senza rotazione chiavi, la rewrite è cosmetica (chiavi valide + cloni esistenti). Riapertura insieme a SEC-01. |
```

**Patch 4 — update Traceability matrix (current lines 119 and 124 contain SEC-01 and SEC-06):**

BEFORE (line 119):
```markdown
| SEC-01 | Phase 1 — Security & Cleanup | Rotazione chiavi (Supabase / Google OAuth / TMDB / Gemini / Groq) |
```

AFTER (replace with):
```markdown
| SEC-01 | v2 / Out of Scope | Deferred 2026-04-23 — accept-risk, pair con SEC-06 |
```

BEFORE (line 124):
```markdown
| SEC-06 | Phase 1 — Security & Cleanup | Decisione esplicita rewrite history vs accept risk |
```

AFTER (replace with):
```markdown
| SEC-06 | v2 / Out of Scope | Deferred 2026-04-23 — accept-risk, pair con SEC-01 |
```

**Patch 5 — update coverage line at file bottom (current line 140):**

BEFORE:
```markdown
**Coverage:** 20 / 20 Active REQ-ID mappati — nessun orfano, nessun duplicato.
```

AFTER:
```markdown
**Coverage:** 18 / 18 Active REQ-ID mappati — nessun orfano, nessun duplicato. (SEC-01 e SEC-06 spostati a v2 / Out of Scope il 2026-04-23, vedi PROJECT.md §Key Decisions.)
```

---

#### 10b. `.planning/ROADMAP.md` patches

**Patch 1 — §Phase 1 Requirements line (file line 24, verbatim):**

BEFORE:
```markdown
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, CLEAN-01, CLEAN-02, CLEAN-03
```

AFTER:
```markdown
**Requirements**: SEC-02, SEC-03, SEC-04, SEC-05, CLEAN-01, CLEAN-02, CLEAN-03 *(SEC-01 e SEC-06 spostati a v2 il 2026-04-23 — accept-risk, vedi PROJECT.md §Key Decisions)*
```

**Patch 2 — §Phase 1 Success Criterion 1 (file line 26, verbatim):**

BEFORE:
```markdown
  1. Tutte le chiavi che comparivano in `primo commit` (Supabase anon JWT, Google OAuth Client Secret, TMDB, Gemini, Groq) sono ruotate e quelle vecchie non autenticano più contro i rispettivi servizi.
```

AFTER (riformulata per riflettere accept-risk — CONTEXT.md D-01 consente sia rimozione sia riformulazione; il planner sceglie la riformulazione per mantenere la numerazione e rendere visibile il deferral):
```markdown
  1. La decisione di accept-risk sulla rotazione chiavi (SEC-01) è documentata in `PROJECT.md` §Key Decisions con trigger di riapertura esplicito (pre-condivisione pubblica del repo).
```

**Patch 3 — §Phase 1 Success Criterion 3 (file line 28, verbatim):**

BEFORE:
```markdown
  3. Esiste una decisione documentata (in PROJECT.md Key Decisions o in un commento dedicato) su rewrite della git history vs accettazione del rischio; se la decisione è "rewrite", l'operazione è stata eseguita e verificata.
```

AFTER:
```markdown
  3. La decisione di accept-risk sul rewrite della git history (SEC-06) è documentata in `PROJECT.md` §Key Decisions, paired con SEC-01 (stesso trigger di riapertura).
```

**Patches 4–6:** criteria 2, 4, 5 stay verbatim (they cover SEC-02/03/04/05, CLEAN-01, CLEAN-03 — no change required).

---

#### 10c. `.planning/PROJECT.md` patches

**Patch 1 — §Key Decisions table: append 2 rows (the table currently ends at line 145 with the "Schema DB come source of truth..." row; insert after the last data row, BEFORE the line `## Constraints` at line 147):**

APPEND these two rows:
```markdown
| **SEC-01 rotazione chiavi → v2 (accept-risk)** | Repo privato invite-only, blast radius basso (RLS limita Supabase anon; Google OAuth secret solo redirect flow; LLM/TMDB solo free-tier quotas). Trigger di riapertura: prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo attuale. | ⏳ Deferred 2026-04-23 (Fase 1 planning) |
| **SEC-06 history rewrite → v2 (accept-risk)** | Pair logico con SEC-01: senza rotazione, la rewrite è cosmetica. Riapertura insieme a SEC-01. | ⏳ Deferred 2026-04-23 (Fase 1 planning) |
```

**Commit message for all doc patches (verbatim from CONTEXT.md §Specific Ideas):**
```
docs: defer SEC-01 and SEC-06 to v2 with accept-risk rationale
```

**Files staged:** `git add .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/PROJECT.md`.

---

## Shared Patterns

### Commit message style — conventional commits (recent git log confirmed)

**Source:** `git log --oneline -n 8`
```
056963d docs(01): capture phase context for Security & Cleanup (SEC-01/SEC-06 deferred to v2)
25d24c4 docs(02): capture phase context for Verticale Ristoranti
910e430 docs: create roadmap (3 phases)
0c08e89 docs: define v1 requirements
ca554f4 chore: add project config
462a3b8 docs: initialize project
8241d7c docs: map existing codebase
386f79a primo commit
```

**Prefixes in use:** `feat(scope):`, `fix(scope):`, `docs:`, `docs(scope):`, `chore:`, `refactor:` (from CLAUDE.md). No `test:` yet (no tests in repo). All 9 commits for Phase 1 are shown verbatim in the individual pattern sections above.

**Apply to:** all 9 commits in this phase.

**`Co-Authored-By` tag:** auto-added by `/gsd-execute-phase` per CLAUDE.md — executor does NOT need to write it by hand; just ensure the commit flow uses `git commit -m "..."` without `--no-verify`.

---

### Git staging — NEVER `git add .` / `git add -A`

**Source:** CLAUDE.md "Critical guidance #1".

**Why (Phase-1-specific):** until task 3 completes, `.env.local` is tracked and would appear in `git add .` output even if it has no local modification from the point of view of the current workflow. Using explicit file lists per commit is the only safe mode.

**Apply to:** every commit in this phase (9 commits). Each pattern section above lists the exact `git add <files>` command.

---

### Idempotent DDL pattern

**Source:** `supabase_schema.sql` uses `CREATE TABLE IF NOT EXISTS` (lines 7, 16, 31, 40), `DROP TRIGGER IF EXISTS` (line 103), `CREATE OR REPLACE FUNCTION` (line 88). Every DDL is replayable without destroying data.

**Apply to:** the new `-- ── LIBRI ──` block (task 5). Every statement uses `IF NOT EXISTS` (tables, columns, policies) to preserve idempotency. Anti-pattern: do NOT write `CREATE POLICY "x"` without `IF NOT EXISTS` — it would fail on second apply against prod.

---

### Italian UI copy, English code

**Source:** CLAUDE.md §"user copy in italiano" + CONVENTIONS.md §Comments.

**Apply to:** SETUP.md warning banner (D-07: Italian verbatim string). SQL comments in the new LIBRI block are also in Italian (matches the existing `-- Film visti`, `-- Amicizie`, `-- Suggerimenti film tra amici` tradition in `supabase_schema.sql`).

---

## No Analog Found

All files in this phase either:
- Have an exact mirror-analog in the same file (`supabase_schema.sql` self-mirror), OR
- Are pure doc/config operations (no code analog required).

No file in this phase needs RESEARCH.md fallback patterns — the SQL mirror is exact and the rest is deterministic git/doc work.

---

## Metadata

**Analog search scope:** `supabase_schema.sql` (self-mirror), `src/lib/db.js` (field inference), `src/components/books/BookModal.jsx` (rating/progress semantics), `src/lib/googlebooks.js` (book_id type), `git ls-files`, `git status --porcelain`, recent `git log`.
**Files scanned:** 12 (context docs + 7 codebase targets + CONVENTIONS/CONCERNS/STRUCTURE).
**Re-read count:** 0 (single pass per file; targeted line ranges for the large files).
**Pattern extraction date:** 2026-04-22.
**Secrets handling:** real values from SETUP.md lines 25, 26, 42, 43, 52, 61 are reproduced in this file ONLY in the before/after diff for the scrub task — they already exist in git history, so echoing them here does not leak further. They will disappear when task 4 commits. `.env.local` contents are NOT reproduced here (already known to be in git history; reading not required for scrubbing).
