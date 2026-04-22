# Coding Conventions — cinematica

**Last updated:** 2026-04-22

## Language & Module System

**JavaScript only — no TypeScript.**

- All source files are `.jsx` (React) or `.js` (libs). No `.ts` / `.tsx` anywhere in `src/`.
- `@types/react` and `@types/react-dom` are listed in `package.json:20-21` devDependencies purely for IDE IntelliSense — there is no `tsconfig.json`, no type-check step, and no static typing.
- ES modules throughout (`"type": "module"` in `package.json:5`). All imports use `import … from '…'` with explicit `.js` / `.jsx` extensions (e.g., `src/App.jsx:3` → `from './hooks/useAuth.jsx'`; `src/components/cinema/CinemaPage.jsx:3` → `from '../../lib/tmdb.js'`). Preserve this extension-in-specifier style for new files.

## Naming Patterns

### Files

- React components: `PascalCase.jsx` — `LoginPage.jsx`, `CinemaPage.jsx`, `MovieModal.jsx`, `BookModal.jsx`, `BooksPage.jsx`, `NotificationsPage.jsx`, `ProfilePage.jsx`, `Sidebar.jsx`, `Toast.jsx`.
- Library modules (non-components): `lowercase.js` — `src/lib/db.js`, `src/lib/supabase.js`, `src/lib/tmdb.js`, `src/lib/gemini.js`, `src/lib/googlebooks.js`.
- Custom hooks: `useXxx.jsx` — only `src/hooks/useAuth.jsx`. It exports both the hook (`useAuth`) and a provider component (`AuthProvider`), hence `.jsx`.

### Directories

Lowercase, domain-grouped: `src/components/{auth,cinema,books,layout,shared}/`, `src/hooks/`, `src/lib/`, `src/styles/`.

### Components

- `PascalCase` function name matching filename. Each component declared with `export default function ComponentName(...)` — `src/components/cinema/CinemaPage.jsx:12`, `src/components/cinema/MovieModal.jsx:11`, `src/components/auth/LoginPage.jsx:3`, `src/components/layout/Sidebar.jsx:6`.
- Inline helper components are `PascalCase`: `ComingSoon` at `src/App.jsx:18`, `StarRating` at `src/components/books/BookModal.jsx:9`.

### Variables & functions

- `camelCase` for locals/functions — `loadWatched`, `handleSearch`, `handleAddWatched`, `handleAiMovieClick` at `src/components/cinema/CinemaPage.jsx:30,48,57,73`.
- `handleX` prefix is the consistent event-handler pattern (`handleFullPlot`, `handleSimilar`, `handleSend`, `handleFavorite`, `handleRating`, `handleToggleWatched` in `src/components/cinema/MovieModal.jsx:55-99`).
- `loadX` prefix for async data loaders wrapped in `useCallback` (`loadWatched` at `src/components/cinema/CinemaPage.jsx:30`, `loadBooks` at `src/components/books/BooksPage.jsx:29`).
- Module-level constants: `SCREAMING_SNAKE_CASE` — `TMDB_BASE`, `TMDB_KEY`, `TMDB_IMG` at `src/lib/tmdb.js:1-3`; `GROQ_KEY`, `GROQ_URL`, `GEMINI_KEY`, `GEMINI_URL` at `src/lib/gemini.js:2-7`; `TMDB_LOGO` at `src/components/cinema/MovieModal.jsx:9`; `BOOKS_BASE` at `src/lib/googlebooks.js:1`.
- UI tab arrays use Italian strings as both label and state value: `const TABS = ['I miei film', 'Scopri', 'Consigli AI']` (`src/components/cinema/CinemaPage.jsx:10`; same at `BooksPage.jsx:10`).

### Props

