<script setup>
import { ArrowRight, Bell } from 'lucide-vue-next'
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-black/80 backdrop-blur-xl backdrop-saturate-150"
    :style="{ paddingTop: 'env(safe-area-inset-top, 0px)' }"
  >
    <div class="relative flex h-14 w-full items-center justify-center px-4" dir="ltr">
      <RouterLink
        v-wave
        to="/"
        class="wave-host absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="بازگشت"
      >
        <ArrowRight class="h-[21px] w-[21px]" :stroke-width="2" />
      </RouterLink>

      <span class="select-none text-[16px] font-bold tracking-tight text-white" dir="rtl">اعلان‌ها</span>

      <span class="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-[#e11d48]" aria-hidden="true">
        <Bell class="h-[21px] w-[21px]" :stroke-width="2" />
      </span>
    </div>
  </header>
</template>
