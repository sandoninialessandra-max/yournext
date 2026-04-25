const FSQ_BASE = '/api/fsq'

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Foursquare ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

function formatPlace(item) {
  if (!item) return null
  const loc = item.location || {}
  const name = item.name || 'Locale sconosciuto'
  const address = loc.address || ''
  const photo = item.photos?.[0]
  const cuisine = item.categories?.[0]?.name || item.categories?.[0] || ''
  return {
    id: item.fsq_place_id || item.fsq_id || item.id,
    name,
    address,
    city: loc.locality || loc.region || '',
    cuisine,
    priceLevel: item.price ?? null,
    rating: item.rating ?? null,
    cover: photo ? `${photo.prefix}300x300${photo.suffix}` : null,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${address}`.trim())}`,
  }
}

// Pro fields only — categories is needed to power the cuisine-aware placeholder.
// Premium fields (photos, rating, price, hours, description, website) excluded
// because the account currently has no Premium credits. To re-enable when
// billing is configured, append them to FIELDS_PRO and pass on getPlace.
const FIELDS_PRO = 'fsq_place_id,name,location,categories'

export const foursquare = {
  async search(query, city) {
    const params = new URLSearchParams({ query, limit: '12', fields: FIELDS_PRO })
    if (city) params.set('near', city)
    const data = await fetchJson(`${FSQ_BASE}/search?${params.toString()}`)
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  async getPlace(id) {
    const data = await fetchJson(`${FSQ_BASE}/${id}?fields=${FIELDS_PRO}`)
    return formatPlace(data)
  },
  async getPopular(city, category) {
    const params = new URLSearchParams({ limit: '12', sort: 'POPULARITY', fields: FIELDS_PRO })
    if (category) params.set('query', category)
    if (city) params.set('near', city)
    const data = await fetchJson(`${FSQ_BASE}/search?${params.toString()}`)
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  coverUrl(photo) {
    return photo || null
  },
}
