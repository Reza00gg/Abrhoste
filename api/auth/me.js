import { json, withCors } from '../_lib/http.js'
import { publicUser, userFromRequest } from '../_lib/auth.js'

/** GET /api/auth/me — Bearer token → current user (session survives restarts) */
export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' })

  try {
    const user = await userFromRequest(req)
    if (!user) return json(res, 401, { error: 'unauthorized', message: 'نشست منقضی شده — دوباره وارد شو' })
    return json(res, 200, { user: publicUser(user) })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
