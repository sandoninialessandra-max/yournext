# STRUCTURE — cinematica

**Last updated:** 2026-04-22

## Directory Layout — repo root

```
cinematica/
├── .env.example              # Template for required VITE_* env vars
├── .env.local                # Local env (intended to be git-ignored; contains real keys)
├── .gitignore                # Ignores .env.local and node_modules only
├── .planning/codebase/       # GSD codebase maps land here
├── ANALISI_PROGETTO.md       # Italian design/analysis notes (~24 KB)
├── SETUP.md                  # Italian onboarding guide — NOTE: contains inline example secrets
├── favicon.svg               # Icon referenced by index.html
├── index.html                # Vite HTML entry (mounts /src/main.jsx into #root)
├── node_modules/             # Installed deps (should be git-ignored; currently tracked)
├── package.json              # Scripts + deps (React 18, Vite 5, @supabase/supabase-js, react-router-dom 6, lucide-react, date-fns)
├── package-lock.json
├── src/                      # All application source
├── supabase_schema.sql       # DDL + RLS + trigger (movies side only; book tables missing)
├── vercel.json               # SPA rewrite rule
└── vite.config.js            # Minimal: @vitejs/plugin-react only
```

## Directory Layout — `src/`

```
src/
├── App.jsx                   # Router + providers + AppShell; inline ComingSoon + top-bar
├── main.jsx                  # React 18 root
├── components/
│   ├── auth/LoginPage.jsx    # Full-page login; "Continua con Google" → signInWithGoogle
│   ├── books/
│   │   ├── BookModal.jsx     # Book detail modal (half-star rating, status, progress, send, AI similar)
│   │   └── BooksPage.jsx     # Books home: tabs "I miei libri" / "Scopri" / "Consigli AI"
│   ├── cinema/
│   │   ├── CinemaPage.jsx    # Movies home with three tabs
│   │   ├── MovieModal.jsx    # Movie detail (providers, trailer, credits, AI full plot + similar, send)
│   │   ├── NotificationsPage.jsx  # Unified movie+book suggestion feed; auto-marks read
│   │   └── ProfilePage.jsx   # User info, friend search by email, add friend, sign out
│   ├── layout/Sidebar.jsx    # Fixed icon nav: Cinema / Libri / Viaggi (soon) / Notifiche (badge)
│   └── shared/Toast.jsx      # ToastProvider + useToast() (3 s)
├── hooks/useAuth.jsx         # AuthProvider + useAuth()
├── lib/
│   ├── db.js                 # Supabase CRUD namespace (object literal `db`)
│   ├── gemini.js             # LLM orchestrator `ai` (Gemini + Groq hybrid)
│   ├── googlebooks.js        # `googleBooks` REST client + formatBook normalizer
│   ├── supabase.js           # createClient + signInWithGoogle + signOut + getUser
│   └── tmdb.js               # `tmdb` REST client + URL helpers
└── styles/main.css           # Single global stylesheet (~12 KB)
```

## Directory Purposes (one-liners)

- `src/` — Vite module root; all app source.
- `src/components/` — React components grouped by feature vertical.
- `src/components/auth/` — Unauthenticated UI (currently just `LoginPage.jsx`).
- `src/components/books/` — Book screens + modal (Google Books data, `read_books` / `book_suggestions` tables).
- `src/components/cinema/` — Movie screens plus cross-vertical pages `NotificationsPage.jsx` and `ProfilePage.jsx` which logically belong in a shared/common folder (candidate refactor).
- `src/components/layout/` — Chrome/structural UI (currently just `Sidebar.jsx`).
- `src/components/shared/` — Generic UI primitives / context providers (currently just `Toast.jsx`).
- `src/hooks/` — Custom React hooks + contexts (currently just auth).
- `src/lib/` — Non-React service layer; each file exports one namespace object.
- `src/styles/` — Global CSS (monolithic `main.css`).
- `.planning/codebase/` — GSD-generated codebase maps.

## Key File Locations

- **Entry points:** `index.html`, `src/main.jsx`, `src/App.jsx`.
- **Config:** `vite.config.js`, `vercel.json`, `package.json`, `.env.example`, `.env.local`.
- **Core logic:** `src/lib/db.js`, `src/lib/supabase.js`, `src/lib/tmdb.js`, `src/lib/googlebooks.js`, `src/lib/gemini.js`, `src/hooks/useAuth.jsx`.
- **Data model:** `supabase_schema.sql` (movies side only; book tables drifted).
- **Styling:** `src/styles/main.css`.
- **Testing:** none — no test files, no runner in `package.json`, no `tests/` / `__tests__/`.

