<script setup>
import { Bell, Menu } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { notificationState, startNotificationPolling, stopNotificationPolling } from '@/lib/notifications'
import { toast } from '@/lib/toast'

const router = useRouter()

function openMenu() {
  toast('این بخش در حال توسعه است', 'info')
}

function openNotifications() {
  router.push({ name: 'notifications' })
}

onMounted(startNotificationPolling)
onBeforeUnmount(stopNotificationPolling)
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-black/80 backdrop-blur-xl backdrop-saturate-150"
    :style="{ paddingTop: 'env(safe-area-inset-top, 0px)' }"
  >
    <div class="relative mx-auto flex h-14 max-w-md items-center justify-center px-4">
      <button
        v-wave
        type="button"
        class="wave-host absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="منو"
        @click="openMenu"
      >
        <Menu class="h-[22px] w-[22px]" :stroke-width="2" />
      </button>

      <RouterLink to="/" class="select-none text-[16px] font-bold tracking-tight text-white">
        لنوموییز
      </RouterLink>

      <button
        v-wave
        type="button"
        class="wave-host absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="اعلان‌ها"
        @click="openNotifications"
      >
        <Bell class="h-[21px] w-[21px]" :stroke-width="2" />
        <span
          v-if="notificationState.unread > 0"
          class="absolute left-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#e11d48] px-1 text-[9px] font-bold leading-none text-white"
        >
          {{ notificationState.unread > 99 ? '۹۹+' : notificationState.unread }}
        </span>
      </button>
    </div>
  </header>
</template>
