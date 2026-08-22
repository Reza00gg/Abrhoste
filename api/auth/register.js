import { db } from '../_lib/db.js'
import { json, withCors } from '../_lib/http.js'
import {
  createSession,
  hashPassword,
  normalizeIdentifier,
  publicUser,
  validatePassword,
} from '../_lib/auth.js'

/** POST /api/auth/register  { display_name, identifier, password, password_confirm } */
export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  const { display_name, identifier, password, password_confirm } = req.body ?? {}

  const name = String(display_name ?? '').trim()
  if (name.length < 2) return json(res, 422, { error: 'invalid_name', message: 'نام نمایشی باید حداقل ۲ حرف باشد' })
  if (name.length > 40) return json(res, 422, { error: 'invalid_name', message: 'نام نمایشی بیش از حد طولانی است' })

  const ident = normalizeIdentifier(identifier)
  if (!ident.ok) return json(res, 422, { error: 'invalid_identifier', message: 'ایمیل یا شماره موبایل معتبر نیست' })

  const pwErr = validatePassword(password)
  if (pwErr) return json(res, 422, { error: 'invalid_password', message: pwErr })
  if (password !== password_confirm)
    return json(res, 422, { error: 'password_mismatch', message: 'تکرار رمز عبور یکسان نیست' })

  try {
    const sql = db()
    const dupe = await sql`select 1 from users where identifier = ${ident.value} limit 1`
    if (dupe.length) return json(res, 409, { error: 'exists', message: 'با این ایمیل/شماره قبلاً حساب ساخته شده' })

    const rows = await sql`
      insert into users (display_name, identifier, password_hash, email, name)
      values (${name}, ${ident.value}, ${hashPassword(password)},
              ${ident.kind === 'email' ? ident.value : null}, ${name})
      returning id, display_name, identifier, created_at
    `
    const user = rows[0]
    const token = await createSession(user.id)
    return json(res, 201, { token, user: publicUser(user) })
  } catch (error) {
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
