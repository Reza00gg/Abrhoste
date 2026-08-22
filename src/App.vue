<script setup>
import BottomNav from '@/components/BottomNav.vue'
import AppSplash from '@/components/AppSplash.vue'
import UpdateGate from '@/components/UpdateGate.vue'
import Toasts from '@/components/Toasts.vue'
import { initAuth } from '@/lib/auth'

// true only inside the Capacitor WebView (the APK) — never on the website
const isNativeApp = !!window.Capacitor?.isNativePlatform?.()

// بازیابی بی‌صدای نشست — برنامه باز شد، حساب همون‌جاست
initAuth()
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-background text-foreground">
    <AppSplash v-if="isNativeApp" />
    <UpdateGate v-if="isNativeApp" />
    <Toasts />
    <!-- content -->
    <main class="flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] safe-t">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <div :key="route.name" class="min-h-[calc(100dvh-4.75rem)]">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </main>

    <BottomNav />
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