## Naming Conventions

### Files

- React components: `PascalCase.jsx` (e.g. `CinemaPage.jsx`, `MovieModal.jsx`, `Sidebar.jsx`).
- Hooks: `camelCase.jsx` with `use` prefix (e.g. `useAuth.jsx`).
- Service modules: `lowercase.js` (e.g. `db.js`, `tmdb.js`, `googlebooks.js`, `gemini.js`, `supabase.js`).
- Config/root docs: lowercase or SCREAMING (`vite.config.js`, `vercel.json`, `SETUP.md`, `ANALISI_PROGETTO.md`).

### Directories

- Lowercase single word under `src/components/` — `auth`, `books`, `cinema`, `layout`, `shared`.

### Exports

- Components: `export default function ComponentName(...)` default export.
- Service modules: single named const object — `export const db = { ... }`, `export const tmdb = { ... }`, `export const googleBooks = { ... }`, `export const ai = { ... }`.
- `src/lib/supabase.js` exports several named helpers: `supabase`, `signInWithGoogle`, `signOut`, `getUser`.

### Identifiers

- JS variables/functions: `camelCase`.
- Components / contexts: `PascalCase` (`AuthContext`, `AuthProvider`, `ToastProvider`).
- DB columns (SQL + JS literals): `snake_case` (`movie_id`, `is_favorite`, `from_user_id`).
- Env vars: `SCREAMING_SNAKE_CASE` with `VITE_` prefix.

### Copy

- User-facing strings: Italian.
- Identifiers and most comments: English. A few Italian comments appear in UI files.

## Where to Add New Code

- **New authenticated page/route:** create `src/components/<feature>/MyPage.jsx`, register in `<Routes>` in `src/App.jsx`, add to `navItems` in `src/components/layout/Sidebar.jsx` if it needs sidebar access.
- **New Supabase table interaction:** add a method to the exported `db` object in `src/lib/db.js` (signature: `async methodName(userId, ...)`; reads return `data || []`, writes return `{ data, error }`). Update `supabase_schema.sql` to keep DDL + RLS in sync — book tables are already drifted; reconcile before adding more.
- **New external API integration:** create `src/lib/<provider>.js` exporting a single const-object namespace (mirror `tmdb.js` / `googlebooks.js`); read its key from `import.meta.env.VITE_<NAME>`; document in `.env.example`.
- **New AI prompt/model call:** add a method on `ai` in `src/lib/gemini.js`; use `askGemini` / `askGroq` + `parseJSON`; follow Gemini-first, Groq-fallback pattern.
- **New shared UI primitive (toast-like):** `src/components/shared/`; if it needs context, export both Provider and `useX()` hook.
- **New global CSS class:** append to `src/styles/main.css` (no CSS Modules / Tailwind / styled-components in use).
- **New icon:** import from `lucide-react`.

## Quick Lookup

| I need... | Look in |
|---|---|
| Auth UI | `src/components/auth/LoginPage.jsx` |
| Session state | `src/hooks/useAuth.jsx` (`useAuth()`) |
| Sign-in / sign-out helpers | `src/lib/supabase.js` |
| Any database read/write | `src/lib/db.js` |
| Movie API calls | `src/lib/tmdb.js` |
| Book API calls | `src/lib/googlebooks.js` |
| AI / LLM calls | `src/lib/gemini.js` (exports `ai`) |
| Toast feedback | `src/components/shared/Toast.jsx` (`useToast()`) |
| Route definitions | `src/App.jsx` (`<Routes>`) |
| Sidebar nav items | `src/components/layout/Sidebar.jsx` (`navItems`) |
| Global CSS | `src/styles/main.css` |
| Postgres schema + RLS | `supabase_schema.sql` (movies side only) |
| Required env keys | `.env.example` |
| Production routing fallback | `vercel.json` |

## Special Directories

- `node_modules/` — generated by `npm install`; should be git-ignored. Currently tracked — see `CONCERNS.md`.
- `.planning/` — GSD workflow artifacts; `.planning/codebase/` is where these maps live.
- `.env.local` — real secrets for local dev; should be git-ignored. Currently tracked — see `CONCERNS.md`.
