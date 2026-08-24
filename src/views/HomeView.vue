<script setup>
import ApiStatus from '@/components/ApiStatus.vue'
</script>

<template>
  <section class="flex min-h-[calc(100dvh-10.25rem)] items-center justify-center px-6 text-center">
    <!-- اتصال Neon/API عمداً حفظ شده است؛ فقط متن placeholder حذف شده. -->
    <ApiStatus />
  </section>
</template>
