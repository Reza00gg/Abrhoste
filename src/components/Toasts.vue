<script setup>
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import { toasts } from '@/lib/toast'
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[120] flex flex-col items-center gap-2 px-6"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-[13px] font-medium shadow-2xl shadow-black/60 backdrop-blur-xl"
        :class="
          t.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-950/80 text-emerald-200'
            : 'border-rose-500/20 bg-rose-950/80 text-rose-200'
        "
      >
        <component
          :is="t.type === 'success' ? CircleCheck : CircleAlert"
          class="h-4.5 w-4.5 shrink-0"
          :class="t.type === 'success' ? 'text-emerald-400' : 'text-rose-400'"
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
