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
