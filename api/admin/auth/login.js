import { db } from '../../_lib/db.js'
import { json, withCors } from '../../_lib/http.js'
import {
  clearLoginFailures,
  checkLoginRate,
  createAdminSession,
  recordLoginFailure,
  verifyAdminPassword,
} from '../../_lib/admin-auth.js'

export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  const username = String(req.body?.username ?? req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  if (!username || username.length > 160 || !password || password.length > 256) {
    return json(res, 401, { error: 'bad_credentials', message: 'نام کاربری یا رمز عبور نادرست است' })
  }

  try {
    await checkLoginRate(username)
    const rows = await db()`
      select id, username, role, active, password_hash
      from admin_users
      where username = ${username}
      limit 1
    `
    const admin = rows[0]
    if (!admin || !admin.active || !verifyAdminPassword(password, admin.password_hash)) {
      await recordLoginFailure(username)
      return json(res, 401, { error: 'bad_credentials', message: 'نام کاربری یا رمز عبور نادرست است' })
    }

    await clearLoginFailures(username)
    await db()`update admin_users set last_login_at = now(), updated_at = now() where id = ${admin.id}`
    await createAdminSession(res, admin.id)
    return json(res, 200, {
      admin: { id: admin.id, username: admin.username, role: admin.role, active: admin.active },
    })
  } catch (error) {
    if (error?.statusCode === 429) return json(res, 429, { error: 'rate_limited', message: 'تلاش‌های ورود بیش از حد مجاز است؛ بعداً دوباره تلاش کنید' })
    return json(res, 500, { error: 'server_error', message: 'خطای سرور — دوباره تلاش کن' })
  }
}
