# ARCHITECTURE — cinematica

**Last updated:** 2026-04-22

## Pattern Overview

**Overall:** Client-only SPA on Backend-as-a-Service. Vite builds a static React 18 bundle; persistence, auth, and authorization live in Supabase (Postgres + Auth + RLS). External APIs (TMDB, Google Books) and LLM APIs (Gemini, Groq) are called directly from the browser with `VITE_*` env keys bundled into the client.

**Key characteristics:**

- No backend server — `vite.config.js` has only `@vitejs/plugin-react`; `vercel.json` rewrites every route to `/index.html`.
- Two-tier layering: components (`src/components/**`) → service namespaces in `src/lib/**` → third-party SDKs/REST.
- Authorization delegated to Postgres via RLS (see `supabase_schema.sql`); the client never checks permissions itself.
- Auth state centralized in one React context (`AuthProvider` in `src/hooks/useAuth.jsx`); no Redux/Zustand/React Query — each page owns its fetches with `useState` + `useEffect`.
- Three product verticals share one shell: Cinema, Libri, Viaggi (placeholder `ComingSoon` inline in `src/App.jsx`).
- All user-facing copy is Italian; code identifiers are English.
- All API keys are `VITE_*` public-by-design (personal/trusted-user app).

## Layers

**UI / Pages** (route-level orchestrators):
- `src/components/cinema/CinemaPage.jsx`
- `src/components/cinema/NotificationsPage.jsx`
- `src/components/cinema/ProfilePage.jsx`
- `src/components/books/BooksPage.jsx`
- `src/components/auth/LoginPage.jsx`

Each holds tab/search/list state, calls `db`/`tmdb`/`googleBooks`/`ai`, emits toasts, opens modals.

**UI / Modals** (detail overlays):
- `src/components/cinema/MovieModal.jsx`
- `src/components/books/BookModal.jsx`

Receive an id + `onUpdate` callback; fetch entity detail + friends; offer rate/favorite/send-suggestion/AI-plot/AI-similar actions.

**UI / Layout & Shared:**
- `src/components/layout/Sidebar.jsx` — fixed icon nav + unread badge
- `src/components/shared/Toast.jsx` — `ToastProvider` + `useToast()`, 3 s auto-dismiss

**Hooks / State:**
- `src/hooks/useAuth.jsx` — `AuthProvider` + `useAuth()`. Subscribes to `supabase.auth.onAuthStateChange`, strips OAuth hash from URL, upserts a `profiles` row on every session (`syncProfile`).

**Service layer (`src/lib/`):**

| File | Exports | Purpose |
|---|---|---|
| `src/lib/supabase.js` | `supabase`, `signInWithGoogle`, `signOut`, `getUser` | `createClient` with `flowType: 'pkce'`, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` |
| `src/lib/db.js` | `db` | Object literal wrapping every Supabase table call (watched_movies, friendships, movie_suggestions, profiles, read_books, book_suggestions). Every method takes `userId` explicitly. No caching. |
| `src/lib/tmdb.js` | `tmdb` | REST calls to `api.themoviedb.org/3` (search, getMovie with `append_to_response=credits,watch/providers,similar,videos,release_dates`, now_playing, upcoming, trending, popular) + `posterUrl`, `backdropUrl`, `getWatchProviders` |
| `src/lib/googlebooks.js` | `googleBooks` | search / getBook / getTrending / getNewReleases / searchByAuthor against `googleapis.com/books/v1`. Private `formatBook()` normalizes items and forces `http://` → `https://` on covers |
| `src/lib/gemini.js` | `ai` | Hybrid LLM: private `askGroq` (llama-3.3-70b), `askGemini` (gemini-2.5-flash), `parseJSON(text, fallback)`. Methods: `getFullPlot` (Gemini → Groq fallback), `getPersonalizedSuggestions` (Groq=classics, Gemini=recent with Groq fallback via `Promise.allSettled`), `getSimilarMovies`, `getSimilarBooks`, `getPersonalizedBookSuggestions` |

## Data Flow — "user marks a movie as watched"

