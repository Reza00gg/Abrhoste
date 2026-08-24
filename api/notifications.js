import { db } from './_lib/db.js'
import { json, withCors } from './_lib/http.js'

export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' })

  const since = Number(req.query?.since)
  try {
    const rows = Number.isSafeInteger(since) && since > 0
      ? await db()`select id, title, message, created_at from notifications where id > ${since} order by id asc limit 100`
      : await db()`select id, title, message, created_at from notifications order by id desc limit 50`
    const items = rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      message: row.message,
      createdAt: row.created_at,
    }))
    return json(res, 200, { items, latestId: items.length ? Math.max(...items.map((item) => item.id)) : since || 0 })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطا در دریافت اعلان‌ها' })
  }
}
