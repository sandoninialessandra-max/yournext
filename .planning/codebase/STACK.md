# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- JavaScript (ES modules, JSX) — all source files in `src/` use `.js` and `.jsx` extensions. `package.json` declares `"type": "module"`, so every `.js` file is ESM.
- SQL — schema at `supabase_schema.sql` (PostgreSQL dialect for Supabase, with RLS and `plpgsql` trigger function).

**Secondary:**
- CSS — single stylesheet at `src/styles/main.css` (~12 KB, plain CSS with custom properties; no preprocessor, no CSS Modules, no Tailwind).
- HTML — single entry at `index.html` (Vite SPA shell).

**Notes:**
- No TypeScript source files detected (`@types/react` / `@types/react-dom` are listed under `devDependencies` in `package.json` but only provide editor IntelliSense; there is no `tsconfig.json` in the repo root).
- No linter/formatter config (`.eslintrc*`, `.prettierrc*`, `biome.json`) detected.

## Runtime

**Environment:**
- Browser runtime only. App is a Vite-built single-page application mounted via `src/main.jsx` into `#root` of `index.html`.
- No Node engine field declared in `package.json` (`engines` is not set).
- No `.nvmrc` / `.node-version` / `.python-version` in repo root.
- `SETUP.md` recommends installing the Node.js LTS build for development (informational only, not enforced).

**Package Manager:**
- npm — `package-lock.json` is present at repo root. No `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb`.

## Frameworks

**Core:**
- React `^18.2.0` — UI framework. Root render in `src/main.jsx` uses `ReactDOM.createRoot` with `<React.StrictMode>`.
- React DOM `^18.2.0` — paired with React for browser rendering.
- React Router DOM `^6.21.0` — client-side routing. `BrowserRouter` / `Routes` / `Route` / `Navigate` are composed in `src/App.jsx`; hooks `useNavigate` and `useLocation` are also used there.

**Testing:**
- None. No test runner, no test files, no `jest.config.*` / `vitest.config.*`.

**Build/Dev:**
- Vite `^5.0.8` — dev server and bundler. Config at `vite.config.js` (6 lines, only registers `@vitejs/plugin-react`).
- `@vitejs/plugin-react` `^4.2.1` — React Fast Refresh + JSX transform for Vite.

## Key Dependencies

**Critical (runtime):**
- `@supabase/supabase-js` `^2.39.0` — auth (Google OAuth, session handling) and Postgres data access. Client constructed in `src/lib/supabase.js`; consumed by `src/lib/db.js` (data layer) and `src/hooks/useAuth.jsx` (session/profile).
- `react` `^18.2.0` — see Core.
- `react-dom` `^18.2.0` — see Core.
- `react-router-dom` `^6.21.0` — see Core.
- `lucide-react` `^0.309.0` — icon set (e.g. `User`, `LogOut` imported in `src/App.jsx`; used across sidebar and pages).
- `date-fns` `^3.0.6` — date formatting utilities (listed in `package.json`).

**Infrastructure (dev):**
- `@types/react` `^18.2.43` — TS types for IDE tooling.
- `@types/react-dom` `^18.2.17` — TS types for IDE tooling.
- `@vitejs/plugin-react` `^4.2.1` — see Build/Dev.
- `vite` `^5.0.8` — see Build/Dev.

**State Management:**
- React Context API only. Two providers in `src/App.jsx`:
  - `AuthProvider` (`src/hooks/useAuth.jsx`) exposes `{ user, loading }` via `useAuth()`.
  - `ToastProvider` (`src/components/shared/Toast.jsx`) for toast notifications.
- Local component state via `useState` / `useEffect`. No Redux, Zustand, Jotai, or TanStack Query.

**Routing:**
- React Router v6 `BrowserRouter`. Routes defined in `src/App.jsx`:
  - `/` → redirect to `/cinema`
  - `/cinema` → `CinemaPage`
  - `/books` → `BooksPage`
  - `/travel` → `ComingSoon`
  - `/notifications` → `NotificationsPage`
  - `/profile` → `ProfilePage`

**Styling Approach:**
- Single global stylesheet `src/styles/main.css` imported once in `src/App.jsx`.
- CSS custom properties for the design system (`--bg`, `--accent`, `--font-display`, etc. declared on `:root`).
- Inline style objects used for one-off layout tweaks (e.g. `src/App.jsx` header bar, `src/components/auth/LoginPage.jsx`).
- Fonts loaded from Google Fonts via `<link>` in `index.html`: DM Serif Display and DM Sans.

## Configuration

**Environment:**
- Env vars are read through Vite's `import.meta.env` and must therefore be prefixed with `VITE_` to be exposed to the client bundle.
- `.env.example` (committed) lists the expected keys:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_TMDB_API_KEY`
  - `VITE_GEMINI_API_KEY`
- `.env.local` (present, gitignored via `.gitignore`) holds the actual secret values — contents not read per security policy.
- `VITE_GROQ_API_KEY` is consumed in `src/lib/gemini.js` but is NOT declared in `.env.example`. This is a drift between documented and actual configuration.
- Every env read site:
  - `src/lib/supabase.js` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `src/lib/tmdb.js` → `VITE_TMDB_API_KEY`
  - `src/lib/gemini.js` → `VITE_GROQ_API_KEY`, `VITE_GEMINI_API_KEY`

**Build:**
- `vite.config.js` — minimal configuration, no path aliases, no proxy, no env prefix override.
- `vercel.json` — single SPA rewrite rule: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` so client-side routes resolve on reload.
- `index.html` — Vite entry, Italian `lang="it"`, title "Your Next", favicon `/favicon.svg`, Google Fonts preconnect + stylesheet, script `type="module" src="/src/main.jsx"`.

**Scripts (from `package.json`):**
```
npm run dev       # vite (dev server, default port 5173)
npm run build     # vite build (production bundle in dist/)
npm run preview   # vite preview (serve built dist/ locally)
```
No `test`, `lint`, `format`, or `typecheck` scripts are declared.

**Gitignore:**
- `.gitignore` contains exactly two entries: `.env.local` and `node_modules`. No build output (`dist/`) or OS files are ignored.

## Platform Requirements

**Development:**
- Node.js (LTS recommended by `SETUP.md`, not enforced via `engines`).
- npm (matches committed `package-lock.json`).
- Modern browser for the Vite dev server on port 5173.

**Production:**
- Vercel static hosting (per `vercel.json` and `SETUP.md` STEP 7). The build output `dist/` is served as a static SPA with a catch-all rewrite to `/index.html`.
- Supabase project (Postgres + Auth) provisioned using `supabase_schema.sql` (tables `profiles`, `watched_movies`, `friendships`, `movie_suggestions` plus `read_books` and `book_suggestions` referenced by `src/lib/db.js` — note the Books tables are NOT defined in `supabase_schema.sql`, which is a schema drift).
- Google Cloud OAuth client registered with Supabase for "Continua con Google" (see `SETUP.md` STEP 2).

---

*Stack analysis: 2026-04-22*
