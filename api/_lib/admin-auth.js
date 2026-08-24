import { createHash, randomBytes } from 'node:crypto'
import { db } from './db.js'
import { verifyPassword } from './auth.js'

const COOKIE = 'leno_admin_session'
const SESSION_SECONDS = 8 * 60 * 60
const WINDOW_SECONDS = 15 * 60
const MAX_FAILURES = 5

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function cookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

function setCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  )
}

export function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`)
}

export async function adminFromRequest(req) {
  const token = cookies(req)[COOKIE]
  if (!token || !/^[A-Za-z0-9_-]{40,}$/.test(token)) return null
  const rows = await db()`
    select a.id, a.username, a.role, a.active
    from admin_sessions s
    join admin_users a on a.id = s.admin_id
    where s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
      and a.active = true
    limit 1
  `
  return rows[0] ?? null
}

export async function requireAdmin(req, res) {
  const admin = await adminFromRequest(req)
  if (!admin) {
    clearAdminCookie(res)
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'unauthorized', message: 'دسترسی مدیر لازم است' }))
    return null
  }
  return admin
}

export async function createAdminSession(res, adminId) {
  const token = randomBytes(32).toString('base64url')
  await db()`
    insert into admin_sessions (token_hash, admin_id, expires_at)
    values (${hashToken(token)}, ${adminId}, now() + ${SESSION_SECONDS + ' seconds'}::interval)
  `
  setCookie(res, token)
}

export async function destroyAdminSession(req, res) {
  const token = cookies(req)[COOKIE]
  if (token && /^[A-Za-z0-9_-]{40,}$/.test(token)) {
    await db()`delete from admin_sessions where token_hash = ${hashToken(token)}`
  }
  clearAdminCookie(res)
}

export async function checkLoginRate(identifier) {
  const rows = await db()`
    select failures, blocked_until, window_started_at
    from admin_login_attempts where identifier = ${identifier} limit 1
  `
  const row = rows[0]
  if (!row) return
  if (row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    const error = new Error('rate_limited')
    error.statusCode = 429
    throw error
  }
  if (Date.now() - new Date(row.window_started_at).getTime() > WINDOW_SECONDS * 1000) {
    await db()`delete from admin_login_attempts where identifier = ${identifier}`
  }
}

export async function recordLoginFailure(identifier) {
  const rows = await db()`select failures, window_started_at from admin_login_attempts where identifier = ${identifier} limit 1`
  const row = rows[0]
  const fresh = !row || Date.now() - new Date(row.window_started_at).getTime() > WINDOW_SECONDS * 1000
  const failures = fresh ? 1 : Number(row.failures || 0) + 1
  const blockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + WINDOW_SECONDS * 1000) : null
  await db()`
    insert into admin_login_attempts (identifier, failures, window_started_at, blocked_until, updated_at)
    values (${identifier}, ${failures}, now(), ${blockedUntil}, now())
    on conflict (identifier) do update set
      failures = excluded.failures,
      window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until,
      updated_at = now()
  `
}

export async function clearLoginFailures(identifier) {
  await db()`delete from admin_login_attempts where identifier = ${identifier}`
}

export { COOKIE as ADMIN_COOKIE }
export { verifyPassword as verifyAdminPassword }
