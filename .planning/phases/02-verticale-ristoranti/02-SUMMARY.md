# Phase 2: Verticale Ristoranti — Summary

**Executed:** 2026-04-24
**Status:** ✅ Complete
**Plans:** `02-01-PLAN.md` (lib + data) + `02-02-PLAN.md` (UI)
**Commits:** 16 (8 on plan 02-01 + 7 on plan 02-02 + 1 prior schema alignment `7e49a67`)

---

## Plan 02-01 — Lib + Data Layer

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Append DDL+RLS block for ristoranti in `supabase_schema.sql` | SKIPPED (pre-done in `7e49a67`) | — |
| 2 | [BLOCKING] Apply DDL to Supabase prod | SKIPPED (owner pre-applied) | — |
| 3 | Create `src/lib/foursquare.js` (REST client + `formatPlace`) | ✅ | `dca8114` |
| 4 | Create `src/lib/placesProvider.js` (dispatcher) | ✅ | `bbaca4b` |
| 5 | Extend `src/lib/db.js` with 15 CRUD methods (ristoranti + user_cities) | ✅ | `612b963` |
| 6 | Extend `src/lib/gemini.js` with 2 AI methods (similar + personalized) | ✅ | `27cd795` |
| 7 | Update `.env.example` with `VITE_PLACES_PROVIDER` + `VITE_FOURSQUARE_API_KEY` + `VITE_GROQ_API_KEY` | ✅ | `e61bda5` |
| 8 | Update `.planning/REQUIREMENTS.md` with RIST-10 + placesProvider source | ✅ | `40dd08e` |
| 9 | Update `.planning/ROADMAP.md` Phase 2 Requirements with RIST-10 | ✅ | `9a06b23` |
| 10 | Update `.planning/PROJECT.md` Key Decision: layer astratto Places | ✅ | `d059fbb` |

