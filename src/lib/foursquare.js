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
  const cuisine =
    item.fsq_category_labels?.[0] ||
    item.categories?.[0]?.name ||
    ''
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

// Pro-only fields (free tier eligible) — used for search/popular lists.
// Drops photos/rating/price (Premium, billable) to stay within free quota
// when listing many results. Detail view uses FIELDS_DETAIL with premiums.
const FIELDS_SEARCH = 'fsq_place_id,name,location,fsq_category_labels'
const FIELDS_DETAIL = 'fsq_place_id,name,location,fsq_category_labels,price,rating,photos,description,hours,website'

export const foursquare = {
  async search(query, city) {
    const params = new URLSearchParams({
      query,
      limit: '12',
      fields: FIELDS_SEARCH,
    })
    if (city) params.set('near', city)
    const data = await fetchJson(`${FSQ_BASE}/search?${params.toString()}`)
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  async getPlace(id) {
    const data = await fetchJson(`${FSQ_BASE}/${id}?fields=${FIELDS_DETAIL}`)
    return formatPlace(data)
  },
  async getPopular(city, category) {
    const params = new URLSearchParams({
      query: category || '',
      limit: '12',
      sort: 'POPULARITY',
      fields: FIELDS_SEARCH,
    })
    if (city) params.set('near', city)
    const data = await fetchJson(`${FSQ_BASE}/search?${params.toString()}`)
    return (data.results || []).map(formatPlace).filter(Boolean)
  },
  coverUrl(photo) {
    return photo || null
  },
}
