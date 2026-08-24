import { reactive } from 'vue'
import { API_BASE } from '@/lib/api'

const READ_KEY = 'lenumoviz.notifications.readIds'
const LEGACY_LAST_SEEN_KEY = 'lenumoviz.notifications.lastSeenId'
const MAX_REMEMBERED_READ = 500

export const notificationState = reactive({
  items: [],
  unread: 0,
  latestId: 0,
  loading: false,
  loaded: false,
  error: '',
})

let pollingTimer = null
let pollingInFlight = false
let focusHandler = null

function readIds() {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = JSON.parse(window.localStorage.getItem(READ_KEY) || '[]')
    return new Set(raw.filter((id) => Number.isSafeInteger(Number(id))).map(Number))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids) {
  if (typeof window === 'undefined') return
  const values = [...ids].sort((a, b) => b - a).slice(0, MAX_REMEMBERED_READ)
  window.localStorage.setItem(READ_KEY, JSON.stringify(values))
}

function migrateLegacyReadState(ids) {
  if (typeof window === 'undefined' || ids.size) return ids
  const legacy = Number(window.localStorage.getItem(LEGACY_LAST_SEEN_KEY))
  if (!Number.isSafeInteger(legacy) || legacy < 1) return ids
  for (const item of notificationState.items) if (Number(item.id) <= legacy) ids.add(Number(item.id))
  saveReadIds(ids)
  window.localStorage.removeItem(LEGACY_LAST_SEEN_KEY)
  return ids
}

function recalculateUnread() {
  const ids = migrateLegacyReadState(readIds())
  notificationState.unread = notificationState.items.filter((item) => !ids.has(Number(item.id))).length
}

export function markNotificationRead(id) {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId < 1) return
  const ids = readIds()
  ids.add(numericId)
  saveReadIds(ids)
  recalculateUnread()
}

export function markNotificationsRead(idsToMark = notificationState.items.map((item) => item.id)) {
  const ids = readIds()
  for (const id of idsToMark) if (Number.isSafeInteger(Number(id))) ids.add(Number(id))
  saveReadIds(ids)
  recalculateUnread()
}

export async function fetchNotifications({ silent = false } = {}) {
  if (pollingInFlight) return
  pollingInFlight = true
  if (!silent) notificationState.loading = true
  notificationState.error = ''
  try {
    const response = await fetch(`${API_BASE}/api/notifications`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!response.ok) throw new Error('notifications_failed')
    const data = await response.json()
    const incoming = Array.isArray(data.items) ? data.items : []
    const byId = new Map(notificationState.items.map((item) => [item.id, item]))
    for (const item of incoming) byId.set(Number(item.id), item)
    notificationState.items = [...byId.values()]
      .filter((item) => Number.isSafeInteger(Number(item.id)))
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 50)
    notificationState.latestId = Number(data.latestId || notificationState.items[0]?.id || 0)
    notificationState.loaded = true
    recalculateUnread()
  } catch {
    notificationState.error = 'اعلان‌ها در دسترس نیستند'
  } finally {
    notificationState.loading = false
    pollingInFlight = false
  }
}

export function startNotificationPolling() {
  if (typeof window === 'undefined' || pollingTimer) return
  fetchNotifications({ silent: true })
  pollingTimer = window.setInterval(() => fetchNotifications({ silent: true }), 5000)
  focusHandler = () => {
    if (document.visibilityState !== 'hidden') fetchNotifications({ silent: true })
  }
  window.addEventListener('focus', focusHandler)
  document.addEventListener('visibilitychange', focusHandler)
  window.addEventListener('pageshow', focusHandler)
}

export function stopNotificationPolling() {
  if (pollingTimer) window.clearInterval(pollingTimer)
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
    document.removeEventListener('visibilitychange', focusHandler)
    window.removeEventListener('pageshow', focusHandler)
  }
  pollingTimer = null
  focusHandler = null
}
