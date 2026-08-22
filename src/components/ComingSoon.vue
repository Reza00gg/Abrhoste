<script setup>
defineProps({
  title: { type: String, default: 'coming soon...' },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="flex min-h-full flex-col items-center justify-center px-6 text-center">
    <h1
      class="animate-in fade-in zoom-in-95 text-2xl font-semibold tracking-wide text-white duration-500 sm:text-3xl"
      dir="ltr"
    >
      {{ title }}
    </h1>
    <p v-if="subtitle" class="mt-3 text-sm text-white/40">{{ subtitle }}</p>
    <slot />
  </section>
</template>
