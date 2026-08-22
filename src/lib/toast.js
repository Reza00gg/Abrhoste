/**
 * Global toast system — one call from anywhere: toast('پیام', 'error' | 'success')
 * Minimal, native-app feel. Spam-proof: the same message can only appear once
 * per window, and there is a short global cooldown between toasts.
 */
import { reactive } from 'vue'

export const toasts = reactive([])
let nextId = 0
let lastAt = 0
const lastByMessage = new Map()

export function toast(message, type = 'error', duration = 3000) {
  const now = Date.now()
  // همون پیام تا وقتی بازه‌ش تموم نشده دوباره نیاد
  if (now - (lastByMessage.get(message) ?? 0) < duration + 500) return
  // فاصله‌ی نفس‌گیری بین هر دو نوتیف
  if (now - lastAt < 700) return

  lastAt = now
  lastByMessage.set(message, now)

  const t = { id: ++nextId, message, type }
  // فقط یک نوتیف روی صفحه — تمیز
  toasts.splice(0, toasts.length, t)
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === t.id)
    if (i !== -1) toasts.splice(i, 1)
  }, duration)
}