1. In `src/components/cinema/CinemaPage.jsx`, `handleSearch(q)` calls `tmdb.search(q)`.
2. User clicks "✓ Visto" → `handleAddWatched(movie)` calls `db.addWatchedMovie(user.id, movie)`.
3. `db.addWatchedMovie` does `supabase.from('watched_movies').upsert({...}, { onConflict: 'user_id,movie_id' })`.
4. Supabase enforces the `watched_insert` RLS policy (`auth.uid() = user_id`).
5. `CinemaPage` calls `toast(...)` then `loadWatched()` which re-queries `db.getWatchedMovies(user.id)` and replaces local state.

## Data Flow — "friend suggestion notification"

1. `MovieModal#handleSend` calls `db.sendSuggestion(fromUserId, toUserId, movie, comment)` → insert into `movie_suggestions`.
2. Recipient's `src/App.jsx#AppShell` runs `setInterval(checkUnread, 60000)` polling `db.getSuggestions(user.id)`, passes `unreadCount` to `Sidebar`.
3. `/notifications` → `NotificationsPage` fetches `db.getSuggestions` + `db.getBookSuggestions`, merges by `created_at`, and immediately calls `db.markSuggestionRead` / `db.markBookSuggestionRead` for every unread row.

## State Management

- Global: two React contexts — `AuthContext` (user, loading) in `src/hooks/useAuth.jsx`, and `ToastContext` (`addToast`) in `src/components/shared/Toast.jsx`.
- Per-page: plain `useState` + `useEffect`. No React Query / SWR.
- Cross-page refresh: parents pass `onUpdate` / `onRead` callbacks to children (e.g. `MovieModal` receives `onUpdate={loadWatched}`).
- Polling: `AppShell` polls unread count every 60 s. **No Supabase Realtime subscriptions** are used — no `supabase.channel(` / `.on(` / `.subscribe(` call appears in `src/`.

## Key Abstractions

- **`db` namespace** (`src/lib/db.js`): plain object literal with async methods. Reads return `data || []`; writes return `{ data, error }`. Groups: watched movies, friends, movie suggestions, profile, read_books, book_suggestions.
- **`tmdb` / `googleBooks` namespaces**: URL-helper + REST wrapper with no retry logic.
- **`ai` namespace**: hybrid Gemini+Groq orchestrator; private helpers closed over the module; prompts inline per method, all Italian, all enforcing JSON-only output.
- **Modal pattern**: parent holds `selectedXxxId` state; opens modal when truthy; `onClose` clears it; `onUpdate` triggers a refetch.

## Routing Topology

Defined in `src/App.jsx` using `react-router-dom` v6 `BrowserRouter`:

| Path | Element | Auth gate |
|---|---|---|
| `/` | `<Navigate to="/cinema" replace />` | gated |
| `/cinema` | `CinemaPage` (tabs: "I miei film" / "Scopri" / "Consigli AI") | gated |
| `/books` | `BooksPage` (tabs: "I miei libri" / "Scopri" / "Consigli AI") | gated |
| `/travel` | inline `ComingSoon` placeholder | gated |
| `/notifications` | `NotificationsPage` (movie + book suggestions merged) | gated |
| `/profile` | `ProfilePage` | gated |

Gating is at `AppShell` level: `if (!user) return <LoginPage />`. No route-level guards, no public routes. The top-bar (avatar link to `/profile` + sign-out button) lives **inline in `src/App.jsx`**, not in `Sidebar.jsx`.

## Entry Points

- `index.html` (repo root): loads Google Fonts (DM Serif Display, DM Sans), mounts `<div id="root">`, imports `/src/main.jsx` as module. `<title>` is "Your Next" (brand shown on login is "YourNext ❤️"; folder/schema name is "cinematica").
- `src/main.jsx`: `ReactDOM.createRoot(...).render(<StrictMode><App /></StrictMode>)`.
- `src/App.jsx`: wrapping order `BrowserRouter` → `AuthProvider` → `ToastProvider` → `AppShell`. `AppShell` renders either `<LoginPage />` or `<Sidebar /> + top-bar + <Routes>`.

## Error Handling

- No React error boundary.
- Supabase writes return `{ data, error }`; only `ProfilePage#handleAddFriend` actually inspects `error` (logs + error toast). Every other writer ignores errors.
- Most `db.*` reads swallow errors: `return data || []`.
- LLM calls in `src/lib/gemini.js` use `try { ... } catch {}` to silently fall back Gemini → Groq; non-OK HTTP throws after `console.error`.
- `tmdb.js` and `googlebooks.js` have no try/catch — failures leave loading spinners hanging in the UI.

