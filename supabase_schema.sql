-- =========================================
-- CINEMATICA - Schema Supabase
-- Esegui questo nell'SQL Editor di Supabase
-- =========================================

-- Profili utente (sincronizzati da auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Film visti
CREATE TABLE IF NOT EXISTS watched_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  movie_genres JSONB DEFAULT '[]',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Amicizie
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Suggerimenti film tra amici
CREATE TABLE IF NOT EXISTS movie_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_suggestions ENABLE ROW LEVEL SECURITY;

-- Profiles: leggibile da tutti gli autenticati, modificabile solo da sé stessi
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Watched movies: visibili e modificabili solo dal proprietario
CREATE POLICY "watched_select" ON watched_movies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_insert" ON watched_movies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watched_update" ON watched_movies FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watched_delete" ON watched_movies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Friendships: visibili dal proprio utente
CREATE POLICY "friendships_select" ON friendships FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Suggestions: visibili da mittente e destinatario
CREATE POLICY "suggestions_select" ON movie_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "suggestions_insert" ON movie_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "suggestions_update" ON movie_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);

-- =========================================
-- TRIGGER: auto-sync profilo al signup
-- =========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================
-- ── LIBRI (CLEAN-01) ──────────────────────
-- =========================================
-- Appended 2026-04-22 to reconcile schema drift.
-- Idempotent: IF NOT EXISTS on every statement → no-op on prod, full create on empty DB.

-- 1. Backfill the missing status column on watched_movies
ALTER TABLE watched_movies
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'watched'
  CHECK (status IN ('watched', 'wishlist'));

-- 2. Libri letti / in lettura / wishlist (per-utente)
CREATE TABLE IF NOT EXISTS read_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_cover TEXT,
  book_year TEXT,
  book_authors TEXT,
  book_pages INTEGER,
  status TEXT DEFAULT 'read' CHECK (status IN ('read', 'reading', 'wishlist')),
  current_page INTEGER DEFAULT 0,
  rating NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 3. Suggerimenti libri tra amici
CREATE TABLE IF NOT EXISTS book_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_cover TEXT,
  book_authors TEXT,
  comment TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS read_books — owner-only (pattern watched_movies)
-- Note: Postgres does NOT support `CREATE POLICY IF NOT EXISTS` (all versions).
-- Use `DROP POLICY IF EXISTS ... ; CREATE POLICY ...;` for idempotency.
ALTER TABLE read_books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_books_select" ON read_books;
CREATE POLICY "read_books_select" ON read_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_books_insert" ON read_books;
CREATE POLICY "read_books_insert" ON read_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_books_update" ON read_books;
CREATE POLICY "read_books_update" ON read_books FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_books_delete" ON read_books;
CREATE POLICY "read_books_delete" ON read_books FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. RLS book_suggestions — sender + recipient (pattern movie_suggestions)
ALTER TABLE book_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "book_suggestions_select" ON book_suggestions;
CREATE POLICY "book_suggestions_select" ON book_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "book_suggestions_insert" ON book_suggestions;
CREATE POLICY "book_suggestions_insert" ON book_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "book_suggestions_update" ON book_suggestions;
CREATE POLICY "book_suggestions_update" ON book_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);

-- =========================================
-- ── RISTORANTI (Phase 2) ──────────────────
-- =========================================
-- Appended 2026-04-24 to mirror prod DB (tables pre-created by owner).
-- Idempotent: IF NOT EXISTS on tables, DROP+CREATE on policies.

-- 1. Città preferite per utente
CREATE TABLE IF NOT EXISTS user_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, city_name)
);

-- 2. Ristoranti salvati (visited / wishlist)
CREATE TABLE IF NOT EXISTS visited_restaurants (
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

-- 3. Suggerimenti ristoranti tra amici
CREATE TABLE IF NOT EXISTS restaurant_suggestions (
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

-- 4. RLS enable (idempotent)
ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE visited_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_suggestions ENABLE ROW LEVEL SECURITY;

-- 5. RLS user_cities — single FOR ALL policy (owner-only)
DROP POLICY IF EXISTS "user_cities_all" ON user_cities;
CREATE POLICY "user_cities_all" ON user_cities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. RLS visited_restaurants — owner-only (pattern watched_movies / read_books)
DROP POLICY IF EXISTS "visited_restaurants_select" ON visited_restaurants;
CREATE POLICY "visited_restaurants_select" ON visited_restaurants FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "visited_restaurants_insert" ON visited_restaurants;
CREATE POLICY "visited_restaurants_insert" ON visited_restaurants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "visited_restaurants_update" ON visited_restaurants;
CREATE POLICY "visited_restaurants_update" ON visited_restaurants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "visited_restaurants_delete" ON visited_restaurants;
CREATE POLICY "visited_restaurants_delete" ON visited_restaurants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. RLS restaurant_suggestions — sender + recipient (pattern movie_suggestions / book_suggestions)
DROP POLICY IF EXISTS "restaurant_suggestions_select" ON restaurant_suggestions;
CREATE POLICY "restaurant_suggestions_select" ON restaurant_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "restaurant_suggestions_insert" ON restaurant_suggestions;
CREATE POLICY "restaurant_suggestions_insert" ON restaurant_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "restaurant_suggestions_update" ON restaurant_suggestions;
CREATE POLICY "restaurant_suggestions_update" ON restaurant_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);
