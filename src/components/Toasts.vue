<script setup>
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import { toasts } from '@/lib/toast'
import { keyboardOpen } from '@/lib/ui'
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-[120] flex flex-col items-center gap-2 px-6 transition-[bottom] duration-200"
    :class="keyboardOpen ? 'bottom-4' : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="flex w-full max-w-sm items-center gap-2.5 rounded-xl bg-[#232327] px-4 py-3 text-[13px] font-medium text-white/90 shadow-lg shadow-black/40"
      >
        <component
          :is="t.type === 'success' ? CircleCheck : CircleAlert"
          class="h-4.5 w-4.5 shrink-0"
          :class="t.type === 'success' ? 'text-emerald-400' : 'text-[#e11d48]'"
        />
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.toast-leave-active {
  transition: all 0.3s ease-in;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(24px);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
