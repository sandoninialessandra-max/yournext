export default async function handler(req, res) {
  const key = process.env.FOURSQUARE_API_KEY || process.env.VITE_FOURSQUARE_API_KEY

  // parse path directly from URL — req.query.path is unreliable in Vercel catch-all
  const urlPath = req.url.split('?')[0]
  const pathSuffix = urlPath.replace(/^\/api\/fsq/, '') || '/'

  // diagnostic endpoint
  if (pathSuffix === '/debug') {
    res.status(200).json({
      FOURSQUARE_API_KEY: process.env.FOURSQUARE_API_KEY ? `set (${process.env.FOURSQUARE_API_KEY.length} chars)` : 'NOT SET',
      VITE_FOURSQUARE_API_KEY: process.env.VITE_FOURSQUARE_API_KEY ? `set (${process.env.VITE_FOURSQUARE_API_KEY.length} chars)` : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || 'n/a',
      parsedPath: pathSuffix,
      rawUrl: req.url,
    })
    return
  }

  if (!key) {
    res.status(500).json({ error: 'FOURSQUARE_API_KEY not configured on server' })
    return
  }

  const forwardParams = new URLSearchParams()
  const rawQuery = req.url.includes('?') ? req.url.split('?')[1] : ''
  new URLSearchParams(rawQuery).forEach((v, k) => {
    if (k !== '...path') forwardParams.set(k, v)
  })

  const upstreamUrl = `https://places-api.foursquare.com/places${pathSuffix}?${forwardParams.toString()}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
        'X-Places-Api-Version': '2025-06-17',
      },
    })
    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json')
    res.send(body)
  } catch (err) {
    res.status(502).json({ error: `Upstream fetch failed: ${err.message}` })
  }
}
