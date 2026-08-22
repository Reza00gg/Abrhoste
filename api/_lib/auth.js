/**
 * Auth helpers — strong, dependency-free (node:crypto).
 * - Passwords: scrypt (N=16384, r=8, p=1) with a per-user random salt.
 * - Sessions: 256-bit random tokens; only the SHA-256 hash is stored.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { db } from './db.js'

const SCRYPT = { N: 16384, r: 8, p: 1 }
const SESSION_DAYS = 60

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64, SCRYPT).toString('hex')
  return `s2$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  try {
    const [, salt, hash] = String(stored).split('$')
    const calc = scryptSync(password, salt, 64, SCRYPT)
    return timingSafeEqual(Buffer.from(hash, 'hex'), calc)
  } catch {
    return false
  }
}

const hashToken = (t) => createHash('sha256').update(t).digest('hex')

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  await db()`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, now() + ${SESSION_DAYS + ' days'}::interval)
  `
  return token
}

/** Resolve the user for a Bearer token; null when missing/expired. */
export async function userFromRequest(req) {
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization ?? '')
  if (!m) return null
  const rows = await db()`
    select u.id, u.display_name, u.identifier, u.created_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(m[1])} and s.expires_at > now()
    limit 1
  `
  return rows[0] ?? null
}

export async function destroySession(req) {
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization ?? '')
  if (!m) return
  await db()`delete from sessions where token_hash = ${hashToken(m[1])}`
}

/* ---------- validation ---------- */

const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const normDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => faDigits.indexOf(d))

/** Returns { ok, value, kind } — kind is 'email' | 'phone'. */
export function normalizeIdentifier(raw) {
  const v = normDigits(String(raw ?? '').trim().toLowerCase())
  if (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) return { ok: true, value: v, kind: 'email' }
  const digits = v.replace(/[\s-]/g, '')
  if (/^(\+?\d{10,15}|0\d{9,10})$/.test(digits)) return { ok: true, value: digits, kind: 'phone' }
  return { ok: false }
}

export function validatePassword(pw) {
  const v = String(pw ?? '')
  if (v.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد'
  if (v.length > 72) return 'رمز عبور بیش از حد طولانی است'
  return null
}

export const publicUser = (u) => ({
  id: u.id,
  display_name: u.display_name,
  identifier: u.identifier,
  created_at: u.created_at,
})
