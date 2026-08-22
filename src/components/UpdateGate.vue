<script setup>
/**
 * Update sheet — native (APK) only.
 * A few seconds after launch it silently checks GitHub Releases; when a newer
 * version exists it slides a compact sheet up: tap «بروزرسانی» → in-app
 * download with a progress bar → button turns into «نصب» → tap → Android's
 * installer takes over. Nothing happens automatically.
 */
import { onMounted, ref } from 'vue'
import { CloudDownload, X } from 'lucide-vue-next'
import { CURRENT_VERSION, checkForUpdate, downloadUpdate, installUpdate } from '@/lib/updater'

const update = ref(null) // { version, notes, apkUrl, apkSize }
const phase = ref('idle') // idle | downloading | ready | opening | error
const progress = ref(0)
const apkPath = ref('')
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

async function startDownload() {
  if (phase.value !== 'idle') return
  phase.value = 'downloading'
  progress.value = 0
  try {
    apkPath.value = await downloadUpdate(update.value.apkUrl, (p) => (progress.value = p))
    phase.value = 'ready' // دانلود تمام — منتظر ضربه‌ی کاربر روی «نصب»
  } catch {
    phase.value = 'error'
  }
}

async function startInstall() {
  if (phase.value !== 'ready') return
  phase.value = 'opening'
  try {
    await installUpdate(apkPath.value)
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
        class="relative w-full max-w-md rounded-t-3xl border-t border-white/10 bg-[#131316] px-6 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-center"
      >
        <!-- close (hidden while busy) -->
        <button
          v-if="phase === 'idle' || phase === 'error'"
          v-wave
          class="wave-host absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/40"
          aria-label="بستن"
          @click="dismissed = true"
        >
          <X class="h-4.5 w-4.5" />
        </button>

        <div class="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-[#e11d48]/15">
          <CloudDownload class="h-6.5 w-6.5 text-[#e11d48]" />
        </div>

        <h2 class="mt-3.5 text-[17px] font-bold text-white">
          {{ phase === 'ready' ? 'دانلود شد — آماده نصب ✅' : 'آپدیت جدید اومد 🎉' }}
        </h2>
        <p class="mt-1.5 text-[13px] leading-6 text-white/50" dir="ltr">
          v{{ CURRENT_VERSION }} →
          <span class="font-semibold text-white/85">v{{ update.version }}</span>
          <span v-if="update.apkSize" class="text-white/35"> · {{ fmtSize(update.apkSize) }}</span>
        </p>

        <!-- progress (only while downloading) -->
        <div v-if="phase === 'downloading'" class="mx-auto mt-5 max-w-70" dir="ltr">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-[#e11d48] transition-[width] duration-200 ease-out"
              :style="{ width: (progress * 100).toFixed(0) + '%' }"
            />
          </div>
          <p class="mt-2.5 text-xs text-white/40">در حال دانلود {{ (progress * 100).toFixed(0) }}٪</p>
        </div>

        <!-- error -->
        <p v-else-if="phase === 'error'" class="mt-3 text-xs text-rose-400">
          دانلود داخلی ناموفق بود — از دکمه پایین با مرورگر دانلود کن.
        </p>

        <!-- actions -->
        <div class="mt-5 flex flex-col gap-1.5">
          <!-- main button: بروزرسانی → (progress) → نصب -->
          <button
            v-if="phase !== 'error'"
            v-wave
            :disabled="phase === 'downloading' || phase === 'opening'"
            class="wave-host h-12 w-full rounded-2xl bg-[#e11d48] text-sm font-bold text-white transition-opacity disabled:opacity-40"
            @click="phase === 'ready' ? startInstall() : startDownload()"
          >
            {{
              phase === 'ready'
                ? 'نصب'
                : phase === 'opening'
                  ? 'در حال باز کردن نصب‌کننده…'
                  : phase === 'downloading'
                    ? 'در حال دانلود…'
                    : 'بروزرسانی'
            }}
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
            class="wave-host h-10 w-full rounded-xl text-[13px] font-medium text-white/40"
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