- `camelCase`, destructured in the function signature — `function MovieModal({ movieId, onClose, watchedMovies, onUpdate })` at `src/components/cinema/MovieModal.jsx:11`, `function Sidebar({ unreadCount = 0 })` at `src/components/layout/Sidebar.jsx:6`, `function NotificationsPage({ onRead })` at `src/components/cinema/NotificationsPage.jsx:7`.
- Callback props: `on` + `PascalVerb` — `onClose`, `onUpdate`, `onRead`, `onChange`.

### Database rows

`snake_case` Supabase fields are used unchanged in JSX — `m.movie_id`, `m.movie_title`, `m.movie_poster`, `m.is_favorite`, `s.profiles?.full_name`, `s.created_at`. There is **no camelCase adapter layer**; Supabase shapes leak straight into components.

## JSX Style

- Function components only. No class components.
- Default export per component. Only `Toast.jsx` (`src/components/shared/Toast.jsx:5`) and `useAuth.jsx` (`src/hooks/useAuth.jsx:7`) use named exports for Provider + companion hook.
- Double quotes for JSX string attributes, `{…}` for expressions.
- No PropTypes, no TypeScript props — prop shapes are implicit and discovered by reading the caller.
- Ternaries and short-circuits are the standard conditional-render idiom and are often nested 2–3 levels deep — `src/components/cinema/CinemaPage.jsx:158-181` (loading ? empty ? grid), `src/components/cinema/MovieModal.jsx:142-179` (nested fragments gated by `!watched`, `watched?.status === 'wishlist'`, `watched && watched.status !== 'wishlist'`).
- Keys on lists: `key={m.id}`, `key={m.movie_id}`, `key={f.friend_id}`, or `key={i}` for AI-suggestion lists (`src/components/cinema/CinemaPage.jsx:268`). Index keys are tolerated for ephemeral AI output; avoided for DB-backed lists.

## Component Patterns

- Every page component is a single function: state → derived values → handlers → one large `return (…)` JSX tree. No extraction into sub-files; large pages are 300+ lines (`CinemaPage.jsx` 336, `MovieModal.jsx` 341, `BookModal.jsx` 311, `BooksPage.jsx` 319).
- State pattern: many `useState` hooks at the top, one per concern, rather than `useReducer` (15+ `useState` calls in `CinemaPage.jsx` and `MovieModal.jsx`). See `src/components/cinema/CinemaPage.jsx:15-28`.
- Data loading: `useCallback` wrapping an async loader + `useEffect` with that loader in its deps — `src/components/cinema/CinemaPage.jsx:30-38`, `src/components/books/BooksPage.jsx:29-37`. Loader sets a `loadingXxx` flag, reads via `db.getXxx`, calls `setX(data)`, clears the flag.
- Global context: `AuthProvider` (`src/hooks/useAuth.jsx:7`) and `ToastProvider` (`src/components/shared/Toast.jsx:5`) wrap the app in `src/App.jsx:90-97`. Consumers: `useAuth()` → `{ user, loading }`; `useToast()` → the `addToast(msg, type)` function directly.
- Modals: rendered conditionally inline at the bottom of a page based on a `selectedXxxId` state (`src/components/cinema/CinemaPage.jsx:327-334`). Closing sets the id to `null`. Overlay + inner `onClick={e => e.stopPropagation()}` is the dismiss pattern (`src/components/cinema/MovieModal.jsx:109-110`).
- Polling: `setInterval` inside `useEffect` with cleanup is used for unread-count refresh (`src/App.jsx:36-45`, 60-second interval).

## Hooks Usage

- `useState`, `useEffect`, `useCallback`, `useContext`, `createContext` — entire hook surface. **No `useMemo`, `useReducer`, `useRef`**, and no custom hooks beyond `useAuth` and `useToast`.
- `useEffect` deps are occasionally incomplete (e.g., `src/components/cinema/NotificationsPage.jsx:32` omits `onRead`; `src/components/cinema/MovieModal.jsx:35` includes `movieId, user` but the handler closes over `watchedMovies`). Without ESLint `react-hooks/exhaustive-deps`, these drift silently.

