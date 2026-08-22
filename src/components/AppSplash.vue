<script setup>
/**
 * In-app splash — shown ONLY inside the Capacitor APK (never on the web).
 * Flow: app opens → brief beat → logo appears → progress bar fills → fade out.
 */
import { onMounted, ref } from 'vue'

const emit = defineEmits(['done'])

const progress = ref(0)
const leaving = ref(false)
const gone = ref(false)

onMounted(() => {
  const t0 = performance.now()
  const DURATION = 1500 // bar fill time
  const DELAY = 250 // the "چند میلی‌ثانیه" beat before things move

  const tick = (now) => {
    const t = Math.max(0, now - t0 - DELAY) / DURATION
    // ease-out so the bar glides into 100%
    progress.value = Math.min(1, 1 - Math.pow(1 - Math.min(t, 1), 2.4))
    if (t < 1) {
      requestAnimationFrame(tick)
    } else {
      leaving.value = true
      setTimeout(() => {
        gone.value = true
        emit('done')
      }, 420)
    }
  }
  requestAnimationFrame(tick)
})
</script>

<template>
  <div
    v-if="!gone"
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-400 ease-out"
    :class="leaving ? 'opacity-0' : 'opacity-100'"
    aria-hidden="true"
  >
    <!-- logo -->
    <svg class="h-24 w-24 animate-in fade-in zoom-in-90 duration-700" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#0a0a0a" />
      <path
        d="M25.5 22.5v19L42 32l-16.5-9.5z"
        fill="#e11d48"
        stroke="#e11d48"
        stroke-width="6"
        stroke-linejoin="round"
      />
    </svg>

    <p class="mt-5 text-lg font-bold tracking-wide text-white animate-in fade-in duration-700">
      لنو موویز
    </p>

    <!-- progress bar -->
    <div class="mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/10" dir="ltr">
      <div
        class="h-full rounded-full bg-[#e11d48]"
        :style="{ width: (progress * 100).toFixed(1) + '%' }"
      />
    </div>

    <!-- version -->
    <p class="absolute bottom-10 text-[11px] font-medium text-white/25" dir="ltr">
      v{{ __APP_VERSION__ }}
    </p>
  </div>
</template>
