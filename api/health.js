import { db } from './_lib/db.js'
import { json, withCors } from './_lib/http.js'

export default async function handler(req, res) {
  if (withCors(req, res)) return

  const payload = {
    ok: true,
    app: 'LenuMoviz',
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? 'local',
    database: 'unknown',
  }

  try {
    const rows = await db()`select 1 as up`
    payload.database = rows?.[0]?.up === 1 ? 'connected' : 'unexpected-response'
  } catch (error) {
    payload.ok = false
    payload.database = 'error'
    payload.error = error.message
    return json(res, 500, payload)
  }

  return json(res, 200, payload)
}
