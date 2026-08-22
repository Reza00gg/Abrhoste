/**
 * Global toast system — one call from anywhere: toast('پیام', 'error' | 'success')
 * Rendered by <Toasts/> in App.vue: slides up from the bottom, then eases back down.
 */
import { reactive } from 'vue'

export const toasts = reactive([])
let nextId = 0

export function toast(message, type = 'error', duration = 3200) {
  const t = { id: ++nextId, message, type }
  toasts.push(t)
  // در هر لحظه حداکثر ۲ نوتیف — تمیز بمونه
  while (toasts.length > 2) toasts.shift()
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === t.id)
    if (i !== -1) toasts.splice(i, 1)
  }, duration)
}
