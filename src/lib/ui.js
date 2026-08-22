/**
 * Shared UI state.
 * keyboardOpen flips to true the very instant a form field is focused on a
 * touch device (focusin fires BEFORE the keyboard animates in → zero flash),
 * and back to false when focus leaves or the viewport height is restored.
 */
import { ref } from 'vue'

export const keyboardOpen = ref(false)

const isFormEl = (el) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)

let inited = false
export function initUiState() {
  if (inited) return
  inited = true

  // فقط دستگاه‌های لمسی — دسکتاپ کیبورد مجازی نداره
  const touch = window.matchMedia('(pointer: coarse)').matches
  if (!touch) return

  const base = Math.max(window.innerHeight, window.visualViewport?.height ?? 0)

  document.addEventListener('focusin', (e) => {
    if (isFormEl(e.target)) keyboardOpen.value = true
  })
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!isFormEl(document.activeElement)) keyboardOpen.value = false
    }, 120)
  })

  // پشتیبان: دکمه back کیبورد رو می‌بنده ولی فوکوس می‌مونه
  const onResize = () => {
    const h = window.visualViewport?.height ?? window.innerHeight
    if (h >= base - 100) keyboardOpen.value = false
    else if (h < base - 150 && isFormEl(document.activeElement)) keyboardOpen.value = true
  }
  window.visualViewport?.addEventListener('resize', onResize)
  window.addEventListener('resize', onResize)
}
