<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Search, User } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

/**
 * Bottom navigation — RTL order (right → left): خانه، جستجو، حساب
 * Every item is a v-wave host: the ripple grows and *stays* while held,
 * and only dissolves once the finger/pointer is released.
 */
const items = [
  { name: 'home', label: 'خانه', icon: Home },
  { name: 'search', label: 'جستجو', icon: Search },
  { name: 'account', label: 'حساب', icon: User },
]

const route = useRoute()
const activeIndex = computed(() => {
  const i = items.findIndex((item) => item.name === route.name)
  return i === -1 ? 0 : i
})
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 safe-b border-t border-white/8 bg-black/80 backdrop-blur-xl backdrop-saturate-150"
    aria-label="ناوبری اصلی"
  >
    <ul class="mx-auto flex max-w-md items-stretch justify-around">
      <li v-for="(item, i) in items" :key="item.name" class="flex-1">
        <RouterLink
          v-wave
          :to="{ name: item.name }"
          :aria-current="activeIndex === i ? 'page' : undefined"
          :class="
            cn(
              'wave-host group flex h-16 select-none flex-col items-center justify-center gap-1.5',
              'transition-colors duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60',
              activeIndex === i ? 'text-white' : 'text-white/45 hover:text-white/70',
            )
          "
        >
          <component
            :is="item.icon"
            class="h-[22px] w-[22px] transition-transform duration-300 ease-out"
            :class="activeIndex === i ? 'scale-105' : 'scale-100 group-active:scale-95'"
            :stroke-width="activeIndex === i ? 2.2 : 1.8"
            aria-hidden="true"
          />

          <span
            class="text-[11px] leading-none tracking-tight transition-all duration-200"
            :class="activeIndex === i ? 'font-semibold opacity-100' : 'font-medium opacity-80'"
          >
            {{ item.label }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
