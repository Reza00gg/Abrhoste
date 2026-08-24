<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import NotificationHeader from '@/components/NotificationHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import AppSplash from '@/components/AppSplash.vue'
import UpdateGate from '@/components/UpdateGate.vue'
import Toasts from '@/components/Toasts.vue'
import { initAuth } from '@/lib/auth'

// true only inside the Capacitor WebView (never on the website)
const isNativeApp = !!window.Capacitor?.isNativePlatform?.()
const route = useRoute()
const isAdminRoute = computed(() => route.name === 'admin')
const isNotificationsRoute = computed(() => route.name === 'notifications')

// بازیابی بی‌صدای نشست — برنامه باز شد، حساب همون‌جاست
initAuth()
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-background text-foreground">
    <AppSplash v-if="isNativeApp" />
    <UpdateGate v-if="isNativeApp" />
    <AppHeader v-if="!isAdminRoute && !isNotificationsRoute" />
    <NotificationHeader v-else-if="isNotificationsRoute" />
    <Toasts />

    <main
      class="flex-1"
      :class="isAdminRoute ? '' : 'pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]'"
    >
      <RouterView v-slot="{ Component, route: activeRoute }">
        <Transition name="page" mode="out-in">
          <div :key="activeRoute.name" class="min-h-full">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </main>

    <BottomNav v-if="!isAdminRoute" />
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
