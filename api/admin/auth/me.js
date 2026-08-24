import { json, withCors } from '../../_lib/http.js'
import { requireAdmin } from '../../_lib/admin-auth.js'

export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' })
  const admin = await requireAdmin(req, res)
  if (!admin) return
  return json(res, 200, { admin })
}
