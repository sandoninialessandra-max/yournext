# Phase 2: Verticale Ristoranti - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 02-verticale-ristoranti
**Areas discussed:** Provider layer, user_cities registration, AI threshold, Custom labels, Label filter semantics, "Altro" selector, Search city source

---

## Upstream source

L'utente ha fornito un requirement dettagliato come file `req.txt` (copiato in `02-USER-REQ.md`) che lock-a la maggior parte delle decisioni architetturali (schema DDL, struttura 3 tab, set etichette fisso, convenzioni CSS). La discussione si è concentrata sui punti dove il req confligge con la baseline ROADMAP/REQUIREMENTS o dove resta ambiguità UX.

---

## Provider layer

| Option | Description | Selected |
|--------|-------------|----------|
| Layer astratto, Foursquare attivo (Recommended) | `src/lib/placesProvider.js` + `src/lib/foursquare.js` concreto. Google stub non implementato in v1. Aggiorno PROJECT.md Key Decision + RIST-01. | ✓ |
| Layer astratto + entrambi provider funzionanti | Foursquare + Google entrambi implementati con chiavi separate. Raddoppia il lavoro. | |
| Solo Foursquare, niente layer | Ignoro il layer e resto su RIST-01 originale. Req.txt disattesa in parte. | |

**User's choice:** Layer astratto, Foursquare attivo (Recommended)
**Notes:** Conflitto risolto aggiornando i docs canonici (PROJECT.md + REQUIREMENTS.md RIST-01).

---

## user_cities registration

| Option | Description | Selected |
|--------|-------------|----------|
| Aggiungo RIST-10 nuovo (Recommended) | Nuovo REQ-ID canonico in REQUIREMENTS.md + traceability + ROADMAP. | ✓ |
| Inline in RIST-02 | Espando RIST-02 per coprire anche user_cities. Meno atomico. | |
| Mantengo separato ma solo in CONTEXT.md | Requirement fuori dal registro canonico. | |

**User's choice:** Aggiungo RIST-10 nuovo (Recommended)
**Notes:** Tracciabilità pulita, il registro REQUIREMENTS.md resta la single source.

---

## AI threshold (<3 visited)

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state + CTA (Recommended) | Tab cliccabile, contenuto empty-state con bottone verso "I miei ristoranti". | ✓ |
| Tab disabilitata finché non raggiunta soglia | Tab visibile ma non cliccabile, tooltip "Sblocca a 3". | |
| Nessuna soglia hard | AI prova comunque anche con 0-2 visited. Rischio output generico. | |

**User's choice:** Empty state + CTA (Recommended)
**Notes:** Soft-gate incoraggia l'uso senza bloccarlo visivamente.

---

## Custom labels

| Option | Description | Selected |
|--------|-------------|----------|
| Solo nel array del ristorante (Recommended) | Custom live in `visited_restaurants.labels[]`. Autocomplete naive via scansione client-side. | ✓ |
| Tabella user_labels dedicata | Quarta tabella con usage_count. Più DDL, più migration. | |
| Niente custom, solo set fisso 8 | Blocco le custom, solo le predefinite. | |

**User's choice:** Solo nel array del ristorante (Recommended)
**Notes:** Nessuna tabella extra. Se emerge bisogno di autocomplete strutturato, promozione a v2.

---

## Label filter semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-select OR (Recommended) | Ristorante matcha se ha ALMENO UNA delle etichette selezionate. | ✓ |
| Multi-select AND | Ristorante matcha se ha TUTTE le etichette. Più restrittivo. | |
| Single-select | Una sola etichetta alla volta. | |

**User's choice:** Multi-select OR (Recommended)
**Notes:** Naturale per "mostrami romantici o speciali".

---

## "Altro" nel selettore città

| Option | Description | Selected |
|--------|-------------|----------|
| Mostra ristoranti di città NON nei preferiti (Recommended) | Filtro `city NOT IN (user_cities)`. Ottimo per viaggi singoli. | ✓ |
| Mostra TUTTI i ristoranti senza filtro città | Vista globale escape-hatch. | |
| Apre input inline per aggiungere nuova città | Ridondante col meccanismo già previsto dal req. | |

**User's choice:** Mostra ristoranti di città NON nei preferiti (Recommended)
**Notes:** Copre lo use case viaggio-una-tantum senza allargare user_cities.

---

## Search: source della città

| Option | Description | Selected |
|--------|-------------|----------|
| Città selezionata nel selettore corrente (Recommended) | Search usa la città attiva nel selettore orizzontale. Se vuota, disabilitata. | ✓ |
| Input città esplicito nella search bar | Doppio campo ristorante + città. Più potente ma più attrito. | |
| Geolocalizzazione browser + fallback manuale | GPS + reverse geocoding. Prompt permesso intrusivo. | |

**User's choice:** Città selezionata nel selettore corrente (Recommended)
**Notes:** UX lineare, zero ambiguità. Geolocation deferita a v2.

---

## Claude's Discretion

Aree dove l'utente non ha specificato e Claude ha scelto un default coerente con il codebase:
- Ordinamento default card "I miei ristoranti" per `created_at DESC`.
- Ordine 8 etichette fisse = quello fornito dal req.
- Layout selettore città = `overflow-x: auto` + nuove classi `.city-chip`.
- Mapping priceLevel 1-4 → `€ / €€ / €€€ / €€€€`; `null → —`.
- Icona sidebar = `Utensils` o `UtensilsCrossed` da `lucide-react`.
- Placeholder foto assente = icona lucide (`Utensils` / `MapPin`) su fondo grigio.

## Deferred Ideas

Vedere la sezione omonima in 02-CONTEXT.md:
- Provider Google Places implementato
- Tabella user_labels per autocomplete strutturato
- Geolocalizzazione browser + reverse geocoding
- Statistiche aggregate su label / cucina / città
- Import/export / share delle città preferite
