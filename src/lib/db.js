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

async addToWishlist(userId, movie) {
  const { data, error } = await supabase
    .from('watched_movies')
    .upsert({
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_poster: movie.poster_path,
      movie_year: movie.release_date?.slice(0, 4),
      movie_genres: movie.genres?.map(g => g.name) || movie.genre_ids || [],
      status: 'wishlist',
      is_favorite: false,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,movie_id' })
  return { data, error }
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
    .select('friend_id')
    .eq('user_id', userId)
  
  if (!data?.length) return []
  
  const friendIds = data.map(f => f.friend_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .in('id', friendIds)
  
  return (profiles || []).map(p => ({ friend_id: p.id, profiles: p }))
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
    .select('*, profiles!movie_suggestions_from_user_id_fkey(full_name, avatar_url)')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
},

  async markSuggestionRead(id) {
    return supabase.from('movie_suggestions').update({ read: true }).eq('id', id)
  },

	async searchUserByEmail(email) {
	  const { data } = await supabase
		.from('profiles')
		.select('*')
		.or(`email.ilike.%${email}%,full_name.ilike.%${email}%`)
		.limit(5)
	  return data || []
	},

	async addFriend(userId, friendId) {
	  const { data, error } = await supabase
		.from('friendships')
		.upsert({ user_id: userId, friend_id: friendId }, { onConflict: 'user_id,friend_id' })
	  return { data, error }
	},

  async getProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  },

  async upsertProfile(userId, profile) {
    return supabase.from('profiles').upsert({ id: userId, ...profile })
  },

  // ── LIBRI ──────────────────────────────────────────────

  async getReadBooks(userId) {
    const { data } = await supabase
      .from('read_books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async addReadBook(userId, book, status = 'read') {
    const { data, error } = await supabase
      .from('read_books')
      .upsert({
        user_id: userId,
        book_id: book.id,
        book_title: book.title,
        book_cover: book.cover,
        book_year: book.year,
        book_authors: book.authors,
        book_pages: book.pages,
        status,
        current_page: 0,
        is_favorite: false,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,book_id' })
    return { data, error }
  },

  async removeReadBook(userId, bookId) {
    return supabase.from('read_books').delete().eq('user_id', userId).eq('book_id', bookId)
  },

  async updateBookStatus(userId, bookId, status) {
    return supabase.from('read_books').update({ status }).eq('user_id', userId).eq('book_id', bookId)
  },

  async updateBookProgress(userId, bookId, currentPage) {
    return supabase.from('read_books').update({ current_page: currentPage }).eq('user_id', userId).eq('book_id', bookId)
  },

  async updateBookRating(userId, bookId, rating) {
    return supabase.from('read_books').update({ rating }).eq('user_id', userId).eq('book_id', bookId)
  },

  async toggleBookFavorite(userId, bookId, current) {
    return supabase.from('read_books').update({ is_favorite: !current }).eq('user_id', userId).eq('book_id', bookId)
  },

  async sendBookSuggestion(fromUserId, toUserId, book, comment = '') {
    return supabase.from('book_suggestions').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      book_id: book.id,
      book_title: book.title,
      book_cover: book.cover,
      book_authors: book.authors,
      comment,
      read: false,
      created_at: new Date().toISOString()
    })
  },

  async getBookSuggestions(userId) {
    const { data } = await supabase
      .from('book_suggestions')
      .select('*, profiles!book_suggestions_from_user_id_fkey(full_name, avatar_url)')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async markBookSuggestionRead(id) {
    return supabase.from('book_suggestions').update({ read: true }).eq('id', id)
  },

  // ── RISTORANTI ────────────────────────────────────────

  async getVisitedRestaurants(userId) {
    const { data } = await supabase
      .from('visited_restaurants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async addVisitedRestaurant(userId, place, status = 'visited') {
    const { data, error } = await supabase
      .from('visited_restaurants')
      .upsert({
        user_id: userId,
        restaurant_id: place.id,
        restaurant_name: place.name,
        restaurant_cover: place.cover,
        restaurant_address: place.address,
        restaurant_city: place.city,
        restaurant_cuisine: place.cuisine,
        restaurant_price_level: place.priceLevel,
        status,
        is_favorite: false,
        labels: [],
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,restaurant_id' })
    return { data, error }
  },

  async addToRestaurantWishlist(userId, place) {
    return this.addVisitedRestaurant(userId, place, 'wishlist')
  },

  async updateRestaurantStatus(userId, restaurantId, status) {
    return supabase.from('visited_restaurants').update({ status }).eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async updateRestaurantRating(userId, restaurantId, rating) {
    return supabase.from('visited_restaurants').update({ rating }).eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async toggleRestaurantFavorite(userId, restaurantId, current) {
    return supabase.from('visited_restaurants').update({ is_favorite: !current }).eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async updateRestaurantNotes(userId, restaurantId, notes) {
    return supabase.from('visited_restaurants').update({ notes }).eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async updateRestaurantLabels(userId, restaurantId, labels) {
    return supabase.from('visited_restaurants').update({ labels }).eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async removeRestaurant(userId, restaurantId) {
    return supabase.from('visited_restaurants').delete().eq('user_id', userId).eq('restaurant_id', restaurantId)
  },

  async sendRestaurantSuggestion(fromUserId, toUserId, place, comment = '') {
    return supabase.from('restaurant_suggestions').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      restaurant_id: place.id,
      restaurant_name: place.name,
      restaurant_cover: place.cover,
      restaurant_city: place.city,
      restaurant_cuisine: place.cuisine,
      comment,
      read: false,
      created_at: new Date().toISOString(),
    })
  },

  async getRestaurantSuggestions(userId) {
    const { data } = await supabase
      .from('restaurant_suggestions')
      .select('*, profiles!restaurant_suggestions_from_user_id_fkey(full_name, avatar_url)')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async markRestaurantSuggestionRead(id) {
    return supabase.from('restaurant_suggestions').update({ read: true }).eq('id', id)
  },

  async getUserCities(userId) {
    const { data } = await supabase
      .from('user_cities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    return data || []
  },

  async addUserCity(userId, cityName) {
    const { data, error } = await supabase
      .from('user_cities')
      .upsert({ user_id: userId, city_name: cityName, created_at: new Date().toISOString() }, { onConflict: 'user_id,city_name' })
    return { data, error }
  },

  async removeUserCity(userId, cityName) {
    return supabase.from('user_cities').delete().eq('user_id', userId).eq('city_name', cityName)
  },
}