## CSS / Styling Approach

**Single global stylesheet: `src/styles/main.css` (~407 lines).**

- Imported once at `src/App.jsx:12` (`import './styles/main.css'`). No CSS Modules, no styled-components, no Tailwind, no CSS-in-JS library.
- Design tokens as CSS custom properties on `:root` — `src/styles/main.css:3-27` (`--bg`, `--bg2..bg4`, `--surface`, `--border`, `--accent`, `--text`, `--text2`, `--text3`, `--radius`, `--radius-sm`, `--shadow`, `--font-display`, `--font-body`, `--transition`). Component code references these via `var(--…)` — never hard-coded hex.
- Class naming: **hyphenated-kebab with a component prefix**, NOT BEM — `.app-shell`, `.sidebar`, `.nav-item`, `.nav-logo`, `.nav-tooltip`, `.page-header`, `.page-title`, `.page-subtitle`, `.movies-grid`, `.movie-card`, `.movie-card-poster`, `.movie-card-body`, `.movie-card-title`, `.movie-card-year`, `.movie-card-badge`, `.movie-card-fav`, `.empty-state`, `.empty-state-icon`, `.toast-container`, `.search-bar`, `.search-bar-icon`, `.ai-card`, `.suggestion-card`, `.suggestion-poster`.
- Modifier pattern: chained classes, no underscores — `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-lg`, `.btn-icon` (`src/styles/main.css:190-207`). Combined inline as `` `btn btn-sm ${subTab === 'watched' ? 'btn-primary' : 'btn-secondary'}` `` (`src/components/cinema/CinemaPage.jsx:107`). State modifiers: `.active`, `.unread`, `.coming-soon` applied alongside the base class.
- **Inline styles are heavily used** for layout tweaks that would otherwise need one-off classes. Nearly every JSX block contains `style={{ … }}` with flex/gap/padding/fontSize/color overrides (dozens per page in `CinemaPage.jsx`, `MovieModal.jsx`, `ProfilePage.jsx`). The de facto rule: reusable visual concepts get a class in `main.css`; one-off spacing goes inline.
- Utilities: `.scroll-page`, `.scroll-x`, `.section`, `.section-title`, `.tabs`, `.tab` are layout helpers shared across pages.
- Responsive: viewport-unit clamps for headings (`font-size: clamp(28px, 4vw, 42px)` at `src/styles/main.css:123`) and auto-fill grids (`grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))` at `src/styles/main.css:140`). No sampled media-query breakpoints.

## Import Organization

Observed order (consistently followed — `src/components/cinema/CinemaPage.jsx:1-8`, `src/components/cinema/MovieModal.jsx:1-7`, `src/components/books/BooksPage.jsx:1-8`, `src/components/books/BookModal.jsx:1-7`):

1. **React hooks** — `import { useState, useEffect, useCallback } from 'react'`
2. **Third-party libs** — `lucide-react` icons, `react-router-dom`
3. **Internal `lib/` modules** (relative paths) — `../../lib/tmdb.js`, `../../lib/db.js`, `../../lib/gemini.js`, `../../lib/supabase.js`
4. **Internal hooks** — `../../hooks/useAuth.jsx`
5. **Sibling / shared components** — `../shared/Toast.jsx`, `./MovieModal.jsx`, `./BookModal.jsx`

No path aliases in `vite.config.js:1-6`. All imports are deep relative paths and always include the extension.

## State Patterns

