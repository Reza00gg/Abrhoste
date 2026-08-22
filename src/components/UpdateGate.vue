<script setup>
/**
 * Update sheet — native (APK) only.
 * A few seconds after launch it silently checks GitHub Releases; when a newer
 * version exists it slides a sheet over the app: tap the button, the APK
 * downloads in-app with a progress bar, then Android's installer takes over.
 */
import { onMounted, ref } from 'vue'
import { CloudDownload, X } from 'lucide-vue-next'
import { CURRENT_VERSION, checkForUpdate, downloadAndInstall } from '@/lib/updater'

const update = ref(null) // { version, notes, apkUrl, apkSize }
const phase = ref('idle') // idle | downloading | opening | error
const progress = ref(0)
const dismissed = ref(false)

onMounted(() => {
  // چند ثانیه بعد از باز شدن برنامه، بی‌صدا چک کن
  setTimeout(async () => {
    try {
      update.value = await checkForUpdate()
    } catch {
      /* آفلاین یا خطای شبکه — بی‌صدا رد شو */
    }
  }, 3000)
})

async function startUpdate() {
  if (phase.value === 'downloading') return
  phase.value = 'downloading'
  progress.value = 0
  try {
    await downloadAndInstall(update.value.apkUrl, (p) => (progress.value = p))
    phase.value = 'opening'
  } catch {
    phase.value = 'error'
  }
}

function openInBrowser() {
  window.open(update.value.apkUrl, '_system')
}

const fmtSize = (b) => (b > 0 ? (b / 1048576).toFixed(1) + ' MB' : '')
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="update && !dismissed"
      class="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        class="safe-b w-full max-w-md rounded-t-3xl border-t border-white/10 bg-[#111114] px-6 pt-6 pb-8 text-center"
      >
        <!-- close (only while not downloading) -->
        <button
          v-if="phase !== 'downloading' && phase !== 'opening'"
          v-wave
          class="wave-host absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full text-white/40"
          aria-label="بستن"
          @click="dismissed = true"
        >
          <X class="h-5 w-5" />
        </button>

        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e11d48]/15"
        >
          <CloudDownload class="h-7 w-7 text-[#e11d48]" />
        </div>

        <h2 class="mt-4 text-lg font-bold text-white">آپدیت جدید اومد 🎉</h2>
        <p class="mt-2 text-sm leading-6 text-white/50" dir="ltr">
          v{{ CURRENT_VERSION }} → <span class="font-semibold text-white/80">v{{ update.version }}</span>
          <span v-if="update.apkSize" class="text-white/35"> · {{ fmtSize(update.apkSize) }}</span>
        </p>

        <!-- progress -->
        <div v-if="phase === 'downloading' || phase === 'opening'" class="mt-6" dir="ltr">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-[#e11d48] transition-[width] duration-200 ease-out"
              :style="{ width: (progress * 100).toFixed(0) + '%' }"
            />
          </div>
          <p class="mt-3 text-xs text-white/40">
            {{ phase === 'opening' ? 'در حال باز کردن نصب‌کننده…' : `در حال دانلود ${(progress * 100).toFixed(0)}٪` }}
          </p>
        </div>

        <!-- error -->
        <p v-else-if="phase === 'error'" class="mt-4 text-xs text-rose-400">
          دانلود داخلی ناموفق بود — از دکمه پایین با مرورگر دانلود کن.
        </p>

        <!-- actions -->
        <div class="mt-6 flex flex-col gap-2">
          <button
            v-if="phase !== 'error'"
            v-wave
            :disabled="phase === 'downloading' || phase === 'opening'"
            class="wave-host h-12 w-full rounded-2xl bg-[#e11d48] text-sm font-bold text-white transition-opacity disabled:opacity-50"
            @click="startUpdate"
          >
            بروزرسانی
          </button>
          <button
            v-else
            v-wave
            class="wave-host h-12 w-full rounded-2xl bg-[#e11d48] text-sm font-bold text-white"
            @click="openInBrowser"
          >
            دانلود با مرورگر
          </button>
          <button
            v-if="phase === 'idle'"
            v-wave
            class="wave-host h-11 w-full rounded-2xl text-sm font-medium text-white/40"
            @click="dismissed = true"
          >
            بعداً
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}
.sheet-enter-active > div,
.sheet-leave-active > div {
  transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from > div,
.sheet-leave-to > div {
  transform: translateY(100%);
}
</style>
