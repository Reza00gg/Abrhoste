import { json, withCors } from '../_lib/http.js'
import { destroySession } from '../_lib/auth.js'

/** POST /api/auth/logout — Bearer token → session revoked server-side */
export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  try {
    await destroySession(req)
    return json(res, 200, { ok: true })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