- **Local UI state**: `useState` at the top of each component, one field per concern.
- **Shared session state (auth)**: `AuthContext` via `createContext(null)` at `src/hooks/useAuth.jsx:5`; consumed with `useAuth()`.
- **Shared transient state (toasts)**: `ToastContext` at `src/components/shared/Toast.jsx:3`; the context value is the `addToast` callback itself (not an object), so consumers do `const toast = useToast(); toast('message', 'success')`.
- **Derived state**: computed inline on each render, never memoized — `byStatus` helper at `src/components/cinema/CinemaPage.jsx:81-83`, `displayed` at line 86, `watched` / `wishlist` at 84-85.
- **No global store** — no Redux, Zustand, Jotai, Recoil, or React Query. Every page re-fetches on mount; no cache layer between components and the network.

## Error Handling

- **`src/lib/db.js`** mostly returns `{ data, error }` from Supabase and does **not throw**. Callers typically ignore `error` (`src/components/cinema/CinemaPage.jsx:58` discards the return value of `await db.addWatchedMovie(...)`). The only places `error` is inspected are `src/components/cinema/ProfilePage.jsx:30-35` (friend-add) and `src/hooks/useAuth.jsx:39` (profile sync — logs only).
- **`src/lib/tmdb.js`, `src/lib/googlebooks.js`** do not check `res.ok`; they blindly call `res.json()` and default to `data.results || []` / `data.items || []`. A 500 response silently yields an empty list.
- **`src/lib/gemini.js`** is the only layer that throws. `askGroq` throws on `!res.ok` (line 24); `askGemini` throws on `!res.ok` (line 41). Callers wrap those in `try { … } catch {}` and silently fall through to a fallback provider — `getFullPlot` at `src/lib/gemini.js:68-75`, `getSimilarMovies` at `src/lib/gemini.js:130-138`. The empty `catch {}` (no logging, no user feedback) is the deliberate "fail-silent, try the other LLM" idiom.
- **UI-level feedback**: successes and most user-actionable errors go through `toast(message, 'success' | 'error')` — `src/components/cinema/CinemaPage.jsx:59,67,78`, `src/components/cinema/ProfilePage.jsx:33,36`. There is **no React error boundary** anywhere in the tree — an uncaught render error blanks the whole app.
- **JSON parsing**: `parseJSON(text, fallback)` in `src/lib/gemini.js:47-51` strips triple-backtick fences and catches `SyntaxError` to return the fallback. Sole defensive parsing utility.
- **Console logging** is ad-hoc — `console.error('Profile sync error:', error)` at `src/hooks/useAuth.jsx:39`, `console.error('Groq error:', …)` at `src/lib/gemini.js:24`, `console.log('Gemini response:', …)` at `src/lib/gemini.js:43` (left in production code). No logging abstraction.

## Async Patterns

- `async`/`await` dominates — event handlers, library functions, effects.
- `.then()` is used only in three places: (a) `useEffect` bodies where the outer callback isn't async (`src/components/cinema/CinemaPage.jsx:42-44` — `tmdb.getTrending().then(setTrending)`), (b) Supabase session boot (`src/hooks/useAuth.jsx:13`), (c) `Promise.all([…]).then(([a, b]) => …)` at `src/components/cinema/NotificationsPage.jsx:15-32`.
- Parallel async: `Promise.allSettled([askGroq(…), askGemini(…).catch(() => askGroq(…))])` is the go-to for LLM calls with fallback (`src/lib/gemini.js:105-108,182-185`).

## Comments

- Sparse, mostly Italian, used as section dividers inside large files — `// ── LIBRI ──────────────` at `src/lib/db.js:134`, `// Watched movies` / `// Friend suggestions` banners at lines 4 and 64 of the same file, `// Subtoggle` / `// Search` / `// Grid` at `CinemaPage.jsx:105,120,157`, and `{/* Hero backdrop */}` / `{/* Action buttons */}` / `{/* Rating */}` / `{/* Overview */}` / `{/* Where to watch */}` / `{/* TMDB Similar */}` / `{/* AI Similar */}` in `MovieModal.jsx`.
- No JSDoc/TSDoc — zero docblock comments on exported functions.
- `src/lib/gemini.js:57-61` contains commented-out prompt variants left as a historical record.

