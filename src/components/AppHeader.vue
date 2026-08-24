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
  <header class="app-header">
    <div class="app-header__row">
      <button
        v-wave
        type="button"
        class="app-header__action app-header__action--menu wave-host"
        aria-label="منو"
        @click="openMenu"
      >
        <Menu class="app-header__icon" :stroke-width="2" />
      </button>

      <RouterLink to="/" class="app-header__brand" dir="rtl">لنوموییز</RouterLink>

      <button
        v-wave
        type="button"
        class="app-header__action app-header__action--notifications wave-host"
        aria-label="اعلان‌ها"
        @click="openNotifications"
      >
        <Bell class="app-header__icon" :stroke-width="2" />
        <span v-if="notificationState.unread > 0" class="app-header__badge" dir="rtl">
          {{ notificationState.unread > 99 ? '۹۹+' : notificationState.unread }}
        </span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 40;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  background: rgba(0, 0, 0, .80);
  padding-top: env(safe-area-inset-top, 0px);
  backdrop-filter: blur(18px) saturate(150%);
}

.app-header__row {
  position: relative;
  width: 100%;
  height: 56px;
  direction: ltr;
}

.app-header__action {
  position: absolute;
  top: 8px;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  color: rgba(255, 255, 255, .58);
  transition: background-color .2s ease, color .2s ease;
}

.app-header__action:hover {
  background: rgba(255, 255, 255, .06);
  color: #fff;
}

.app-header__action--menu {
  right: 16px;
  left: auto;
}

.app-header__action--notifications {
  right: auto;
  left: 16px;
}

.app-header__icon {
  width: 22px;
  height: 22px;
}

.app-header__brand {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: calc(100% - 180px);
  overflow: hidden;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__badge {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 999px;
  background: #e11d48;
  padding: 0 4px;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}
</style>
