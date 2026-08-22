<script setup>
import { computed, reactive, ref } from 'vue'
import { LogOut, UserRound } from 'lucide-vue-next'
import { auth, login, logout, register } from '@/lib/auth'
import { toast } from '@/lib/toast'

const mode = ref('login') // login | register
const busy = ref(false)
const leaving = ref(false)

const form = reactive({
  display_name: '',
  identifier: '',
  password: '',
  password_confirm: '',
})

const joined = computed(() => {
  if (!auth.user?.created_at) return ''
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(
      new Date(auth.user.created_at),
    )
  } catch {
    return ''
  }
})

function validate() {
  if (mode.value === 'register' && form.display_name.trim().length < 2)
    return 'نام نمایشی را وارد کن (حداقل ۲ حرف)'
  if (!form.identifier.trim()) return 'ایمیل یا شماره موبایل را وارد کن'
  if (!form.password) return 'رمز عبور را وارد کن'
  if (mode.value === 'register') {
    if (form.password.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد'
    if (!form.password_confirm) return 'تکرار رمز عبور را وارد کن'
    if (form.password !== form.password_confirm) return 'تکرار رمز عبور یکسان نیست'
  }
  return null
}

async function submit() {
  if (busy.value) return
  const err = validate()
  if (err) return toast(err)

  busy.value = true
  try {
    if (mode.value === 'register') {
      const u = await register({ ...form })
      toast(`خوش اومدی ${u.display_name} 🎉`, 'success')
    } else {
      const u = await login({ identifier: form.identifier, password: form.password })
      toast(`خوش برگشتی ${u.display_name} 👋`, 'success')
    }
    form.password = form.password_confirm = ''
  } catch (e) {
    toast(e.message)
  } finally {
    busy.value = false
  }
}

async function doLogout() {
  if (leaving.value) return
  leaving.value = true
  await logout()
  leaving.value = false
  toast('از حساب خارج شدی', 'success')
}

function switchMode(m) {
  if (busy.value) return
  mode.value = m
}

const inputCls =
  'h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white ' +
  'placeholder:text-white/25 outline-none transition-colors focus:border-[#e11d48]/70 focus:bg-white/[0.06]'
</script>

<template>
  <section class="mx-auto w-full max-w-md px-6 pt-10 pb-6">
    <!-- در حال بررسی نشست -->
    <div v-if="!auth.ready && !auth.user" class="flex flex-col items-center pt-[18vh]">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#e11d48]"
      />
      <p class="mt-4 text-xs text-white/35">در حال بررسی حساب…</p>
    </div>

    <!-- وارد شده — پروفایل -->
    <div v-else-if="auth.user" class="animate-in fade-in duration-300">
      <div class="flex flex-col items-center pt-6 text-center">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full bg-[#e11d48]/15 text-2xl font-bold text-[#e11d48]"
        >
          {{ auth.user.display_name?.[0] ?? '؟' }}
        </div>
        <h1 class="mt-4 text-xl font-bold text-white">{{ auth.user.display_name }}</h1>
        <p class="mt-1.5 text-[13px] text-white/40" dir="ltr">{{ auth.user.identifier }}</p>
        <p v-if="joined" class="mt-4 text-[11px] text-white/25">عضو از {{ joined }}</p>
      </div>

      <button
        v-wave
        :disabled="leaving"
        class="wave-host mt-10 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-sm font-bold text-rose-300 transition-opacity disabled:opacity-50"
        @click="doLogout"
      >
        <span
          v-if="leaving"
          class="h-4 w-4 animate-spin rounded-full border-2 border-rose-300/30 border-t-rose-300"
        />
        <LogOut v-else class="h-4.5 w-4.5" />
        خروج از حساب
      </button>
    </div>

    <!-- وارد نشده — فرم -->
    <div v-else class="animate-in fade-in duration-300">
      <div class="flex flex-col items-center pt-4 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05]">
          <UserRound class="h-7 w-7 text-white/50" />
        </div>
        <h1 class="mt-4 text-lg font-bold text-white">
          {{ mode === 'login' ? 'ورود به حساب' : 'ساخت حساب' }}
        </h1>
      </div>

      <!-- tabs -->
      <div class="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1">
        <button
          v-for="m in [
            { id: 'login', label: 'ورود' },
            { id: 'register', label: 'ساخت حساب' },
          ]"
          :key="m.id"
          v-wave
          class="wave-host h-10 rounded-xl text-[13px] font-bold transition-colors"
          :class="mode === m.id ? 'bg-[#e11d48] text-white' : 'text-white/45'"
          @click="switchMode(m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <form class="mt-5 flex flex-col gap-3" @submit.prevent="submit">
        <input
          v-if="mode === 'register'"
          v-model="form.display_name"
          type="text"
          placeholder="نام نمایشی"
          autocomplete="nickname"
          :class="inputCls"
        />
        <input
          v-model="form.identifier"
          type="text"
          placeholder="ایمیل یا شماره موبایل"
          autocomplete="username"
          inputmode="email"
          :class="inputCls"
          class="text-left"
          dir="ltr"
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="رمز عبور"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          :class="inputCls"
          class="text-left"
          dir="ltr"
        />
        <input
          v-if="mode === 'register'"
          v-model="form.password_confirm"
          type="password"
          placeholder="تکرار رمز عبور"
          autocomplete="new-password"
          :class="inputCls"
          class="text-left"
          dir="ltr"
        />

        <button
          v-wave
          type="submit"
          :disabled="busy"
          class="wave-host mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e11d48] text-sm font-bold text-white transition-opacity disabled:opacity-50"
        >
          <span
            v-if="busy"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
          {{ busy ? '' : mode === 'login' ? 'ورود' : 'ساخت حساب' }}
        </button>
      </form>
    </div>
  </section>
</template>
