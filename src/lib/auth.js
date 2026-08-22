/**
 * Client auth store — reactive, persistent.
 * The token lives in localStorage (survives app/site restarts); on startup we
 * silently re-validate it against /api/auth/me so the account is "just there".
 */
import { reactive } from 'vue'
import { API_BASE } from './api'

const TOKEN_KEY = 'lm_token'
const USER_KEY = 'lm_user'

export const auth = reactive({
  user: safeParse(localStorage.getItem(USER_KEY)), // نمایش فوری — بدون فلش «وارد نشده»
  token: localStorage.getItem(TOKEN_KEY) ?? '',
  ready: false,
})

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

function persist() {
  if (auth.token) localStorage.setItem(TOKEN_KEY, auth.token)
  else localStorage.removeItem(TOKEN_KEY)
  if (auth.user) localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
  else localStorage.removeItem(USER_KEY)
}

async function call(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('اتصال برقرار نشد — اینترنت را بررسی کن')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? 'خطای ناشناخته — دوباره تلاش کن')
  return data
}

/** Called once at app start. */
export async function initAuth() {
  if (!auth.token) {
    auth.user = null
    auth.ready = true
    return
  }
  try {
    const { user } = await call('/api/auth/me')
    auth.user = user
  } catch (e) {
    // فقط وقتی سرور صریحاً گفت نشست نامعتبره پاک کن — آفلاین بودن حساب را نمی‌پراند
    if (/نشست/.test(e.message)) {
      auth.token = ''
      auth.user = null
    }
  } finally {
    persist()
    auth.ready = true
  }
}

export async function register(payload) {
  const { token, user } = await call('/api/auth/register', { method: 'POST', body: payload })
  auth.token = token
  auth.user = user
  persist()
  return user
}

export async function login(payload) {
  const { token, user } = await call('/api/auth/login', { method: 'POST', body: payload })
  auth.token = token
  auth.user = user
  persist()
  return user
}

export async function logout() {
  try {
    await call('/api/auth/logout', { method: 'POST' })
  } catch {
    /* حتی اگر سرور در دسترس نبود، محلی خارج شو */
  }
  auth.token = ''
  auth.user = null
  persist()
}
