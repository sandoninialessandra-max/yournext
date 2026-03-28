const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p'

export const tmdb = {
  posterUrl: (path, size = 'w500') => path ? `${TMDB_IMG}/${size}${path}` : null,
  backdropUrl: (path, size = 'w1280') => path ? `${TMDB_IMG}/${size}${path}` : null,

  async search(query) {
    const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=it-IT`)
    const d = await r.json()
    return d.results || []
  },

  async getMovie(id) {
    const r = await fetch(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=it-IT&append_to_response=credits,watch/providers,similar,videos,release_dates`)
    return r.json()
  },

  async getNowPlaying() {
    const r = await fetch(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&language=it-IT&region=IT`)
    const d = await r.json()
    return d.results || []
  },

  async getUpcoming() {
    const r = await fetch(`${TMDB_BASE}/movie/upcoming?api_key=${TMDB_KEY}&language=it-IT&region=IT`)
    const d = await r.json()
    return d.results || []
  },

  async getTrending() {
    const r = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&language=it-IT`)
    const d = await r.json()
    return d.results || []
  },

  async getPopular() {
    const r = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=it-IT`)
    const d = await r.json()
    return d.results || []
  },

  getWatchProviders(movieData) {
    const providers = movieData?.['watch/providers']?.results?.IT
    if (!providers) return { flatrate: [], rent: [], buy: [], cinema: false }
    return {
      flatrate: providers.flatrate || [],
      rent: providers.rent || [],
      buy: providers.buy || [],
      link: providers.link
    }
  }
}
