# 🎬 Cinematica — Guida di Setup Completa

Segui questi passaggi nell'ordine. Ci vogliono circa **20-30 minuti** la prima volta.

---

## STEP 1 — Scarica e installa Node.js

1. Vai su **https://nodejs.org**
2. Scarica la versione **LTS** (la verde, più stabile)
3. Installala normalmente come qualsiasi programma
4. Verifica: apri il Terminale (Mac) o PowerShell (Windows) e scrivi `node -v` → deve mostrare un numero

---

## STEP 2 — Crea account Supabase (database + login)

1. Vai su **https://supabase.com** → crea account gratuito con Google
2. Clicca **"New Project"**
   - Nome: `cinematica`
   - Password DB: sceglila e salvala da qualche parte
   - Region: **West EU (Ireland)**
3. Aspetta 1-2 minuti che il progetto si avvii
4. Vai su **Settings → API** e copia:
   - `Project URL` → es. `https://abcdef.supabase.co` --> https://YOUR_SUPABASE_URL.supabase.co
   - `anon public` key (quella lunga sotto "Project API keys") --> YOUR_SUPABASE_ANON_KEY

### Crea le tabelle:
5. Nel menu a sinistra clicca **SQL Editor**
6. Copia tutto il contenuto del file `supabase_schema.sql`
7. Incollalo nell'editor e clicca **Run** (▶)
8. Deve apparire "Success" in verde ✅

### Abilita login con Google:
9. Vai su **Authentication → Providers**
10. Clicca su **Google** e attivalo
11. Per ora lascia i campi Client ID e Secret vuoti — funzionerà con le impostazioni di default di Supabase
12. In **Authentication → URL Configuration** aggiungi in "Redirect URLs":
    - `http://localhost:5173` (per sviluppo locale)
    - `https://tuo-sito.vercel.app` (lo aggiungerai dopo il deploy)

CLIENT ID: YOUR_GOOGLE_OAUTH_CLIENT_ID
SECRET: YOUR_GOOGLE_OAUTH_CLIENT_SECRET
---

## STEP 3 — Ottieni la chiave TMDB (dati film — gratis)

1. Vai su **https://www.themoviedb.org**
2. Crea un account gratuito
3. Vai su **Settings → API → Create** → scegli "Developer"
4. Compila il form (puoi mettere "uso personale")
5. Copia la **API Key (v3 auth)** — una stringa di 32 caratteri --> YOUR_TMDB_API_KEY

---

## STEP 4 — Ottieni la chiave Gemini (AI — gratis)

1. Vai su **https://aistudio.google.com/app/apikey**
2. Accedi con il tuo account Google
3. Clicca **"Create API Key"**
4. Copia la chiave (inizia con `AIzaSy...`) --> YOUR_GEMINI_API_KEY

> ℹ️ Il piano gratuito di Gemini permette 15 richieste/minuto e 1.500/giorno — più che sufficiente per uso personale!

---

## STEP 5 — Configura il progetto

1. Nella cartella del progetto, copia il file `.env.example` e rinominalo `.env.local`
2. Aprilo con qualsiasi editor di testo e compila:

```
VITE_SUPABASE_URL=https://tuocodice.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_TMDB_API_KEY=il_tuo_tmdb_key
VITE_GEMINI_API_KEY=AIzaSy...
```

---

## STEP 6 — Avvia il progetto in locale

Apri il Terminale nella cartella del progetto ed esegui:

```bash
npm install
npm run dev
```

Vai su **http://localhost:5173** — dovresti vedere Cinematica! 🎉

---

## STEP 7 — Deploy su Vercel (per usarla da mobile e condividerla)

1. Vai su **https://vercel.com** → crea account gratuito (con GitHub)
2. Se non hai GitHub: crea account su **https://github.com** → crea un nuovo repo vuoto → carica i file del progetto
3. Su Vercel clicca **"Add New Project"** → importa il repo da GitHub
4. Prima di fare Deploy, clicca **"Environment Variables"** e aggiungi le 4 variabili del tuo `.env.local`
5. Clicca **Deploy** e aspetta ~2 minuti
6. Copia l'URL del sito (es. `cinematica-tuo-nome.vercel.app`)
7. Torna su Supabase → **Authentication → URL Configuration** → aggiungi quell'URL nelle Redirect URLs

---

## 🎉 Fatto! L'app è online

### Come aggiornare l'app in futuro:
- Modifica i file del progetto
- Fai push su GitHub
- Vercel si aggiorna automaticamente in ~1 minuto

---

## ❓ Problemi comuni

**"Cannot find module" all'avvio**
→ Esegui `npm install` di nuovo

**Login con Google non funziona**
→ Controlla che l'URL del sito sia nelle Redirect URLs di Supabase

**I film non appaiono**
→ Controlla che la chiave TMDB sia corretta nel `.env.local`

**L'AI non risponde**
→ Controlla che la chiave Gemini sia corretta; potrebbe aver raggiunto il limite gratuito giornaliero

---

## 📱 Usarla come app mobile (opzionale, avanzato)

L'app è già una PWA (Progressive Web App):
- Su iPhone: apri Safari → vai sull'URL → condividi → "Aggiungi a schermata Home"
- Su Android: Chrome → menu → "Aggiungi a schermata Home"

Si comporterà come un'app vera!
