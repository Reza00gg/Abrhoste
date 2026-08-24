import { json, withCors } from '../../_lib/http.js'
import { destroyAdminSession } from '../../_lib/admin-auth.js'

export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })
  try {
    await destroyAdminSession(req, res)
    return json(res, 200, { ok: true })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
