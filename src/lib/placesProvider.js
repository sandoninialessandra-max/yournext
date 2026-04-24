import { foursquare } from './foursquare.js'

const PROVIDER = import.meta.env.VITE_PLACES_PROVIDER || 'foursquare'

function active() {
  if (PROVIDER === 'foursquare') return foursquare
  if (PROVIDER === 'google') throw new Error('Places provider "google" non implementato in v1')
  throw new Error(`VITE_PLACES_PROVIDER="${PROVIDER}" non supportato`)
}

export const placesProvider = {
  search: (query, city) => active().search(query, city),
  getPlace: (id) => active().getPlace(id),
  getPopular: (city, category) => active().getPopular(city, category),
  coverUrl: (photo) => active().coverUrl(photo),
}
