import { db } from '../_lib/db.js'
import { json, withCors } from '../_lib/http.js'
import { createSession, normalizeIdentifier, publicUser, verifyPassword } from '../_lib/auth.js'

/** POST /api/auth/login  { identifier, password } */
export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  const { identifier, password } = req.body ?? {}

  const ident = normalizeIdentifier(identifier)
  if (!ident.ok) return json(res, 422, { error: 'invalid_identifier', message: 'ایمیل یا شماره موبایل معتبر نیست' })
  if (!password) return json(res, 422, { error: 'invalid_password', message: 'رمز عبور را وارد کن' })

  try {
    const rows = await db()`
      select id, display_name, identifier, password_hash, created_at
      from users where identifier = ${ident.value} limit 1
    `
    const user = rows[0]
    if (!user || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: 'bad_credentials', message: 'حسابی با این اطلاعات پیدا نشد' })
    }
    const token = await createSession(user.id)
    return json(res, 200, { token, user: publicUser(user) })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
