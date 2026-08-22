/**
 * Small helpers shared by all serverless functions.
 * CORS is required because the Android (Capacitor) build runs from
 * the `https://localhost` WebView origin, not from the Vercel domain.
 */
const ALLOWED = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
])

export function withCors(req, res) {
  const origin = req.headers.origin
  if (origin && (ALLOWED.has(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function json(res, status, body, cacheSeconds = 0) {
  if (cacheSeconds > 0) {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}`,
    )
  } else {
    res.setHeader('Cache-Control', 'no-store')
  }
  res.status(status).json(body)
}
