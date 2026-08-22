<script setup>
import { onMounted, ref } from 'vue'
import { api } from '@/lib/api'

const state = ref('loading') // loading | online | offline
const detail = ref('در حال بررسی…')

onMounted(async () => {
  try {
    const res = await api.health()
    state.value = res.database === 'connected' ? 'online' : 'offline'
    detail.value = res.database === 'connected' ? 'Neon متصل است' : 'پایگاه داده در دسترس نیست'
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
        'bg-rose-500': state === 'offline',
      }"
    />
    {{ detail }}
  </div>
</template>
