# Testing — cinematica

**Last updated:** 2026-04-22

## Current State — NO AUTOMATED TESTING

**There are no tests in this codebase.** Verified by:

- Glob for `**/*.test.*` → only hits `node_modules/gensync/test/index.test.js` (a dependency's internal test, not ours).
- Glob for `**/*.spec.*` → no files found.
- No `src/__tests__/`, `tests/`, `__tests__/`, or `e2e/` directories exist.
- `package.json:6-10` defines only `dev`, `build`, `preview` scripts — no `test` script.
- `package.json:19-24` devDependencies contain only `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `vite` — no test runner, no assertion library, no React Testing Library, no Playwright, no Cypress.
- No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` at the project root.

This is explicitly acknowledged in the project's own analysis document:

- `ANALISI_PROGETTO.md:77` — *"**Nessun framework di testing** (no Jest, no Vitest, no Cypress)"*
- `ANALISI_PROGETTO.md:735` — lists **Testing** as a criticality with severity **Alta** (High): *"Nessun test (unit, integration, e2e)"*

## Test Framework

- **Runner:** None.
- **Assertion library:** None.
- **Run commands:** None — there is no `npm test` script.

## Test File Organization

Not applicable — no tests exist. The project layout (`src/components/{auth,cinema,books,layout,shared}/`, `src/lib/`, `src/hooks/`) contains source files only.

## Coverage

- **Requirements:** None defined.
- **Current coverage:** 0% (no tests).

## Manual QA Artifacts

The project relies entirely on manual verification. Relevant documents:

- **`SETUP.md`** (138 lines) — Step-by-step setup guide covering Node install, Supabase project creation, SQL-schema execution, API key acquisition (TMDB, Gemini, Groq implied), `.env.local` population, and Vercel deploy. It includes a short **"Problemi comuni"** section (`SETUP.md:115-127`) that functions as a manual smoke-test checklist:
  - *"Cannot find module" all'avvio → Esegui `npm install`*
  - *Login con Google non funziona → Controlla URL nelle Redirect URLs di Supabase*
  - *I film non appaiono → Controlla la chiave TMDB*
  - *L'AI non risponde → Controlla la chiave Gemini / limite gratuito*

  This is the closest thing to a test plan in the repo.

- **`ANALISI_PROGETTO.md`** (~750 lines) — A functional-and-technical analysis that describes features and flows. Not a QA document per se, but it (a) documents expected behavior per feature area (useful as a manual test checklist) and (b) explicitly flags the absence of testing.

- **`supabase_schema.sql`** — Executed manually against a fresh Supabase project as part of `SETUP.md` step 2. Success criterion is the UI's "Success" banner — there is no automated migration/verification.

No dedicated `TESTING.md`, `QA.md`, or manual-test-plan document existed in the repo prior to this analysis.

## Recommended Framework — Vitest + React Testing Library (GAP)

Given the stack (Vite 5, React 18, no TypeScript), the idiomatic choice for future test work is:

- **`vitest`** — native Vite integration, identical config to `vite.config.js:1-6`; fastest setup for this project.
- **`@testing-library/react`** + **`@testing-library/jest-dom`** — standard DOM assertions for React 18.
- **`@testing-library/user-event`** — realistic user-interaction simulation.
- **`jsdom`** — browser-like DOM environment for component tests.
- **`msw`** (Mock Service Worker) — mock TMDB / Google Books / Gemini / Groq / Supabase REST endpoints without touching network.

Expected additions when testing is introduced:

- `vitest.config.js` (or a `test` key in `vite.config.js`) with `environment: 'jsdom'` and a `setupFiles` entry that imports `@testing-library/jest-dom`.
- A `test` script in `package.json` (`"test": "vitest"`, `"test:watch": "vitest --watch"`, `"test:coverage": "vitest run --coverage"`).
- A `src/test/setup.js` for global test setup (RTL matchers, MSW server bootstrap).
- Either co-located `*.test.jsx` files next to components OR a `src/__tests__/` directory — the codebase has no established precedent, so either is acceptable. Co-location is more common in modern Vite+React projects.

**For E2E:** `playwright` is recommended over Cypress for a Vite/Vercel project — simpler CI integration and better multi-browser support. Not needed before unit/integration coverage exists.

## Gaps to Flag

1. **Zero automated coverage of a multi-module app** — 5 library modules (`db.js`, `supabase.js`, `tmdb.js`, `googlebooks.js`, `gemini.js`) and 9 React components, all untested. High-severity per the project's own `ANALISI_PROGETTO.md:735`.
2. **AI/LLM pathways are the most fragile and most untested** — `src/lib/gemini.js` contains bespoke JSON-parsing (`parseJSON` at line 47), provider fallback (`Promise.allSettled` at line 105), and prompt construction spread across `getFullPlot`, `getPersonalizedSuggestions`, `getSimilarMovies`, `getSimilarBooks`, `getPersonalizedBookSuggestions`. Regressions here are invisible without tests.
3. **Inconsistent `db.js` return shapes** (documented in `CONVENTIONS.md`) are a silent bug surface that tests would pin down. Some methods return `data || []`, others `{ data, error }`, others the raw query builder result — consumers must guess, and there's no test harness to catch a breaking change.
4. **No smoke test for the Supabase schema** — `supabase_schema.sql` is applied manually. A minimal integration test (e.g., spin up a local Supabase via Docker and run `db.*` against it) would prevent schema drift.
5. **No error-path testing** — the pervasive fail-silent idiom (empty `catch {}`, missing `res.ok` checks in `tmdb.js`/`googlebooks.js`) masks errors in production; tests would force those paths to be covered explicitly.
6. **No accessibility tests** — no axe-core / `jest-axe` integration; related a11y concerns noted in `CONVENTIONS.md` and `ANALISI_PROGETTO.md:740`.
7. **No CI pipeline** — without a `test` script and no GitHub Actions / Vercel check configured, introducing tests also requires introducing a CI workflow to run them.

**Recommendation for future phases:**

- Phase 1: Install Vitest + RTL + MSW, add `vitest.config.js` and `test` scripts, write smoke tests for `src/lib/gemini.js:parseJSON` and `src/lib/db.js` return-shape consistency.
- Phase 2: Component tests for `CinemaPage` / `BooksPage` search and wishlist flows (mock `tmdb` / `googleBooks` / `db` via MSW).
- Phase 3: Integration/E2E with Playwright covering login → add-to-list → suggest-to-friend.
