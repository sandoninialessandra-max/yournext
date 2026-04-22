# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Backend-as-a-Service (auth + database):**
- Supabase — primary backend. Used for Google OAuth login, session persistence, Postgres CRUD, and a `profiles` trigger that syncs rows from `auth.users`.
  - SDK/Client: `@supabase/supabase-js` `^2.39.0`
  - Client construction: `src/lib/supabase.js` (`createClient(url, anonKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, flowType: 'pkce' } })`)
  - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Schema: `supabase_schema.sql` (tables `profiles`, `watched_movies`, `friendships`, `movie_suggestions`; RLS policies for each; `handle_new_user` trigger on `auth.users` insert).
  - Schema drift to address: `src/lib/db.js` also reads/writes `read_books` and `book_suggestions`, but these tables are not declared in `supabase_schema.sql`.
  - Auth helpers: `signInWithGoogle`, `signOut`, `getUser` exported from `src/lib/supabase.js`.

**Movie data API:**
- TMDB (The Movie Database) — film metadata, posters, backdrops, credits, watch providers, similars, videos, release dates.
  - SDK/Client: raw `fetch` (no SDK)
  - Client wrapper: `src/lib/tmdb.js` — base URL `https://api.themoviedb.org/3`, image base `https://image.tmdb.org/t/p`.
  - Env var: `VITE_TMDB_API_KEY` (passed as `api_key` query string on every call).
  - Endpoints used: `/search/movie`, `/movie/{id}` (with `append_to_response=credits,watch/providers,similar,videos,release_dates`), `/movie/now_playing`, `/movie/upcoming`, `/trending/movie/week`, `/movie/popular`. Region locked to `IT` for now_playing / upcoming; language `it-IT` on all calls.
  - Helpers: `posterUrl`, `backdropUrl`, `getWatchProviders` (extracts `watch/providers.results.IT`).

