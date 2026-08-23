/**
 * API base:
 *  - web build   → '' (same origin, Vercel serves /api next to the SPA)
 *  - android/APK → full https URL injected at build time via VITE_API_BASE
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  health: (options = {}) => request('/api/health', options),
  titles: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString()
    return request(`/api/titles${qs ? `?${qs}` : ''}`)
  },
}
