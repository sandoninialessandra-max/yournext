# Codebase Concerns

**Analysis Date:** 2026-04-22

> Scope: full repository at `C:\Users\utente\Desktop\Ale\YourNext\cinematica` (Vite + React 18 SPA, Supabase + TMDB + Google Books + Gemini + Groq). Only one commit exists (`386f79a — primo commit`), and the working tree has many uncommitted modifications plus an untracked `src/components/books/` feature area. This document lists the concerns discovered, grouped by category and with file references.

---

## Security

### 1. `.env.local` IS TRACKED IN GIT — committed secrets

- **Severity:** CRITICAL.
- **Evidence:** `git ls-files` lists `.env.local` as tracked, and `git log -- .env.local` shows it was included in the only commit (`386f79a primo commit`). `git check-ignore -v .env.local` exits 1 (not ignored at this moment, because the rule has not taken effect for an already-tracked file).
- **Files:** `.env.local` (in repo root, 697 bytes), referenced by `src/lib/supabase.js:3-4`, `src/lib/tmdb.js:2`, `src/lib/gemini.js:2,6`.
- **What is exposed (per `.env.example` at `.env.example:4-11` and `SETUP.md`):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TMDB_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`.
- **Fix approach:**
  1. Rotate every key immediately (Supabase anon key, TMDB key, Gemini key, Groq key, and the Google OAuth Client Secret — see next item).
  2. `git rm --cached .env.local`, then commit.
  3. Rewrite history to purge the file from every past commit: `git filter-repo --path .env.local --invert-paths` (or `git filter-branch` / BFG), then force-push.
  4. Add a pre-commit hook (e.g. `gitleaks`, `pre-commit` + `detect-secrets`) to prevent regression.

### 2. `SETUP.md` contains REAL production secrets in plaintext

- **Severity:** CRITICAL.
- **File:** `SETUP.md` (tracked by git, committed).
- **Evidence (lines contain real values the user pasted as examples):**
  - `SETUP.md:25` — full Supabase project URL.
  - `SETUP.md:26` — full Supabase `anon` JWT (long `eyJhbGci…` token).
  - `SETUP.md:42` — Google OAuth **Client ID** (`…apps.googleusercontent.com`).
  - `SETUP.md:43` — Google OAuth **Client Secret** (`GOCSPX-…`). This is the most dangerous exposure: the client secret must never be committed.
  - `SETUP.md:52` — TMDB API key.
  - `SETUP.md:61` — Gemini API key (`AIzaSy…`).
- **Impact:** Anyone with repo read access (including anyone on GitHub if pushed) can authenticate against the Supabase project, impersonate the Google OAuth app, and burn the TMDB/Gemini quotas or pivot to paid tiers.
- **Fix approach:**
  1. Rotate the Google OAuth Client Secret in Google Cloud Console (new credential pair). Rotate all API keys as above.
  2. Replace the real values in `SETUP.md` with placeholders (`<YOUR_ANON_KEY>`, `<YOUR_TMDB_KEY>`, etc.) — the document is a how-to and shouldn't carry them.
  3. Purge `SETUP.md` history too — you cannot just overwrite, because git preserves past blobs. Use `git filter-repo` to rewrite the file's content across history, or rewrite the single commit if it is still safe to do so.

### 3. `.gitignore` is itself UNTRACKED and minimal

- **Severity:** High.
- **File:** `.gitignore` — 24 bytes, contents only `.env.local` + `node_modules` with CRLF line endings (verified via `od -c`). It is listed under "Untracked files" in `git status`, meaning the rule has never been committed.
- **Consequence:** Once committed, it still won't evict files already tracked (see items 1 and 4). Also, its coverage is thin — there is no entry for `dist/`, `.vite/`, `.DS_Store`, `*.log`, `.env`, `.env.*`, `coverage/`, editor folders, or OS junk.
- **Fix approach:** Replace with a standard Node/Vite ignore:
  ```gitignore
  node_modules/
  dist/
  .vite/
  .env
  .env.*
  !.env.example
  *.log
  .DS_Store
  .idea/
  .vscode/
  coverage/
  ```
  Then commit `.gitignore`.

### 4. `node_modules/` is tracked in git (10,770 files)

- **Severity:** High (not a secret leak, but catastrophic for repo hygiene and review diffs).
- **Evidence:** `git ls-files | wc -l` returns 10794; `git ls-files | grep -c node_modules` returns 10770.
- **Impact:** Clones are huge, CI caches are confused, security scanners flag vendor code, and PR diffs include vendored transitive deps. Combined with item 5, this is also why the initial commit is so bulky.
- **Fix approach:** `git rm -r --cached node_modules`, commit, and verify `.gitignore` (item 3) prevents re-adding.

### 5. `package-lock.json` is tracked (good) but there is no `engines` field

- **Severity:** Low.
- **File:** `package.json` has no `engines` key; `SETUP.md` says "install Node LTS" but does not pin a version.
- **Impact:** Reproducibility drift. Vite 5 requires Node ≥18. Pin it with `"engines": { "node": ">=18.18" }` and add an `.nvmrc`.

### 6. All API keys are client-side (`VITE_*` → bundled into JS)

- **Severity:** High — intrinsic to the current architecture.
- **Files exposing keys directly in browser code:**
  - `src/lib/tmdb.js:2` — `VITE_TMDB_API_KEY` used in every fetch URL as `?api_key=${TMDB_KEY}`.
  - `src/lib/gemini.js:2` (`VITE_GROQ_API_KEY`), `src/lib/gemini.js:6-7` (`VITE_GEMINI_API_KEY` embedded directly into the Gemini URL).
  - `src/lib/supabase.js:3-4` — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- **Risk breakdown:**
  - **Supabase anon key**: designed to be public IF and only if RLS is correctly configured on every table (see concern 7). It is not a "leak" by itself.
  - **TMDB v3 key**: low impact (read-only API, public quotas).
  - **Gemini & Groq keys**: high impact — these are billable LLM API keys; anyone who views the site source can extract them and send their own inference traffic on your bill/quota.
- **Fix approach:** Move Gemini/Groq calls server-side. Options: a Vercel Serverless Function (e.g. `api/ai-suggest.js`), a Supabase Edge Function, or migrate to a tiny Node/Express backend. The client then calls your origin, which forwards with secret keys held only on the server.

### 7. Row-Level Security policies are incomplete in `supabase_schema.sql`

- **Severity:** CRITICAL for data confidentiality.
- **File:** `supabase_schema.sql`.
- **What the schema actually defines (lines 1–106):**
  - Tables created: `profiles`, `watched_movies`, `friendships`, `movie_suggestions`.
  - `ANALISI_PROGETTO.md` (lines 317–362) documents additional tables used at runtime — `read_books`, `book_suggestions` — but **they are NOT defined in `supabase_schema.sql` at all**, and yet the client code reads/writes them (`src/lib/db.js:136-209`, `src/components/cinema/NotificationsPage.jsx:17`). Either those tables were created manually in the Supabase dashboard without RLS, or they do not exist and any book feature breaks at runtime.
  - RLS enabled (lines 57–60) only for `profiles`, `watched_movies`, `friendships`, `movie_suggestions`. `read_books` and `book_suggestions` have no RLS policies in this file.
- **Policy-specific issues:**
  - `supabase_schema.sql:63` — `profiles_select` policy `USING (true)` for every authenticated user. This exposes every user's `email`, `full_name`, `avatar_url` to any other authenticated user. Combined with `db.searchUserByEmail` (`src/lib/db.js:109-116`) which does `ilike %q%` on both email and full_name, anyone can enumerate the entire user directory.
  - `supabase_schema.sql:74-75` — `friendships_select/insert` only cover the `user_id` side. There is no DELETE policy (unfriend is impossible), and inserts are done bidirectionally in application code — except `db.addFriend` (`src/lib/db.js:118-123`) only inserts the one-sided row, contradicting `ANALISI_PROGETTO.md:372` which claims amicizie are bidirectional.
  - `supabase_schema.sql:82-83` — `suggestions_update` lets the recipient `UPDATE` the entire row, not just `read`. A malicious recipient could overwrite `movie_title`, `comment`, etc. Narrow the policy with a column grant or a check constraint.
  - No policies exist for `DELETE` on `movie_suggestions`, so the sender cannot retract.
- **Fix approach:** Add the missing tables + RLS in the SQL file, tighten `profiles_select` (e.g. only return the caller's own profile plus friends' profiles), and add explicit column-scoped UPDATE via PostgREST or a SECURITY DEFINER function `mark_suggestion_read(uuid)`.

### 8. `searchUserByEmail` does `ilike %q%` with no escaping

- **Severity:** Medium.
- **File:** `src/lib/db.js:109-116`.
- **Issue:** `supabase.from('profiles').select('*').or(`email.ilike.%${email}%,full_name.ilike.%${email}%`)` — if the input contains `,` or Supabase's `or()` DSL metacharacters, the filter string breaks; with a crafted payload a user can inject additional filter clauses into the PostgREST request (e.g. `,full_name.is.null)` etc.). Not SQL injection proper (PostgREST parameterises), but filter injection.
- **Fix approach:** Use two separate queries (one per column) or `supabase.from('profiles').select('*').ilike('email', ...)`. Alternatively validate the input with a tight regex.

### 9. OAuth redirect policy is open

- **File:** `src/lib/supabase.js:19` — `redirectTo: window.location.origin`.
- **Concern:** Supabase enforces an allowlist of Redirect URLs on the server side (per `SETUP.md:38-41`), so this is acceptable *if* the allowlist is tight. Make sure production only lists the real Vercel domain(s); otherwise, any attacker who can set up a Supabase-allowed origin could use it as an OAuth callback.

---

## Tech Debt

### 10. Significant uncommitted work

- **Severity:** High (process risk, easy to lose work).
- **Evidence from `git status`:** 10 modified files, 5 untracked paths, only 1 historical commit.
  - Modified: `src/App.jsx`, `src/components/auth/LoginPage.jsx`, `src/components/cinema/CinemaPage.jsx`, `src/components/cinema/MovieModal.jsx`, `src/components/cinema/NotificationsPage.jsx`, `src/components/cinema/ProfilePage.jsx`, `src/components/layout/Sidebar.jsx`, `src/lib/db.js`, `src/lib/gemini.js`, `src/styles/main.css`.
  - Untracked: `.gitignore`, `ANALISI_PROGETTO.md`, `favicon.svg`, `src/components/books/` (both `BooksPage.jsx` 17,922 bytes and `BookModal.jsx` 15,173 bytes), `src/lib/googlebooks.js`.
- **Impact:** `src/App.jsx:8` imports `./components/books/BooksPage.jsx`, which is untracked — meaning on a fresh clone (after cleaning `node_modules`) the build will fail. The repo is currently broken for any new contributor.
- **Fix approach:** Commit the books feature as its own commit, commit the `.gitignore` cleanup, and break the pile of "everything modified" into reviewable commits.

### 11. No linter / formatter / type checker / tests

- **Files:** No `.eslintrc*`, no `.prettierrc*`, no `biome.json`, no `tsconfig.json` (project uses plain JSX), no `jest.config.*` / `vitest.config.*`, no `__tests__/` or `*.test.*` under `src/`.
- **Package.json (`package.json:6-10`)** only declares `dev`, `build`, `preview`. No `lint`, `test`, `format`, `typecheck`.
- **Visible symptoms of the lack of linting:**
  - Mixed tabs/spaces indentation in `src/App.jsx:59-74`, `src/lib/db.js:14-29,65-80,109-123,194-209`, `src/components/cinema/ProfilePage.jsx:29-40`, `src/components/cinema/MovieModal.jsx:73-78,140-180,183-221`.
  - Unused imports: `src/App.jsx:15` imports `User, LogOut` that are used only inside `AppShell` (fine) — but both `useNavigate`/`useLocation` are imported twice logically (once at top, `AppShell` body uses them). Not wrong, but ESLint would flag the duplicate/verbose surface.
  - Shadowed identifiers: `src/components/cinema/CinemaPage.jsx:84` declares `const watched = byStatus('watched')` while the module also depends on `watched` field semantics from the DB row (`w.status === 'watched'`); easy to confuse while refactoring.
  - `src/hooks/useAuth.jsx:32` — function `syncProfile` takes a parameter named `user`, shadowing the `user` state in the closure at `src/hooks/useAuth.jsx:8`.
- **Fix approach:** Add ESLint with `eslint-plugin-react`, `eslint-plugin-react-hooks`, and Prettier. Add Vitest + `@testing-library/react` for a baseline. Consider migrating to TypeScript incrementally (rename `*.jsx` → `*.tsx`, add `tsconfig.json`).

### 12. No TODO/FIXME/HACK markers at all

- **Evidence:** `Grep` for `TODO|FIXME|HACK|XXX` across `src/` returns zero matches.
- **Interpretation:** Not a positive — it usually means devs don't annotate known-broken code. Combined with the commented-out prompts left in `src/lib/gemini.js:57-61` (dead code committed as comments), debt is latent rather than tracked.

### 13. Commented-out code in `src/lib/gemini.js`

- **File:** `src/lib/gemini.js:55-61`.
- **Issue:** Two earlier prompt variants are left as commented code. This should be deleted or moved to git history.

### 14. Duplicated top-bar chrome logic in `App.jsx`

- **File:** `src/App.jsx:58-74` — an inline `div` with avatar + "Esci" button. The same logic is replicated on the profile page header (`src/components/cinema/ProfilePage.jsx:54-63`) and a `LogOut` is also in `Sidebar.jsx:2,30` (imported but not used — `Sidebar.jsx` only imports `LogOut` and never renders it).
- **Fix approach:** Extract a `TopBar` component under `src/components/layout/`.

### 15. `Sidebar.jsx` dead imports

- **File:** `src/components/layout/Sidebar.jsx:3` imports `signOut` but never uses it; line 2 imports `LogOut` icon, never rendered; line 4 imports `useAuth` but does not read `user`. ESLint's `no-unused-vars` would flag all three.

### 16. Book-feature tables missing from `supabase_schema.sql`

- **Already covered under Security item 7, but also a tech debt concern:** the source of truth for schema is desynced from code. Deployed environments are going to need manual SQL to make the app work, which makes onboarding fragile.

### 17. Inconsistent misc patterns

- **`src/lib/db.js`** keeps `status` column in upsert payloads for some methods but not others (`addWatchedMovie` at `src/lib/db.js:31-46` omits `status`, while `addToWishlist` at `src/lib/db.js:14-29` sets `status: 'wishlist'`). The schema (`supabase_schema.sql:16-28`) does **not** define a `status` column on `watched_movies` at all, yet the code writes to it. Either the schema is stale or the production DB was hand-edited.
- **`ANALISI_PROGETTO.md:323`** documents `read_books.book_id` as `TEXT PK` with compound PK `(user_id, book_id)`. The actual `db.addReadBook` (`src/lib/db.js:145-162`) upserts with `onConflict: 'user_id,book_id'`, matching the doc — but again, the SQL file lacks the table altogether.

### 18. Stale or alpha-phase features

- **`/travel` route** (`src/App.jsx:79`) is a `<ComingSoon>` placeholder hardcoded inline at `src/App.jsx:18-28`. Referenced by `Sidebar.jsx:14` with `soon: true`. Either build it or remove the nav item to stop exposing half-finished UX.

---

## Fragile Areas

### 19. Error handling is near-absent in `src/lib/*.js`

- **`src/lib/tmdb.js`** — no check on `res.ok`, no `try/catch`, every helper (`search`, `getMovie`, `getNowPlaying`, `getUpcoming`, `getTrending`, `getPopular`) will return a malformed object (e.g. `{results: undefined}`) on a 4xx/5xx and the UI will break later. Example: `src/lib/tmdb.js:9-12,15-17,20-23`.
- **`src/lib/googlebooks.js`** — same pattern; no `res.ok` check at lines 22-27, 30-33, 36-41, 44-50, 53-58.
- **`src/lib/gemini.js`** — `askGemini` does check `res.ok` (`src/lib/gemini.js:37`) and `askGroq` logs but still throws; good. But `getFullPlot` (`src/lib/gemini.js:64-76`) swallows `askGemini` errors in an empty `catch {}` at line 71 (silent fail). Same silent catch at `src/lib/gemini.js:134,153`.
- **`src/lib/db.js`** — `getWatchedMovies`, `getFriends`, `getSuggestions`, `getReadBooks`, `getBookSuggestions`, `getProfile` all destructure `{ data }` and discard `error` entirely, returning `[]` silently on RLS denial, network failure, or schema drift. Example: `src/lib/db.js:5-12, 65-80, 96-103, 136-143, 198-205, 125-128`.
- **Impact:** Symptoms present as "empty state" to the user even when the real cause is a broken query or a misconfigured RLS policy. Debugging production issues is painful.
- **Fix approach:** Wrap every request in a helper that returns `{ data, error }`, surface errors via `useToast`, and add a React `<ErrorBoundary>` at the root (`src/main.jsx:5-9` / around `AppShell`).

### 20. No React Error Boundary

- **File:** `src/main.jsx:5-9`, `src/App.jsx:88-98`.
- **Issue:** A single render-time exception in any modal crashes the whole SPA white-screen. `ToastProvider` does not catch renders.
- **Fix approach:** Add `<ErrorBoundary>` around `<AppShell />` and around each modal mount.

### 21. Many fetches run without cancellation on unmount

- Every `useEffect` that does `.then(setState)` (e.g. `src/components/cinema/CinemaPage.jsx:40-46`, `src/components/cinema/MovieModal.jsx:32-35`, `src/components/cinema/ProfilePage.jsx:16-18`, `src/components/cinema/NotificationsPage.jsx:13-32`) can call `setState` on an unmounted component if the user navigates away mid-flight. With `React.StrictMode` enabled in dev (`src/main.jsx:6`), this surfaces as double-invocations and warnings.
- **Fix:** Use `AbortController` and ignore-flag pattern or TanStack Query.

### 22. `NotificationsPage` mutates as a side effect of a fetch

- **File:** `src/components/cinema/NotificationsPage.jsx:15-32`.
- **Issue:** Inside the `Promise.all(...).then(([movies, books]) => {...})`, after setting state, the code fires `db.markSuggestionRead(s.id)` for each unread item (line 28-29) without awaiting and without handling errors. It also calls `onRead?.()` immediately (line 30) **before** the updates round-trip, so the sidebar badge clears optimistically. If the write fails, the badge is wrong until next poll (every 60s per `src/App.jsx:43`).
- **Fix:** Batch the marks into a single RPC/update (`.in('id', unreadIds).update({read: true})`), await it, then call `onRead`. Also handle errors.

### 23. `db.getFriends` double round-trip

- **File:** `src/lib/db.js:65-80`.
- **Issue:** Two sequential queries (friendships → profiles) where a single joined select via `from('friendships').select('friend:profiles(...)')` (PostgREST embed) would suffice. Latency doubles for each render that depends on this (and it is called in `MovieModal`, `BookModal`, `ProfilePage`, `AppShell` badge polling indirectly via `getSuggestions`).

### 24. Polling loop never stops on logout, only on unmount

- **File:** `src/App.jsx:36-45`. `setInterval` runs every 60s against Supabase while logged in. If the session expires mid-interval, each poll will return an error that is swallowed (per concern 19). Consider also stopping during `document.visibilityState === 'hidden'`.

### 25. Large multi-concern components

- **`src/components/cinema/MovieModal.jsx` (341 lines)** — fetches movie, handles watch-status, rating, favorites, full plot, similar, providers, send-to-friend modal, all in one component.
- **`src/components/cinema/CinemaPage.jsx` (336 lines)** — page + search + discover + AI suggestions + grid + modal trigger.
- **`src/components/books/BooksPage.jsx` (319 lines)** and **`src/components/books/BookModal.jsx` (311 lines)** — mirror the cinema versions, therefore also the same level of mixed concerns.
- **Fix approach:** Split into presentational/container pairs, extract tab panels, extract the send-to-friend panel, and move AI glue into hooks (`useAiSuggestions`, `useMovieDetail`). Also deduplicate across cinema vs. books (both share ~80% of shape).

### 26. Bidirectional friendship logic is lost

- **File:** `src/lib/db.js:118-123`.
- **Issue:** `addFriend` inserts a single row `(user_id, friend_id)`. `ANALISI_PROGETTO.md:282,372` state friendships are bidirectional with two rows. `getFriends` (`src/lib/db.js:65-80`) only fetches where `user_id = me`, so if the counterpart row is missing you become a "one-way friend" and suggestion delivery via `movie_suggestions` still works (it checks `from_user_id`) but `friend.getFriends()` on the other side won't show you — the list to send suggestions *to* on their side is empty.
- **Fix approach:** Insert both rows (or create a canonical "least-id first" row plus a view that unions both directions) in a SECURITY DEFINER function.

### 27. Schema drift around `status` column on `watched_movies`

- Already listed under concern 17; also fragile because any reads that expect `status` (e.g. `src/lib/db.js:82` indirectly, and wishlist filters at `src/components/cinema/CinemaPage.jsx:81-88`) will silently treat every row as `watched` if the column does not exist.

---

## Performance

### 28. No code splitting / lazy routes

- **File:** `src/App.jsx:5-10` imports every page and the modal logic at module load. Bundle includes TMDB, Google Books, Gemini, Groq glue, and all modals on first paint.
- **Fix approach:** Use `React.lazy` + `<Suspense>` per route (`CinemaPage`, `BooksPage`, `ProfilePage`, `NotificationsPage`) and lazy-load modals. `vite.config.js` is currently minimal (`vite.config.js:1-6`) — add `build.rollupOptions.output.manualChunks` to split vendors.

### 29. AI results are regenerated every tab switch

- **File:** `src/components/cinema/CinemaPage.jsx:253-260` — pressing "Genera consigli" spawns a long AI call; the result is stored in component state. Navigating away (`BrowserRouter` unmounts the page) throws it away. Same for `BooksPage`.
- **Fix approach:** Lift AI results into a context/cache or persist in Supabase with a TTL; even `sessionStorage` would help.

### 30. Supabase query fanout on Notifications

- **File:** `src/components/cinema/NotificationsPage.jsx:15-22` runs two selects; each embeds `profiles(full_name, avatar_url)`. On a user with many suggestions this is fine, but the mark-read follow-ups (lines 28-29) issue one UPDATE per unread row (N+1).
- **Fix approach:** Bulk update with `.in('id', unreadIds).update({ read: true })`.

### 31. Sidebar badge polls every 60s

- **File:** `src/App.jsx:43` — `setInterval(checkUnread, 60000)` runs a full `getSuggestions` (embeds profiles) every minute while tab is open. Prefer Supabase Realtime channels (`supabase.channel(...).on('postgres_changes', ...)`), or count-only `.select('*', { count: 'exact', head: true })`.

### 32. Images not preloaded or sized

- **CinemaPage.jsx:170, 193, 210, 227** — `<img loading="lazy">` is used only on the `watched` grid but not on the discover grids consistently; remote URLs from TMDB/Google Books have no `width`/`height` hint, so layout shift is visible during load. TMDB images should use `srcset` with `w185/w500`.

### 33. No memoization in obvious hot paths

- **CinemaPage.jsx:81-88** — `byStatus`, `watched`, `wishlist`, `displayed` recompute every render. With `useMemo` the grid would re-render only when `watchedMovies` changes.
- **MovieModal.jsx:50-53** — `providers`, `year`, `runtime`, `genres` derivations run on every re-render; again trivially memoizable.

### 34. `main.css` is monolithic

- **File:** `src/styles/main.css` (currently 407 lines committed, with uncommitted modifications in progress). Imported globally from `src/App.jsx:12` at app bootstrap. No CSS modules, no code splitting. Tolerable at current size, but will degrade LCP as it grows.

### 35. No caching layer for third-party APIs

- TMDB discover endpoints (`getTrending`, `getNowPlaying`, `getUpcoming`) are re-fetched every time the `Scopri` tab mounts (`src/components/cinema/CinemaPage.jsx:40-46`). Same for Google Books (`src/components/books/BooksPage.jsx:39-44`). No ETag, no `localStorage` stash, no SWR-style cache.

---

## Documentation

### 36. No `README.md`

- **Evidence:** `ls README*` returns no match. The repo ships with `SETUP.md` (setup guide) and `ANALISI_PROGETTO.md` (self-analysis), but no top-level readme.
- **Impact:** `npm create vite@latest` usually produces one; its absence is unusual and hurts discoverability on GitHub/Vercel.
- **Fix approach:** Add `README.md` with project summary, dev-start, and links to `SETUP.md` and `ANALISI_PROGETTO.md`.

### 37. `SETUP.md` has secret values in it

- Already logged as Security item 2 — but also a doc concern: the step-by-step is good, it just should not keep real secrets inline.

### 38. `ANALISI_PROGETTO.md` is excellent but already documents unresolved criticalities

- **File:** `ANALISI_PROGETTO.md:733-747`. The document itself lists "Testing: None / High severity", "API Keys exposed / High", "Error handling / Medium", "Indentazione mista / Low", "Accessibility / Medium", "No SSR / Low", etc. Treat this table as a pre-computed backlog and promote items into GitHub issues or a `CONCERNS.md`-style tracker. Cross-reference concerns #6, #11, #19, #25, #28 above with that table.
- **Gap in ANALISI_PROGETTO.md:** It does not mention the committed `.env.local` / `SETUP.md` secrets issues, nor the missing `read_books`/`book_suggestions` DDL — those are only visible from the git/filesystem state.

### 39. No inline JSDoc / function-level doc

- **Files:** every file under `src/lib/` and `src/components/`. Functions are reasonably small but none carry doc comments. Acceptable for a small solo project; flag if/when a second contributor joins.

### 40. No architecture diagram in the repo (only in `ANALISI_PROGETTO.md`)

- **File:** `ANALISI_PROGETTO.md:84-100`, `ANALISI_PROGETTO.md:115-161` have the diagrams. Consider cross-linking from `README.md`.

---

## Build / Deploy

### 41. `vercel.json` is minimal and uncovers no caching / headers

- **File:** `vercel.json` (3 lines): `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`.
- **Concerns:**
  - The wildcard rewrites every path — including static asset misses, which *should* be served from `dist/` with strong caching. Vercel's default static handling does the right thing before the rewrite hits, but it is still safer to scope (`"source": "/((?!api/).*)"` once there are APIs, and avoid rewriting real files).
  - No `headers` section: no `Content-Security-Policy`, no `Strict-Transport-Security`, no `X-Frame-Options`, no `Referrer-Policy`, no `Permissions-Policy`. For a user-authenticated app the CSP is important (Supabase auth token lives in `localStorage`, so XSS = account takeover).
- **Fix approach:** Add a `headers` block with a reasonable CSP (at minimum `default-src 'self'; connect-src 'self' https://*.supabase.co https://api.themoviedb.org https://www.googleapis.com https://generativelanguage.googleapis.com https://api.groq.com; img-src 'self' data: https://image.tmdb.org https://books.google.com https://lh3.googleusercontent.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;`), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### 42. Environment-variable posture for production

- **Build-time exposure:** Vite inlines every `VITE_*` variable into the client bundle at build time. On Vercel the env vars should be marked "Production, Preview, Development" separately. `SETUP.md:98-100` tells the user to paste the `.env.local` values into Vercel's dashboard — fine, but it says "le 4 variabili" whereas the code uses **5** (`VITE_GROQ_API_KEY` is consumed by `src/lib/gemini.js:2` but is never mentioned in `SETUP.md`). Users who follow the setup exactly will ship a version where classic movie suggestions (`askGroq`) fail at runtime.
- **Fix approach:** Update `SETUP.md` to list all 5 vars and mark Groq as required for the "classici" tab. Or move secrets to server-side Serverless Functions (concern 6) and stop shipping them at all.

### 43. `vite.config.js` is minimal — no production build hints

- **File:** `vite.config.js:1-6`.
- **Missing (nice-to-haves):**
  - `build.sourcemap: false` in prod to avoid leaking source structure.
  - `build.rollupOptions.output.manualChunks` for vendor splitting.
  - `server.host` for LAN dev (optional).
  - No `base` path — fine for Vercel root deploy, but worth documenting for anyone forking.

### 44. No CI pipeline

- No `.github/workflows/`, no pre-commit hooks. Every deploy relies solely on Vercel's post-push build. A fail-fast CI (type-check + lint + build) would catch the "BooksPage.jsx not committed" kind of error before it hits production.

### 45. Favicon is untracked

- **File:** `favicon.svg` exists at root, referenced by `index.html:5`, but `git status` lists it as untracked. A fresh clone would render without a favicon and `vite build` would still succeed, but the deployed site gets a 404 for `/favicon.svg` until the file is committed.

### 46. `index.html` lacks meta tags

- **File:** `index.html:1-16`. Missing `<meta name="description">`, `<meta property="og:*">`, `<meta name="theme-color">`, manifest link. The `SETUP.md:131-137` description calls the app a PWA, but there is no `manifest.webmanifest`, no service worker, no `apple-touch-icon`. PWA claim is aspirational.

### 47. Supabase client keeps session in `localStorage`

- **File:** `src/lib/supabase.js:6-13` — `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`. Default Supabase behaviour stores the JWT in `localStorage`. Combined with the absent CSP (concern 41) and the lack of an Error Boundary / sanitisation layer, an XSS would exfiltrate sessions trivially. CSP is the primary mitigation.

---

## Priority Summary (for triage)

| Concern | Severity | Effort | Ticket-worthy? |
|---|---|---|---|
| #1 `.env.local` tracked | Critical | Low (rotate + history rewrite) | Immediate |
| #2 `SETUP.md` has secrets | Critical | Low | Immediate |
| #6 Gemini/Groq keys in client | High | Medium (serverless) | Next phase |
| #7 RLS gaps, missing tables in schema | Critical | Medium | Immediate |
| #4 `node_modules` tracked | High | Low | Immediate |
| #10 broken working tree (BooksPage untracked yet imported) | High | Low | Immediate |
| #11 No lint/test/types | Medium | Medium | Ongoing |
| #19 Error handling gaps in `src/lib` | Medium | Medium | Next phase |
| #41 No CSP/headers on Vercel | Medium | Low | Next phase |
| #25 Large multi-concern components | Medium | High | Backlog |
| #26 Unidirectional friendships | Medium | Low | Backlog |
| #28 No code splitting | Low | Low | Backlog |
| #33 No memoization | Low | Low | Backlog |
| #36 No README | Low | Low | Backlog |

---

*Concerns audit: 2026-04-22*
