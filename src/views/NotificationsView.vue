<script setup>
import { Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  fetchNotifications,
  markNotificationRead,
  notificationState,
  startNotificationPolling,
  stopNotificationPolling,
} from '@/lib/notifications'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const pageLoading = ref(true)
let visibleObserver = null

function observeVisibleNotifications() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  if (!visibleObserver) {
    visibleObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const id = Number(entry.target.getAttribute('data-leno-notification-id'))
        markNotificationRead(id)
        visibleObserver?.unobserve(entry.target)
      }
    }, { threshold: 0.6 })
  }
  document.querySelectorAll('[data-leno-notification-id]').forEach((element) => visibleObserver.observe(element))
}

async function refresh() {
  await fetchNotifications()
  await nextTick()
  observeVisibleNotifications()
}

onMounted(async () => {
  startNotificationPolling()
  const startedAt = Date.now()
  await fetchNotifications()
  const remaining = Math.max(0, 420 - (Date.now() - startedAt))
  if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining))
  pageLoading.value = false
  await nextTick()
  observeVisibleNotifications()
})

watch(() => notificationState.items.map((item) => item.id).join(','), async () => {
  await nextTick()
  observeVisibleNotifications()
})

onBeforeUnmount(() => {
  visibleObserver?.disconnect()
  visibleObserver = null
  stopNotificationPolling()
})
</script>

<template>
  <section class="mx-auto min-h-[calc(100dvh-10.25rem)] w-full max-w-md px-5 pb-10 pt-6">
    <div v-if="pageLoading" class="flex flex-col items-center py-24 text-white/40">
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-[#e11d48]/10 text-[#e11d48]">
        <Bell class="h-6 w-6" />
      </span>
      <Loader2 class="mt-5 h-5 w-5 animate-spin text-white/45" />
      <p class="mt-3 text-xs">در حال دریافت اعلان‌ها…</p>
    </div>

    <div v-else-if="notificationState.loading && !notificationState.loaded" class="flex flex-col items-center py-24 text-white/40">
      <Loader2 class="h-7 w-7 animate-spin" />
      <p class="mt-4 text-xs">در حال دریافت اعلان‌ها…</p>
    </div>

    <div v-else-if="notificationState.error && !notificationState.items.length" class="flex flex-col items-center py-24 text-center">
      <Bell class="h-9 w-9 text-white/20" />
      <p class="mt-4 text-sm text-white/45">{{ notificationState.error }}</p>
      <button v-wave type="button" class="wave-host mt-5 flex h-10 items-center gap-2 rounded-xl bg-white/[0.06] px-4 text-xs font-bold text-white/75" @click="refresh">
        <RefreshCw class="h-4 w-4" />
        تلاش دوباره
      </button>
    </div>

    <div v-else-if="!notificationState.items.length" class="flex flex-col items-center py-24 text-center">
      <CheckCheck class="h-10 w-10 text-white/20" />
      <p class="mt-4 text-sm font-bold text-white/45">فعلاً اعلانی وجود ندارد</p>
      <p class="mt-2 text-xs text-white/25">هر اطلاعیهٔ جدید اینجا نمایش داده می‌شود.</p>
    </div>

    <div v-else class="space-y-2.5">
      <article v-for="item in notificationState.items" :key="item.id" :data-leno-notification-id="item.id" class="rounded-xl border border-white/8 bg-white/[0.035] px-3.5 py-3" @click="markNotificationRead(item.id)">
        <div class="flex items-start gap-2.5">
          <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e11d48]/15 text-[#e11d48]">
            <Bell class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1 text-right">
            <h2 class="text-[13px] font-bold leading-5 text-white">{{ item.title }}</h2>
            <p class="mt-1 whitespace-pre-line text-[12px] leading-6 text-white/60">{{ item.message }}</p>
            <time class="mt-2 block text-[10px] text-white/30" dir="rtl">{{ formatDate(item.createdAt) }}</time>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
