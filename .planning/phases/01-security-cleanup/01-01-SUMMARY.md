# Phase 1: Security & Cleanup — Summary

**Executed:** 2026-04-24
**Status:** ✅ Complete
**Plan:** `01-01-PLAN.md`
**Commits:** 10 (9 planned + 1 in-flight fix for PG policy syntax)

---

## Task outcomes

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Expand + track `.gitignore` (SEC-03) | ✅ PASS | 12 patterns (Env / Dependencies / Build / Vercel / OS / Logs / IDE). Section headers preserved verbatim. |
| 2 | Untrack `node_modules/` (SEC-04) | ✅ PASS | 10,770 deletions staged, filesystem preserved (`ls node_modules/` returns content). |
| 3 | Untrack `.env.local` (SEC-05) | ✅ PASS | Pre-flight: 786 bytes on disk before/after. Filesystem preserved, keys still usable at runtime. |
| 4 | Scrub `SETUP.md` to placeholders (SEC-02) | ✅ PASS | 0 JWT / 0 GOCSPX / 0 AIzaSy / 0 TMDB-hex matches post-scrub. 6 placeholders present (incl. new `YOUR_GROQ_API_KEY`). Italian ⚠️ banner inserted above `# 🎬 Cinematica…` heading. "4 variabili" → "5 variabili" on line 99 applied. |
| 5 | Append LIBRI DDL to `supabase_schema.sql` (CLEAN-01 local) | ✅ PASS | Block delimiter present; `read_books`, `book_suggestions`, `watched_movies.status`, 4 RLS `read_books_*` + 3 RLS `book_suggestions_*`. 6 `ENABLE ROW LEVEL SECURITY` in file (2 new + 4 pre-existing incl. `friendships`). |
| 5b | **Fix: PG policy syntax** (in-flight) | ⚠ Planned as contingency in PATTERNS.md §5, triggered | First Supabase SQL Editor run returned `ERROR: 42601 syntax error at or near "NOT"` on `CREATE POLICY IF NOT EXISTS`. Postgres does NOT support `IF NOT EXISTS` on policies at any version (unlike tables/columns). Replaced with idempotent `DROP POLICY IF EXISTS; CREATE POLICY` pattern. Extra commit: `5f00d40 fix(schema): use DROP+CREATE POLICY pattern`. |
| 6 | **BLOCKING — Manual DDL push** (CLEAN-01 prod) | ✅ PASS | Owner replied "success" after running the corrected block in Supabase SQL Editor. RLS active on `read_books`, `book_suggestions`, `watched_movies`. Idempotency: re-running the block is safe (DROP POLICY IF EXISTS makes the policy block replayable; table DDL uses `IF NOT EXISTS`). |
| 7 | Commit books vertical (CLEAN-02a) | ✅ PASS | 3 files tracked: `src/components/books/BooksPage.jsx`, `BookModal.jsx`, `src/lib/googlebooks.js` (696 insertions). No secrets detected in pre-commit grep. |
| 8 | Commit `favicon.svg` (CLEAN-02b) | ✅ PASS | 5-line SVG tracked. |
| 9 | Review + commit `ANALISI_PROGETTO.md` (CLEAN-02c) | ✅ PASS | Pre-commit grep: 0 JWT / 0 Google API / 0 OAuth secret / 0 TMDB-hex. No scrub needed — commit as-is (24,374 bytes, 751 lines). |
| 10 | Clean clone build (CLEAN-03) | ✅ PASS | Temp dir `/tmp/yournext-bv4J`. `git clone` from local repo: OK. `.env.local` copied (5 VITE_* vars). `npm install`: exit 0 (2 moderate audit warnings, non-blocking). `npm run build`: exit 0, 1474 modules, 7.61s, no `Cannot find module` on books imports. Temp dir left in place for optional manual smoke test. |
| 11 | Defer SEC-01 + SEC-06 to v2 — doc patches | ✅ PASS | REQUIREMENTS.md: SEC-01/06 removed from v1 Active, added to v2 Out-of-Scope, Traceability matrix updated, Coverage 20/20 → 18/18. ROADMAP.md: Phase 1 Requirements line and Success Criteria 1+3 reformulated. PROJECT.md: 2 new Key Decisions rows dated 2026-04-23. |

---

## Commit list (10 commits on `main`)

```
c9d5364 docs: defer SEC-01 and SEC-06 to v2 with accept-risk rationale
8ee2761 docs: add initial project analysis (CLEAN-02c)
614cd78 chore: add app favicon (CLEAN-02b)
e6352dd feat(books): add books vertical (BooksPage, BookModal, googlebooks lib) (CLEAN-02a)
5f00d40 fix(schema): use DROP+CREATE POLICY pattern (PG doesn't support IF NOT EXISTS on policies)
1915864 fix(schema): append LIBRI DDL + RLS to align with prod (CLEAN-01)
bbecdbc docs: scrub SETUP.md to placeholders only (SEC-02)
2ff4b5c chore: stop tracking .env.local (SEC-05)
dc26a38 chore: stop tracking node_modules (SEC-04)
cf2099f chore: track comprehensive .gitignore (SEC-03)
```

