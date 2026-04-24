export default async function handler(req, res) {
  const key = process.env.FOURSQUARE_API_KEY || process.env.VITE_FOURSQUARE_API_KEY
  if (!key) {
    res.status(500).json({ error: 'FOURSQUARE_API_KEY not configured on server' })
    return
  }

  const pathArr = req.query.path || []
  const pathSuffix = Array.isArray(pathArr) ? '/' + pathArr.join('/') : '/' + pathArr

  const forwardParams = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue
    if (Array.isArray(v)) v.forEach((vv) => forwardParams.append(k, vv))
    else forwardParams.set(k, v)
  }

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