## Cross-Cutting Concerns

- **Authentication:** Google OAuth via Supabase with PKCE. `useAuth.jsx` strips the OAuth hash from the URL on return. `signInWithGoogle` / `signOut` imported directly from `src/lib/supabase.js`, not through the hook.
- **Authorization:** RLS policies in `supabase_schema.sql`.
- **Logging:** `console.error` / `console.log` only.
- **Validation:** DB-level `CHECK (rating >= 1 AND rating <= 5)` on `watched_movies.rating`. No client-side schema validation.
- **Styling:** single global stylesheet `src/styles/main.css` imported once in `src/App.jsx`. Components heavily mix `className` with inline `style={{...}}`.
- **Icons:** `lucide-react` everywhere.
- **Dates:** `date-fns` is in `package.json` but visible usages use native `Date#toLocaleDateString('it-IT', ...)` (e.g. `NotificationsPage.jsx`).

## Supabase Data Model (from `supabase_schema.sql`)

Tables in the DDL file:

| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | `id UUID` FK→`auth.users(id)`, `email`, `full_name`, `avatar_url`, `created_at` | Public profile mirror of auth user |
| `watched_movies` | `id`, `user_id` FK, `movie_id` (TMDB int), `movie_title`, `movie_poster`, `movie_year`, `movie_genres JSONB`, `rating 1..5`, `is_favorite`, `created_at`; `UNIQUE(user_id, movie_id)` | One row per (user, movie) |
| `friendships` | `user_id`, `friend_id`; `UNIQUE(user_id, friend_id)` | Directed edges — no reciprocal insert |
| `movie_suggestions` | `from_user_id`, `to_user_id`, `movie_id`, `movie_title`, `movie_poster`, `movie_year`, `comment`, `read`, `created_at` | Inter-user movie recs |

### Schema drift — tables used by code but NOT in `supabase_schema.sql`

- **`read_books`** — touched by `db.getReadBooks`, `addReadBook`, `removeReadBook`, `updateBookStatus`, `updateBookProgress`, `updateBookRating`, `toggleBookFavorite`. Columns used in `src/lib/db.js`: `user_id`, `book_id`, `book_title`, `book_cover`, `book_year`, `book_authors`, `book_pages`, `status`, `current_page`, `is_favorite`, `rating`, `created_at`.
- **`book_suggestions`** — touched by `db.sendBookSuggestion`, `getBookSuggestions`, `markBookSuggestionRead`. Columns: `from_user_id`, `to_user_id`, `book_id`, `book_title`, `book_cover`, `book_authors`, `comment`, `read`, `created_at`.
- Additionally, `db.addWatchedMovie` / `db.addToWishlist` write a `status` column to `watched_movies` that is **not declared** in `supabase_schema.sql`.

These must exist in the live Supabase instance but their DDL/RLS is not checked in. Reconcile before adding more schema changes.

### Relationships

- `profiles.id` 1:1 `auth.users.id` (ON DELETE CASCADE).
- `watched_movies.user_id`, `friendships.user_id` / `friend_id`, `movie_suggestions.from_user_id` / `to_user_id` — all N:1 `auth.users.id` (cascade-delete).
- `db.getSuggestions` uses PostgREST nested select `select('*, profiles(full_name, avatar_url)')` — this requires a FK from `movie_suggestions.from_user_id` → `profiles.id` (or PostgREST relationship inference); the SQL file only declares FKs to `auth.users`, so an implicit or dashboard-configured FK to `profiles` is relied upon.

### RLS policies in `supabase_schema.sql`

- `profiles`: SELECT any authenticated; INSERT/UPDATE gated by `auth.uid() = id`.
- `watched_movies`: full CRUD restricted to owner.
- `friendships`: SELECT + INSERT restricted to owner. **No UPDATE/DELETE policy** → unfriending cannot go through RLS as declared.
- `movie_suggestions`: SELECT to both sender and recipient; INSERT only by sender; UPDATE only by recipient (used to flip `read`).
- **No policies declared** for `read_books` or `book_suggestions` (must be set in the Supabase dashboard).

### Triggers

- `on_auth_user_created` AFTER INSERT on `auth.users` runs `handle_new_user()` which upserts a row into `profiles`. This means `syncProfile` in `useAuth.jsx` is a redundant safety net.
