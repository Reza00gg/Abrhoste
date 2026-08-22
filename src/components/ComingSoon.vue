<script setup>
defineProps({
  title: { type: String, default: 'coming soon...' },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="flex min-h-full flex-col items-center justify-center px-6 text-center">
    <div class="flex translate-y-[9vh] flex-col items-center">
      <h1
        class="animate-in fade-in zoom-in-95 text-2xl font-semibold tracking-wide text-white duration-500 sm:text-3xl"
        dir="ltr"
      >
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-4 text-[13px] font-medium text-white/35">{{ subtitle }}</p>
      <slot />
    </div>
  </section>
</template>
