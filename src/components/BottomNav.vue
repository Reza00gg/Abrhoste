<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Search, User } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { initUiState, keyboardOpen } from '@/lib/ui'

/**
 * Bottom navigation — RTL order (right → left): خانه، جستجو، حساب
 * - v-wave ripple fills the whole cell; held ripples stay until release.
 * - Vanishes instantly (v-show, no transition) the moment a field is focused,
 *   so it never rides up with the keyboard — not even for a frame.
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

initUiState()
</script>

<template>
  <nav
    v-show="!keyboardOpen"
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
              'wave-host flex h-16 select-none flex-col items-center justify-center gap-1.5',
              'transition-colors duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60',
              activeIndex === i ? 'text-white' : 'text-white/50',
            )
          "
        >
          <component
            :is="item.icon"
            class="h-[23px] w-[23px]"
            :stroke-width="2"
            aria-hidden="true"
          />
          <span
            class="text-[11px] leading-none tracking-tight"
            :class="activeIndex === i ? 'font-semibold' : 'font-medium'"
          >
            {{ item.label }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
