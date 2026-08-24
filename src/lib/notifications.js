import { reactive } from 'vue'

const STORAGE_KEY = 'lenumoviz.notifications.lastSeenId'

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

function lastSeenId() {
  if (typeof window === 'undefined') return 0
  const value = Number(window.localStorage.getItem(STORAGE_KEY))
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}

function recalculateUnread() {
  const seen = lastSeenId()
  notificationState.unread = notificationState.items.filter((item) => item.id > seen).length
}

export async function fetchNotifications({ silent = false } = {}) {
  if (pollingInFlight) return
  pollingInFlight = true
  if (!silent) notificationState.loading = true
  notificationState.error = ''
  try {
    const response = await fetch('/api/notifications', { headers: { Accept: 'application/json' }, cache: 'no-store' })
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

export function markNotificationsRead() {
  if (typeof window === 'undefined') return
  const latest = notificationState.items[0]?.id || notificationState.latestId || 0
  if (latest > 0) window.localStorage.setItem(STORAGE_KEY, String(latest))
  notificationState.unread = 0
}

export function startNotificationPolling() {
  if (typeof window === 'undefined' || pollingTimer) return
  fetchNotifications({ silent: true })
  pollingTimer = window.setInterval(() => fetchNotifications({ silent: true }), 15000)
  focusHandler = () => fetchNotifications({ silent: true })
  window.addEventListener('focus', focusHandler)
}

export function stopNotificationPolling() {
  if (pollingTimer) window.clearInterval(pollingTimer)
  if (focusHandler) window.removeEventListener('focus', focusHandler)
  pollingTimer = null
  focusHandler = null
}
