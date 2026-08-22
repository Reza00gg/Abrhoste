import { db } from './_lib/db.js'
import { json, withCors } from './_lib/http.js'

/**
 * GET /api/titles?q=&kind=movie|series&limit=
 * Returns the catalogue rows stored in Neon.
 */
export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const url = new URL(req.url, `https://${req.headers.host}`)
  const q = (url.searchParams.get('q') ?? '').trim()
  const kind = url.searchParams.get('kind')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 24, 60)

  try {
    const sql = db()
    const rows = await sql`
      select id, slug, title, original_title, kind, year, rating, poster_url, overview
      from titles
      where (${q} = '' or title ilike ${'%' + q + '%'} or original_title ilike ${'%' + q + '%'})
        and (${kind}::text is null or kind = ${kind})
      order by rating desc nulls last, year desc
      limit ${limit}
    `
    return json(res, 200, { count: rows.length, items: rows }, 60)
  } catch (error) {
    return json(res, 500, { error: 'query_failed', message: error.message })
  }
}
