<script setup>
/**
 * Native-only startup gate.
 * The app stays behind this splash until the API and database answer
 * successfully. After entry, the connection is not checked again here.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

const emit = defineEmits(['done'])
const version = __APP_VERSION__

const state = ref('idle') // idle | checking | offline | loading | done
const progress = ref(0)
const leaving = ref(false)
const gone = ref(false)

const CONNECTION_MESSAGE = 'اتصال برقرار نشد، لطفاً اینترنت خود را روشن کنید'
const CONNECTION_TIMEOUT = 6000
let animationFrame = 0
let exitTimer = 0

function showOffline() {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  progress.value = 0
  leaving.value = false
  state.value = 'offline'
  toast(CONNECTION_MESSAGE)
}

function playExitAnimation() {
  const startedAt = performance.now()
  const DELAY = 100
  const DURATION = 850

  const tick = (now) => {
    const elapsed = Math.max(0, now - startedAt - DELAY) / DURATION
    progress.value = Math.min(1, 1 - Math.pow(1 - Math.min(elapsed, 1), 2.4))

    if (elapsed < 1) {
      animationFrame = requestAnimationFrame(tick)
      return
    }

    animationFrame = 0
    leaving.value = true
    exitTimer = window.setTimeout(() => {
      state.value = 'done'
      gone.value = true
      emit('done')
    }, 420)
  }

  animationFrame = requestAnimationFrame(tick)
}

async function retryConnection() {
  if (state.value === 'checking' || state.value === 'loading') return

  state.value = 'checking'
  progress.value = 0
  leaving.value = false

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)

  try {
    // Do not trust navigator.onLine alone: Android WebView can report it
    // incorrectly. The real health request is the source of truth.
    const result = await api.health({ signal: controller.signal })
    if (result?.ok !== true || result?.database !== 'connected') {
      throw new Error('service_unavailable')
    }

    state.value = 'loading'
    playExitAnimation()
  } catch {
    showOffline()
  } finally {
    window.clearTimeout(timeout)
  }
}

onMounted(retryConnection)

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (exitTimer) window.clearTimeout(exitTimer)
})
</script>

<template>
  <div
    v-if="!gone"
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-200 ease-out"
    :class="leaving ? 'opacity-0' : 'opacity-100'"
    role="dialog"
    aria-label="در حال آماده‌سازی برنامه"
  >
    <svg class="h-24 w-24 animate-in fade-in zoom-in-90 duration-300" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#0a0a0a" />
      <path
        d="M25.5 22.5v19L42 32l-16.5-9.5z"
        fill="#e11d48"
        stroke="#e11d48"
        stroke-width="6"
        stroke-linejoin="round"
      />
    </svg>

    <p class="mt-5 text-lg font-bold tracking-wide text-white animate-in fade-in duration-300">
      لنو موویز
    </p>

    <!-- The bar is the only loading indicator. It stays at zero until the
         real API + database check succeeds. -->
    <div
      v-if="state !== 'offline' && state !== 'done'"
      class="mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/10"
      dir="ltr"
    >
      <div class="h-full rounded-full bg-[#e11d48]" :style="{ width: (progress * 100).toFixed(1) + '%' }" />
    </div>

    <div v-else-if="state === 'offline'" class="mt-12 flex w-full max-w-sm flex-col items-center px-6">
      <button
        v-wave
        type="button"
        class="wave-host h-12 w-full rounded-2xl bg-[#e11d48] px-6 text-sm font-bold text-white"
        @click="retryConnection"
      >
        مجدد
      </button>
    </div>

    <p class="absolute bottom-10 text-[11px] font-medium text-white/25" dir="ltr">
      v{{ version }}
    </p>
  </div>
</template>