## Function Design

- Library functions on `db` / `tmdb` / `googleBooks` / `ai` are methods of a plain object literal (`export const db = { … }` at `src/lib/db.js:3`, `export const tmdb = { … }` at `src/lib/tmdb.js:5`, `export const googleBooks = { … }` at `src/lib/googlebooks.js:21`, `export const ai = { … }` at `src/lib/gemini.js:53`) rather than individual named exports. This namespaces everything under a single import.
- Arguments are positional (no options-object convention except for Supabase's own `{ onConflict: 'user_id,movie_id' }` at `src/lib/db.js:27,44`). Defaults are inline — `async addWatchedMovie(userId, movie, rating = null)` at `src/lib/db.js:31`, `async sendSuggestion(fromUserId, toUserId, movie, comment = '')` at line 82.
- **Return shapes are inconsistent**: some methods unwrap and return `data || []` (`getWatchedMovies`, `getSuggestions`, `getFriends`), others return the raw `{ data, error }` tuple (`addWatchedMovie`, `addToWishlist`, `addFriend`), and others return the Supabase query builder result directly (`removeWatchedMovie`, `toggleFavorite`, `updateRating` at `src/lib/db.js:48-62`). Callers must know per-method which shape to expect.
- Event handlers in components are arrow functions assigned to `const`: `const handleSearch = async (q) => { … }` (`src/components/cinema/CinemaPage.jsx:48`). Regular function declarations are reserved for components themselves.

## Module Design

- Exports: default export for React components; named exports for `const` objects / provider components / hooks.
- No barrel (`index.js`) files. Each module is imported directly by filename.
- `src/lib/supabase.js` exports the shared client plus thin auth helpers (`signInWithGoogle`, `signOut`, `getUser`) — single point of truth for Supabase access; `src/lib/db.js` and `src/hooks/useAuth.jsx` both import from it.

## Lint / Format Tooling — GAP

**No linter, no formatter, no style enforcement.** Verified via glob:

- No `.eslintrc*`, no `eslint.config.*` — `npx eslint` would fail out of the box.
- No `.prettierrc*`, no `prettier` in dependencies.
- No `.editorconfig`.
- No `lint` / `format` / `typecheck` scripts in `package.json:6-10` — only `dev`, `build`, `preview`.
- No pre-commit hooks (no `husky`, no `lint-staged`, no `.husky/`).
- `.gitignore` is 2 lines (`.env.local`, `node_modules`). `src/App.jsx` mixes tab-indented and space-indented JSX (lines 59-74 are tab-indented inside an otherwise 2-space file) — the visible symptom of no formatter.

**Style followed by convention only (not enforced):**

- 2-space indentation in most files (with drift noted above).
- No trailing semicolons (ASI). Confirm: `src/lib/tmdb.js:1-3` has no trailing semicolons on the `const` declarations.
- Single quotes for strings; backticks for template literals.
- Trailing commas in multi-line object/array literals are inconsistent (present in `src/lib/db.js:45` on the upsert object, absent in many others).

This is the single largest quality gap. New code should either:

1. Match the existing implicit style (2 spaces, no semicolons, single quotes, ES modules, `.js`/`.jsx` extensions on imports), OR
2. Introduce ESLint + Prettier as a dedicated phase before any large refactor.

## Accessibility — GAP

- No `aria-*` attributes anywhere sampled. Clickable `<div>`s (e.g., movie-card at `src/components/cinema/CinemaPage.jsx:168`) are not keyboard-accessible. Buttons are used for nav items (`src/components/layout/Sidebar.jsx:21`), but there is no focus-ring styling, no skip-link, and alt text on images is inconsistent — poster uses `alt={movie.title}` at `CinemaPage.jsx:170`, while the hero backdrop uses `alt=""` at `MovieModal.jsx:114`.
- `ANALISI_PROGETTO.md:740` flags accessibility as "Media" severity.
