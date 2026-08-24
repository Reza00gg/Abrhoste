<script setup>
import { ArrowRight, Bell } from 'lucide-vue-next'
</script>

<template>
  <header class="notification-header">
    <div class="notification-header__row">
      <RouterLink
        v-wave
        to="/"
        class="notification-header__back wave-host"
        aria-label="بازگشت"
      >
        <ArrowRight class="notification-header__icon" :stroke-width="2" />
      </RouterLink>

      <span class="notification-header__title" dir="rtl">اعلان‌ها</span>

      <span class="notification-header__bell" aria-hidden="true">
        <Bell class="notification-header__icon" :stroke-width="2" />
      </span>
    </div>
  </header>
</template>

<style scoped>
.notification-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 40;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  background: rgba(0, 0, 0, .80);
  padding-top: env(safe-area-inset-top, 0px);
  backdrop-filter: blur(18px) saturate(150%);
}

.notification-header__row {
  position: relative;
  width: 100%;
  height: 56px;
  direction: ltr;
}

.notification-header__back,
.notification-header__bell {
  position: absolute;
  top: 8px;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
}

.notification-header__back {
  right: 16px;
  left: auto;
  color: rgba(255, 255, 255, .64);
  transition: background-color .2s ease, color .2s ease;
}

.notification-header__back:hover {
  background: rgba(255, 255, 255, .06);
  color: #fff;
}

.notification-header__bell {
  right: auto;
  left: 16px;
  color: #e11d48;
}

.notification-header__icon {
  width: 22px;
  height: 22px;
}

.notification-header__title {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: calc(100% - 180px);
  overflow: hidden;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