**Book data API:**
- Google Books (public, unauthenticated) — book search, volume details, trending, new releases, author lookup.
  - SDK/Client: raw `fetch` (no SDK)
  - Client wrapper: `src/lib/googlebooks.js` — base URL `https://www.googleapis.com/books/v1`.
  - Env var: none (no API key used; relies on Google Books' anonymous quota).
  - Endpoints used: `/volumes?q=...`, `/volumes/{id}`, `/volumes?q=subject:fiction&orderBy=relevance`, `/volumes?q=subject:fiction+inpublisher:{year}&orderBy=newest`, `/volumes?q=inauthor:{author}`.
  - Results are normalized by `formatBook(item)` (coerces `imageLinks.thumbnail` to HTTPS, extracts authors, year, pages, description, categories, publisher, averageRating).

**AI — generative (primary):**
- Google Gemini (`gemini-2.5-flash`) — generates full movie plots, personalized movie/book suggestions, and similar-title recommendations.
  - SDK/Client: raw `fetch` against `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={VITE_GEMINI_API_KEY}`
  - Client wrapper: `src/lib/gemini.js` (`askGemini(prompt)`) with `generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }`.
  - Env var: `VITE_GEMINI_API_KEY`
  - Called from: `src/components/cinema/CinemaPage.jsx`, `src/components/cinema/MovieModal.jsx`, `src/components/books/BooksPage.jsx`, `src/components/books/BookModal.jsx` (all via `import { ai } from '../../lib/gemini.js'`).

**AI — generative (secondary / fallback):**
- Groq (`llama-3.3-70b-versatile`) — used for classic-film prompts and as a fallback when Gemini fails or returns "Trama non disponibile".
  - SDK/Client: raw `fetch` against `https://api.groq.com/openai/v1/chat/completions` with `Authorization: Bearer {VITE_GROQ_API_KEY}`.
  - Client wrapper: `src/lib/gemini.js` (`askGroq(prompt)`) with `max_tokens: 1024, temperature: 0.8`.
  - Env var: `VITE_GROQ_API_KEY` — NOT present in `.env.example`; this is a documentation gap to surface in CONCERNS.
  - Routing logic in `src/lib/gemini.js`:
    - `ai.getFullPlot(movie)` — try Gemini first, fall back to Groq.
    - `ai.getPersonalizedSuggestions(...)` — Groq for classics, Gemini (with Groq fallback) for recent + upcoming.
    - `ai.getSimilarMovies(...)` / `ai.getSimilarBooks(...)` — Gemini first, Groq fallback.
    - `ai.getPersonalizedBookSuggestions(...)` — Groq for classics, Gemini (with Groq fallback) for recent.

## Data Storage

**Databases:**
- PostgreSQL (hosted by Supabase)
  - Connection: through `@supabase/supabase-js` only, using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. No direct `pg` / `postgres` / Prisma / Drizzle client.
  - Access layer: `src/lib/db.js` exports a `db` object with named methods wrapping `supabase.from(...)` queries. Consumers: `src/hooks/useAuth.jsx`, `src/App.jsx`, every component under `src/components/cinema/` and `src/components/books/`, and `src/components/cinema/ProfilePage.jsx`.
  - Tables referenced by code: `profiles`, `watched_movies`, `friendships`, `movie_suggestions`, `read_books`, `book_suggestions`.
  - RLS: enabled for the four tables declared in `supabase_schema.sql`; policies restrict rows to the authenticated owner (and, for suggestions, to sender/recipient).

**File Storage:**
- None — the app does not use Supabase Storage, S3, or any CDN upload. Avatar URLs are taken directly from the OAuth provider (`user.user_metadata.avatar_url` in `src/hooks/useAuth.jsx` and `src/App.jsx`). Poster/cover URLs come from TMDB/Google Books.

**Caching:**
- None — no Redis, no TanStack Query, no service worker, no HTTP caching layer. All data is fetched ad hoc from components.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Google OAuth (PKCE flow).
  - Implementation: `src/lib/supabase.js` exports `signInWithGoogle`, `signOut`, `getUser`. OAuth is initiated via `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, skipBrowserRedirect: false } })`.
  - Session lifecycle: `src/hooks/useAuth.jsx` subscribes to `supabase.auth.onAuthStateChange`, populates React context with `{ user, loading }`, and runs `syncProfile(user)` on every auth event to upsert the `profiles` row.
  - Post-login URL cleanup: `useAuth.jsx` strips the `access_token` fragment via `window.history.replaceState`.
  - Server-side sync: `handle_new_user` trigger in `supabase_schema.sql` auto-creates a `profiles` row when `auth.users` is inserted.
  - Login UI: `src/components/auth/LoginPage.jsx` renders "Continua con Google" and calls `signInWithGoogle`.

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, Rollbar, or LogRocket integration. Errors are surfaced via `console.error` (e.g. `src/lib/gemini.js` on Groq/Gemini failures, `src/hooks/useAuth.jsx` on profile sync failures).

**Logs:**
- `console.log` / `console.error` only. Notable noisy call: `console.log('Gemini response:', JSON.stringify(data))` in `src/lib/gemini.js` (logs every Gemini response body to the browser console).

## CI/CD & Deployment

**Hosting:**
- Vercel — static hosting of the Vite build. Configured by `vercel.json` with a SPA rewrite to `/index.html` for all paths. `SETUP.md` STEP 7 documents the manual Vercel import + env var configuration flow.

**CI Pipeline:**
- None detected — no `.github/workflows/`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, or `circleci/` config in the repo. Deployment is driven by Vercel's Git integration.

## Environment Configuration

**Required env vars (prefixed `VITE_` to reach the client bundle):**
- `VITE_SUPABASE_URL` — Supabase project URL (read in `src/lib/supabase.js`).
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (read in `src/lib/supabase.js`).
- `VITE_TMDB_API_KEY` — TMDB v3 API key (read in `src/lib/tmdb.js`).
- `VITE_GEMINI_API_KEY` — Google AI Studio API key (read in `src/lib/gemini.js`).
- `VITE_GROQ_API_KEY` — Groq API key (read in `src/lib/gemini.js`). Not present in `.env.example` — configuration drift.

**Secrets location:**
- Local development: `.env.local` at repo root (gitignored).
- Production: Vercel project environment variables (per `SETUP.md`).
- All keys are shipped to the browser because of the `VITE_` prefix — there is no server-side proxy. Any per-request quota (TMDB, Gemini, Groq) is exposed to end users in the built JavaScript.

## Webhooks & Callbacks

**Incoming:**
- OAuth redirect from Google/Supabase back to `window.location.origin` (the SPA itself). Handled client-side by `supabase.auth.getSession()` in `src/hooks/useAuth.jsx`; the URL hash is cleaned afterward.
- No application-defined webhook endpoints (this is a static SPA — there are no serverless functions or API routes in the repo).

**Outgoing:**
- All outbound traffic is client-initiated:
  - `@supabase/supabase-js` → Supabase REST/Auth endpoints.
  - `fetch` → TMDB (`api.themoviedb.org/3`, `image.tmdb.org/t/p`).
  - `fetch` → Google Books (`googleapis.com/books/v1`).
  - `fetch` → Gemini (`generativelanguage.googleapis.com/v1beta/...`).
  - `fetch` → Groq (`api.groq.com/openai/v1/chat/completions`).
  - External stylesheet/font: `fonts.googleapis.com`, `fonts.gstatic.com` (loaded via `<link>` in `index.html`).

---

*Integration audit: 2026-04-22*
