# YourNext — Claude Code Guide

> Brief project context and GSD workflow rules for Claude Code sessions.

## What this project is

**YourNext** è un'app social privata per ~5-10 amici stretti che traccia film visti, libri letti e ristoranti visitati. Ogni utente vota, commenta, invia consigli ai suoi amici, e riceve suggerimenti AI personalizzati.

- **Folder name:** `cinematica` (storico — il progetto è nato come tracker di film e si è espanso)
- **User-facing brand:** YourNext
- **Stack:** Vite 5 + React 18 (JSX, no TypeScript) + Supabase (Postgres + Auth + RLS) + TMDB + Google Books + Foursquare Places (in arrivo) + Gemini + Groq
- **Lingua UI:** italiano. Identificatori e commenti tecnici: inglese.
- **Deploy:** Vercel (auto-deploy da `main`)

Per il contesto completo leggere sempre `.planning/PROJECT.md` prima di lavorare.

## Planning artifacts (canonical sources)

| File | Cosa contiene |
|---|---|
| `.planning/PROJECT.md` | Vision, requirements, key decisions, out-of-scope reasons |
| `.planning/REQUIREMENTS.md` | REQ-ID atomici v1 (Validated + Active + v2/Out of scope) + traceability |
| `.planning/ROADMAP.md` | 3 fasi v1 con goal, REQ coverage, success criteria |
| `.planning/STATE.md` | Posizione corrente, focus attuale, decisioni recenti |
| `.planning/config.json` | YOLO mode, coarse granularity, plan-check + verifier on |
| `.planning/codebase/*.md` | 7 mappe del codebase (STACK, ARCH, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS) |

**Read these first** when resuming work or starting a new phase.

## GSD workflow (Get Shit Done)

Questo progetto è gestito con la metodologia GSD. Le fasi della roadmap si eseguono nell'ordine numerico (1 → 2 → 3) tramite slash command:

```
/gsd-progress              # status + prossimo step suggerito
/gsd-discuss-phase 1       # raccolta contesto prima di pianificare (opzionale ma consigliato)
/gsd-plan-phase 1          # crea il PLAN.md atomico per la fase
/gsd-execute-phase 1       # esegue tutti i plan della fase
/gsd-verify-work 1         # UAT conversazionale per validare i deliverable
```

**YOLO mode è attivo** (`.planning/config.json#mode: "yolo"`): le esecuzioni proseguono autonomamente senza chiedere conferma a ogni step. Per fermarsi a checkpoint cambiare in `interactive`.

**Granularity coarse:** 1-3 plan per fase. Non esplodere ogni REQ-ID in un plan separato.

**Plan check + Verifier sono on:** ogni PLAN.md viene validato prima dell'esecuzione, e ogni fase viene verificata dopo.

## Critical guidance for code work

1. **Mai `git add .` o `git add -A`.** `.env.local` è (storicamente) tracciato e contiene chiavi vere; finché Phase 1 non è completata, lo stage selettivo è obbligatorio.
2. **Conventions del codebase esistente vanno preservate.** No semicolons, single quotes, 2-space indent, ES modules con estensione esplicita (`./foo.js`, non `./foo`), default export per componenti React, namespace const-object per i lib (`export const db = { ... }`).
3. **Niente nuove dipendenze senza giustificazione esplicita.** Lo stack è volutamente minimo (no TypeScript, no test framework, no global store, no CSS framework). Gap noti sono in `.planning/codebase/CONCERNS.md` e sono già scoped a v2 — non risolverli proattivamente in v1.
4. **Schema drift è un anti-pattern.** Ogni nuova tabella o colonna deve esistere in `supabase_schema.sql` prima di essere chiamata da `src/lib/db.js`. Phase 1 / CLEAN-01 ricuce il drift attuale; non aggiungerne altro.
5. **Pattern delle verticali.** Per Phase 2 (Ristoranti), specchiare la struttura di Cinema e Libri:
   - `src/lib/<provider>.js` namespace const-object con metodi REST
   - tabelle DB analoghe a `watched_movies` / `read_books` (per-utente) e `movie_suggestions` / `book_suggestions` (sociali)
   - `<Vertical>Page.jsx` con tabs "I miei X / Scopri / Consigli AI"
   - `<Vertical>Modal.jsx` con dettaglio + azioni (visited/wishlist, rating, favorite, send)
   - metodi `ai.getSimilarX` e `ai.getPersonalizedXSuggestions` in `src/lib/gemini.js`
   - voce sidebar in `src/components/layout/Sidebar.jsx` + route in `src/App.jsx`
   - integrazione in `NotificationsPage.jsx` + badge unread polling
6. **AI calls sono Gemini-first, Groq-fallback.** Pattern già consolidato in `src/lib/gemini.js`. Non introdurre nuovi provider LLM.
7. **Tutta la copy utente in italiano.** Nessuna stringa in inglese visibile all'utente. Eccezioni: messaggi `console.log` / `console.error` (debug) restano in inglese.

## Commit style

- Prefissi conventional: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- Scopo nel titolo, motivazione nel body se non ovvia.
- I commit GSD (planning artifacts) sono già taggati con `Co-Authored-By: Claude`.
- **Mai** `--no-verify` o flag che bypassano hook/firma senza richiesta esplicita.

## When in doubt

- Status del progetto: `/gsd-progress`
- Requisito specifico: cerca il REQ-ID in `.planning/REQUIREMENTS.md`
- Pattern di codice: vedi `.planning/codebase/CONVENTIONS.md` con esempi `file:line`
- Problema sicurezza/architettura: `.planning/codebase/CONCERNS.md`

---

*Generated by `/gsd-new-project` on 2026-04-22.*