**Deviations:**
- Tasks 1-2 pre-done before plan execution (schema already mirror'd + owner already pushed DDL via SQL Editor). Not a quality issue — the plan was written before execution and the state caught up.
- Coverage count in REQUIREMENTS.md: plan asked for `21/21`, but the baseline after Phase 1 was `18/18` (SEC-01+SEC-06 were moved to v2 on 2026-04-23). Adding RIST-10 brings the correct count to `19/19` — committed with that correction.
- **User's richer `gemini.js` preserved in stash** — the HEAD `gemini.js` used as the baseline for Task 6 is the leaner committed version; the user's in-flight richer version (Gemini-first `getFullPlot`, `getSimilarBooks`, `getPersonalizedBookSuggestions`, dual-call classics/recent) is in `stash@{0}`. Committed version is functional (Ristoranti + existing Movie methods unchanged). Owner can merge the stash later if desired.

---

## Plan 02-02 — UI Layer

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extract `StarRating` to `src/components/shared/StarRating.jsx` + refactor `BookModal` | ✅ | `e351db1` |
| 2 | Append CSS classes for ristoranti in `src/styles/main.css` | ✅ | `57511cd` |
| 3 | Create `src/components/restaurants/RistorantiPage.jsx` (3 tabs + city selector + label filter + AI) | ✅ | `478bca5` |
| 4 | Create `src/components/restaurants/RestaurantModal.jsx` (hero + actions + labels + notes + similar + send + maps) | ✅ | `aaad016` |
| 5 | Add "Ristoranti" entry in `src/components/layout/Sidebar.jsx` (Utensils icon) | ✅ | `9471cbc` |
| 6 | Extend `src/App.jsx` with `/ristoranti` route + 3-stream unread polling | ✅ | `9c8ac80` |
| 7 | Extend `NotificationsPage.jsx` to 3 streams (film + libri + ristoranti) with filter row + 3-branch card renderer | ✅ | `d41b92a` |
| 8 | Smoke test — `npm run build` + 30-grep sanity | ✅ (verification only) | — |

**Deviations:**
- None. All 30 verification greps pass (A1–A3, B1–B7, C1–C9, D1–D3, E1–E3, F1–F4, G1–G3).
- Minor belt-and-braces defence added in `RistorantiPage.jsx` Tab 3 effect (guard against accidentally querying with "Altro" pseudo-city) — consistent with plan's Tab 2 guidance.
- Commits on shared files (Sidebar, App.jsx, main.css) **absorbed the user's pre-existing in-flight edits** on those files, because those edits were already in the working tree and the plan modifies the same files. This is acceptable per plan guidance on shared files. Other user dev work on files NOT in the plan (LoginPage, CinemaPage, MovieModal, ProfilePage, db.js LIBRI section) remains unstaged — intact.

---

## Commit list (16 commits)

```
d41b92a feat(02-02): extend NotificationsPage to 3 streams (film + libri + ristoranti)
9c8ac80 feat(02-02): mount /ristoranti route + polling across 3 suggestion streams
9471cbc feat(02-02): add Ristoranti entry to Sidebar navItems
aaad016 feat(02-02): add RestaurantModal with maps, labels, notes, similar, send
478bca5 feat(02-02): add RistorantiPage with 3 tabs, city selector, label filter
57511cd style(02-02): add Ristoranti CSS classes (city-chip, label-pill, price-level)
e351db1 refactor(02-02): extract StarRating to shared for cross-vertical reuse
d059fbb docs(project): key decision cita layer astratto Places (Foursquare attivo, Google predisposto)
9a06b23 docs(roadmap): add RIST-10 to Phase 2 requirements list
40dd08e docs(req): add RIST-10 (user_cities) + extend RIST-01 with placesProvider
e61bda5 docs(env): add GROQ, PLACES_PROVIDER, FOURSQUARE keys to .env.example
27cd795 feat(ai): add Gemini helpers + ristoranti AI methods (similar + personalized)
612b963 feat(db): add 15 CRUD methods for ristoranti + user_cities tables
bbaca4b feat(lib): add placesProvider dispatcher (foursquare active, google ready-to-throw)
dca8114 feat(lib): add Foursquare Places v3 REST client with formatPlace normalizer
7e49a67 fix(schema): append RISTORANTI DDL + RLS to align with prod (Phase 2 prep)
```

---

## Requirements coverage (Phase 2 REQs)

| REQ-ID | Covered by |
|--------|------------|
| RIST-01 | `placesProvider.js` + `foursquare.js` (dispatcher + concrete impl, `search`/`getPlace`/`getPopular`/`coverUrl`) |
| RIST-02 | `visited_restaurants` table + 4 owner-only RLS policies (commit `7e49a67`, prod already live) |
| RIST-03 | `restaurant_suggestions` table + 3 sender+recipient RLS policies |
| RIST-04 | `RistorantiPage.jsx` with 3 tabs ("I miei" / "Scopri" / "Consigli AI") |
| RIST-05 | `RestaurantModal.jsx` with hero + rating + visited/wishlist + favorite + labels + notes + send + maps |
| RIST-06 | `gemini.js#getSimilarRestaurants` + `gemini.js#getPersonalizedRestaurantSuggestions` (Gemini→Groq fallback) |
| RIST-07 | `NotificationsPage.jsx` 3-stream feed + `App.jsx` unread polling includes `getRestaurantSuggestions` |
| RIST-08 | Sidebar entry with `Utensils` icon + `/ristoranti` route in `App.jsx` |
| RIST-09 | `.env.example` documents `VITE_FOURSQUARE_API_KEY` + visible failure if missing |
| RIST-10 | `user_cities` table in `supabase_schema.sql` + 4 CRUD methods in `db.js` + inline UI (add/remove) in `RistorantiPage.jsx` |

All 10 RIST-* REQ-IDs covered. Success criteria from ROADMAP.md §Phase 2 (6 criteria) all addressed.

---

## Build status

`npm run build` exit 0, 1482 modules transformed, 12.91s, no warnings/errors. Final bundle: `dist/assets/index-*.js` 464 kB / 126 kB gzip.

---

## Working-tree state (end of phase)

Pre-existing user dev work intact, NOT staged:

```
 M src/components/auth/LoginPage.jsx
 M src/components/cinema/CinemaPage.jsx
 M src/components/cinema/MovieModal.jsx
 M src/components/cinema/ProfilePage.jsx
 M src/lib/db.js  (LIBRI section on top of committed RISTORANTI section)
?? .claude/
?? memory/
?? req.txt

Stashes:
  stash@{0}: user's richer gemini.js (Gemini-first getFullPlot + book-specific AI methods)
```

**Action items for the owner:**
1. **Merge uncommitted LIBRI section in `db.js`** — `git add src/lib/db.js && git commit -m "feat(db): add LIBRI CRUD methods"` when ready. The Ristoranti methods on `main` already coexist with your local edits.
2. **Review & pop stash for richer gemini.js** — the committed `gemini.js` has all 3 Movie methods + the 2 new Ristoranti methods but NOT the richer user version (Gemini-first `getFullPlot`, book-specific AI methods). Merge strategies:
   - `git stash show -p stash@{0}` to inspect what would come in
   - Apply on top with `git stash apply stash@{0}` — expect conflicts with the committed version; resolve by hand to keep both Ristoranti methods AND user's book/movie enhancements.
3. **Other uncommitted dev work** (`LoginPage.jsx`, `CinemaPage.jsx`, `MovieModal.jsx`, `ProfilePage.jsx`) — owner's call when to commit. Not blocking Phase 3.
4. **Populate `.env.local` with real values** for the new env vars:
   - `VITE_PLACES_PROVIDER=foursquare`
   - `VITE_FOURSQUARE_API_KEY=<real key from Foursquare Developer>`
   - `VITE_GROQ_API_KEY` if you want AI Groq-fallback (already documented)

---

## Success criteria — roll-up

1. ✅ Navigation `/ristoranti` from sidebar, search via Foursquare, results with foto + fascia prezzo + indirizzo + categoria + rating
2. ✅ Visited/wishlist marking, rating 1-5, favorite flag, persistence via RLS per-utente on `visited_restaurants`
3. ✅ Open restaurant + send to friend with comment; friend sees in `/notifications` 3-stream feed ordered by `created_at` with auto-mark-as-read
4. ✅ Unread badge in sidebar sums `restaurant_suggestions` with same 60s polling
5. ✅ AI "similar restaurants" + "personalized restaurants" with Gemini → Groq fallback
6. ✅ `.env.example` documents `VITE_FOURSQUARE_API_KEY`; missing key fails visibly (not silently)

**Phase 2 complete.** Next: `/gsd-verify-work 2` for conversational UAT (browser smoke test), or directly `/gsd-discuss-phase 3` for Quality Baseline.
