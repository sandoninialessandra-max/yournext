import { supabase } from './supabase.js'

export const db = {
  // Watched movies
  async getWatchedMovies(userId) {
    const { data } = await supabase
      .from('watched_movies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async addWatchedMovie(userId, movie, rating = null) {
    const { data, error } = await supabase
      .from('watched_movies')
      .upsert({
        user_id: userId,
        movie_id: movie.id,
        movie_title: movie.title,
        movie_poster: movie.poster_path,
        movie_year: movie.release_date?.slice(0, 4),
        movie_genres: movie.genres?.map(g => g.name) || movie.genre_ids || [],
        rating,
        is_favorite: false,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,movie_id' })
    return { data, error }
  },

  async removeWatchedMovie(userId, movieId) {
    return supabase.from('watched_movies').delete().eq('user_id', userId).eq('movie_id', movieId)
  },

  async toggleFavorite(userId, movieId, current) {
    return supabase.from('watched_movies')
      .update({ is_favorite: !current })
      .eq('user_id', userId).eq('movie_id', movieId)
  },

  async updateRating(userId, movieId, rating) {
    return supabase.from('watched_movies')
      .update({ rating })
      .eq('user_id', userId).eq('movie_id', movieId)
  },

  // Friend suggestions
  async getFriends(userId) {
    const { data } = await supabase
      .from('friendships')
      .select('friend_id, profiles!friendships_friend_id_fkey(id, full_name, avatar_url, email)')
      .eq('user_id', userId)
    return data || []
  },

  async sendSuggestion(fromUserId, toUserId, movie, comment = '') {
    return supabase.from('movie_suggestions').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_poster: movie.poster_path,
      movie_year: movie.release_date?.slice(0, 4),
      comment,
      read: false,
      created_at: new Date().toISOString()
    })
  },

async getSuggestions(userId) {
  const { data } = await supabase
    .from('movie_suggestions')
    .select('*, profiles(full_name, avatar_url)')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
},

  async markSuggestionRead(id) {
    return supabase.from('movie_suggestions').update({ read: true }).eq('id', id)
  },

  async searchUserByEmail(email) {
    const { data } = await supabase.from('profiles').select('*').ilike('email', `%${email}%`).limit(5)
    return data || []
  },

  async addFriend(userId, friendId) {
    return supabase.from('friendships').upsert({ user_id: userId, friend_id: friendId })
  },

  async getProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  },

  async upsertProfile(userId, profile) {
    return supabase.from('profiles').upsert({ id: userId, ...profile })
  }
}
