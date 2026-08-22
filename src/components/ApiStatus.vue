<script setup>
import { onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { CURRENT_VERSION, isNewer } from '@/lib/updater'

const state = ref('loading') // loading | online | outdated | offline
const detail = ref('در حال بررسی…')

const isNativeApp = !!window.Capacitor?.isNativePlatform?.()

onMounted(async () => {
  try {
    const res = await api.health()
    if (res.database !== 'connected') {
      state.value = 'offline'
      detail.value = 'پایگاه داده در دسترس نیست'
      return
    }
    // اعتبارسنجی نسخه از سمت پایگاه داده (فقط داخل اپ)
    if (isNativeApp && res.latest_version && isNewer(res.latest_version, CURRENT_VERSION)) {
      state.value = 'outdated'
      detail.value = 'نسخه قدیمی است'
      return
    }
    state.value = 'online'
    detail.value = 'Neon متصل است'
  } catch {
    state.value = 'offline'
    detail.value = 'سرویس در دسترس نیست'
  }
})
</script>

<template>
  <div
    class="mt-8 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/45"
  >
    <span
      class="h-1.5 w-1.5 rounded-full transition-colors"
      :class="{
        'animate-pulse bg-white/40': state === 'loading',
        'bg-emerald-400': state === 'online',
        'animate-pulse bg-rose-500': state === 'outdated',
        'bg-rose-500': state === 'offline',
      }"
    />
    {{ detail }}
  </div>
</template>
