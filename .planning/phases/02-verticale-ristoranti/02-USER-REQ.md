La sezione Ristoranti deve seguire il pattern di Cinema e Libri ma con queste differenze specifiche:
LAYER API PARAMETRICO
Creare src/lib/placesProvider.js come layer di astrazione — espone un'interfaccia unica indipendente dal provider. Il provider attivo si configura tramite VITE_PLACES_PROVIDER (foursquare | google). Questo permette di cambiare provider in futuro senza toccare i componenti. L'interfaccia esposta: search(query, city), getPlace(id), getPopular(city, category), coverUrl(photo). Il modello dati normalizzato restituito: {id, name, address, city, cuisine, priceLevel 1-4, rating 0-10, cover, mapsUrl}.
TAB 1 — I miei ristoranti

Selettore città orizzontale scrollabile con le città configurate dall'utente (illimitate) + voce "Altro". Le città si aggiungono inline con input + tasto +, si rimuovono con ×
Subtab Visitati / Wishlist
Filtri combinabili cumulativi: città × status × etichetta
Card griglia: foto, nome, cucina, fascia prezzo (€/€€/€€€/€€€€), pill etichette (max 3 + "+N"), nota troncata a 40 caratteri
Ricerca per nome + città → placesProvider → aggiunta rapida Visitato/Wishlist

TAB 2 — Scopri

Prima selettore città (tra le preferite dell'utente)
Poi filtro per occasione/cucina: Aperitivo, Cena, Romantico, Pizza, Italiano, Giapponese, Cinese, Hamburger
Grid ristoranti popolari via placesProvider.getPopular(city, category)
Se nessuna città configurata → empty state che invita ad aggiungerne

TAB 3 — Consigli AI

Prerequisito: almeno 3 ristoranti visitati
AI analizza cucine preferite, fasce prezzo, città frequentate, etichette più usate
Gemini per tendenze, Groq fallback
JSON output: [{name, city, cuisine, reason, stars}]
Click → placesProvider.search(name, city) → apre modal

RESTAURANTMODAL

Foto, nome, cucina, prezzo, rating provider
Bottone "Apri in Google Maps" → URL diretto https://maps.google.com/?q={name}+{address} (no API key)
Azioni: Visitato / Wishlist / Preferito / Stelle voto con mezzi voti (stesso StarRating di BookModal)
Etichette: set fisso (🍹 Aperitivo, 🍽️ Cena, ☀️ Pranzo, 💑 Romantico, 👥 Amici, 👨‍👩‍👧 Famiglia, 💼 Lavoro, ⭐ Speciale) + input per aggiungere custom. Chip selezionabili con toggle. Salvate in array labels. Disponibili solo se il ristorante è in libreria
Note: textarea con placeholder "Com'è andata? Cosa hai mangiato?...", salvataggio on blur. Visibili sulla card nella griglia troncate a 40 caratteri. Disponibili solo se in libreria
Ristoranti simili: collassabile come BookModal, AI based
Suggerisci ad amico: identico a BookModal

DATABASE — 3 nuove tabelle:
sqlCREATE TABLE user_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, city_name)
);

CREATE TABLE visited_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_cover TEXT,
  restaurant_address TEXT,
  restaurant_city TEXT,
  restaurant_cuisine TEXT,
  restaurant_price_level INTEGER,
  status TEXT DEFAULT 'visited' CHECK (status IN ('visited', 'wishlist')),
  rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE TABLE restaurant_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_cover TEXT,
  restaurant_city TEXT,
  restaurant_cuisine TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CONVENZIONI DA RISPETTARE:

Nessun TypeScript, solo JSX
Nessun framework CSS — riusare classi: .movie-card, .movies-grid, .ai-card, .btn, .modal, .suggestion-card, .tabs, .tab, .section, .empty-state, .search-bar, .loader
Icone da lucide-react
Tema scuro, accent oro #e8b84b, UI in italiano
Toast per feedback azioni (useToast hook)
Modal: overlay con click fuori per chiudere + bottone X