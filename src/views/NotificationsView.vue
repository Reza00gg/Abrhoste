<script setup>
import { ArrowRight, Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { fetchNotifications, markNotificationsRead, notificationState } from '@/lib/notifications'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

async function refresh() {
  await fetchNotifications()
  markNotificationsRead()
}

onMounted(async () => {
  await fetchNotifications()
  markNotificationsRead()
})
</script>

<template>
  <section class="mx-auto min-h-[calc(100dvh-10.25rem)] w-full max-w-md px-5 pb-10 pt-6">
    <div class="mb-6 flex items-center justify-between">
      <RouterLink
        v-wave
        to="/"
        class="wave-host grid h-10 w-10 place-items-center rounded-xl text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="بازگشت"
      >
        <ArrowRight class="h-5 w-5" />
      </RouterLink>
      <div class="text-center">
        <h1 class="text-lg font-bold text-white">اعلان‌ها</h1>
        <p class="mt-1 text-[11px] text-white/35">خبرها و اطلاعیه‌های لنو موویز</p>
      </div>
      <span class="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-[#e11d48]">
        <Bell class="h-5 w-5" />
      </span>
    </div>

    <div v-if="notificationState.loading && !notificationState.loaded" class="flex flex-col items-center py-24 text-white/40">
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

    <div v-else class="space-y-3">
      <article v-for="item in notificationState.items" :key="item.id" class="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e11d48]/15 text-[#e11d48]">
            <Bell class="h-4.5 w-4.5" />
          </span>
          <div class="min-w-0 flex-1 text-right">
            <h2 class="text-sm font-bold leading-6 text-white">{{ item.title }}</h2>
            <p class="mt-2 whitespace-pre-line text-[13px] leading-7 text-white/60">{{ item.message }}</p>
            <time class="mt-3 block text-[10px] text-white/30" dir="rtl">{{ formatDate(item.createdAt) }}</time>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
