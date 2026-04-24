const FSQ_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY
const FSQ_BASE = 'https://api.foursquare.com/v3/places'

function ensureKey() {
  if (!FSQ_KEY) {
    throw new Error('VITE_FOURSQUARE_API_KEY mancante — configura .env.local con la chiave Foursquare')
  }
}

function formatPlace(item) {
  if (!item) return null
  const loc = item.location || {}
  const name = item.name || 'Locale sconosciuto'
  const address = loc.address || ''
  const photo = item.photos?.[0]
  return {
    id: item.fsq_id,
    name,
    address,
    city: loc.locality || '',
    cuisine: item.categories?.[0]?.name || '',
    priceLevel: item.price ?? null,
    rating: item.rating ?? null,
    cover: photo ? `${photo.prefix}300x300${photo.suffix}` : null,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${address}`.trim())}`,
  }
}

const FIELDS_SEARCH = 'fsq_id,name,location,categories,price,rating,photos'
const FIELDS_DETAIL = 'fsq_id,name,location,categories,price,rating,photos,description,hours,website'

export const foursquare = {
  async search(query, city) {
    ensureKey()
    const params = new URLSearchParams({
      query,
      limit: '12',
      fields: FIELDS_SEARCH,
    })
    if (city) params.set('near', city)
    const res = await fetch(`${FSQ_BASE}/search?${params.toString()}`, {
      headers: { Accept: 'application/json', Authorization: FSQ_KEY },
    })
    const data = await res.json()
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  async getPlace(id) {
    ensureKey()
    const res = await fetch(`${FSQ_BASE}/${id}?fields=${FIELDS_DETAIL}`, {
      headers: { Accept: 'application/json', Authorization: FSQ_KEY },
    })
    return formatPlace(await res.json())
  },
  async getPopular(city, category) {
    ensureKey()
    const params = new URLSearchParams({
      query: category || '',
      limit: '12',
      sort: 'POPULARITY',
      fields: FIELDS_SEARCH,
    })
    if (city) params.set('near', city)
    const res = await fetch(`${FSQ_BASE}/search?${params.toString()}`, {
      headers: { Accept: 'application/json', Authorization: FSQ_KEY },
    })
    const data = await res.json()
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  coverUrl(photo) {
    return photo || null
  },
}