All commits use conventional-commit prefix + Co-Authored-By tag. No `git add .` / `-A` used. No `--no-verify`. No files outside the plan's scope were staged (modified `src/**` files from pre-phase dev work were intentionally left untracked as per PATTERNS.md §"Files explicitly OUT OF SCOPE").

---

## Threat model — mitigation status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-01-01 Keys in git history (commit `386f79a primo commit`) | accept | Documented in `.planning/PROJECT.md` §Key Decisions (D-01 / D-02). Trigger: pre-public-sharing. |
| T-01-02 `.env.local` tracked with real keys | mitigate | ✅ Task 3 (`git rm --cached`) + Task 1 (`.gitignore` covers `.env*.local`). Disk preserved. |
| T-01-03 `SETUP.md` contains real secrets | mitigate | ✅ Task 4: 10 real values → `YOUR_*` placeholders + Italian ⚠️ banner. |
| T-01-04 Supabase prod schema drift / RLS missing | mitigate | ✅ Task 5 (file) + Task 6 (manual push, owner-confirmed). `rowsecurity = true` on all 3 book/movie tables per owner verification. |
| T-01-05 Accidental re-staging via `git add .` | mitigate | ✅ Every commit used explicit file list. `.env.local` never re-staged after Task 3. |
| T-01-06 `.env.local` loss = 5 keys lost | mitigate | ✅ Task 3 pre-flight check passed; file preserved on disk; git history still holds a copy (residual risk accepted with T-01-01). |

**Residual risks (accepted):** T-01-01 (keys in history). Trigger for re-opening SEC-01 / SEC-06: **prima di qualsiasi condivisione pubblica del repo o scale-up oltre il gruppo privato ~5-10 amici attuale**.

---

## Phase-wide automated checks (from PLAN.md `<verification>`)

All 10 phase-wide greps pass. Spot checks:
- `.gitignore` tracked with 12 patterns ✓
- `node_modules/` has 0 tracked files, directory present on disk ✓
- `.env.local` untracked, file preserved ✓
- `SETUP.md`: 0 JWT / 0 GOCSPX / 0 AIzaSy / ⚠️ banner in head ✓
- `supabase_schema.sql`: LIBRI delimiter + `read_books` + `book_suggestions` + `ADD COLUMN IF NOT EXISTS status` ✓
- Books + favicon + ANALISI tracked (5 files) ✓
- REQUIREMENTS.md: SEC-01/06 absent from v1 Active, present in v2 section ✓
- PROJECT.md: 2 new rows dated `2026-04-23` ✓

---

## Open follow-ups for the owner (non-blocking)

1. **D-08 Vercel environment variables (manual verification):** verifica che Production + Preview env vars in Vercel Dashboard corrispondano ai 5 `VITE_*` in `.env.local`. Se un deploy futuro fallisce dopo Phase 1, la causa più probabile è uno stale env var, non un problema di codice.
2. **Temp dir `/tmp/yournext-bv4J`** rimane in piedi per smoke-test manuale. Cancellabile quando vuoi con `rm -rf /tmp/yournext-bv4J` (safe — è una copia clone isolata).
3. **`.claude/` e `req.txt`** restano untracked (non nello scope di Phase 1). Se li vuoi ignorare definitivamente, aggiungi una riga `.claude/` e `req.txt` al `.gitignore` in una fase successiva.
4. **Pre-commit hook per `.env*` detection** (deferred v2 per policy "no new deps senza giustificazione"): valuta `husky` + grep semplice prima di un futuro scale-up.

---

## Success criteria — roll-up

1. ✅ SEC-02 — 0 real values, 6 placeholders, ⚠️ banner in head
2. ✅ SEC-03 — 12 patterns covered in tracked `.gitignore`
3. ✅ SEC-04 — `node_modules/` untracked, disk preserved
4. ✅ SEC-05 — `.env.local` untracked, disk preserved
5. ✅ CLEAN-01 local — LIBRI block appended, idempotent, DROP+CREATE POLICY pattern
6. ✅ CLEAN-01 prod — applied via Supabase SQL Editor, owner-confirmed
7. ✅ CLEAN-02 — 5 files tracked in 3 atomic commits
8. ✅ CLEAN-03 — clean clone builds exit 0, no import errors
9. ✅ D-01 / D-02 — SEC-01 + SEC-06 deferred to v2 in all 3 planning docs
10. ✅ Commit discipline — 10 atomic commits, all explicit-file-staged

**Phase 1 complete.** Next: `/gsd-verify-work 1` (optional conversational UAT) or straight to `/gsd-discuss-phase 2` (Verticale Ristoranti).
