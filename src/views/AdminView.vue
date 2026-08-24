<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Bell, Edit3, Loader2, LogOut, Megaphone, Plus, Send, Trash2, X } from 'lucide-vue-next'
import { toast } from '@/lib/toast'

const session = reactive({ checked: false, admin: null })
const loginForm = reactive({ username: '', password: '' })
const loginBusy = ref(false)
const listLoading = ref(false)
const items = ref([])
const composerOpen = ref(false)
const saving = ref(false)
const editingId = ref(0)
const form = reactive({ title: '', message: '' })

const isEditing = computed(() => editingId.value > 0)
const composerTitle = computed(() => (isEditing.value ? 'ویرایش اعلان' : 'ارسال اعلان'))

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'خطایی رخ داد')
  return data
}

async function loadSession() {
  try {
    const response = await fetch('/api/admin/auth/me', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (response.ok) session.admin = (await response.json()).admin
  } catch {
    session.admin = null
  } finally {
    session.checked = true
  }
}

async function loadNotifications() {
  if (!session.admin) return
  listLoading.value = true
  try {
    const response = await fetch('/api/admin/notifications', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (response.status === 401) {
      session.admin = null
      return
    }
    const data = await readJson(response)
    items.value = Array.isArray(data.items) ? data.items : []
  } catch (error) {
    toast(error.message || 'خطا در دریافت اعلان‌ها')
  } finally {
    listLoading.value = false
  }
}

async function submitLogin() {
  if (loginBusy.value) return
  if (!loginForm.username.trim() || !loginForm.password) return toast('نام کاربری و رمز عبور را وارد کن')
  loginBusy.value = true
  try {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(loginForm),
    })
    const data = await readJson(response)
    session.admin = data.admin
    loginForm.password = ''
    toast('ورود موفق بود', 'success')
    await loadNotifications()
  } catch (error) {
    toast(error.message || 'نام کاربری یا رمز عبور نادرست است')
  } finally {
    loginBusy.value = false
  }
}

async function logout() {
  try { await fetch('/api/admin/auth/logout', { method: 'POST' }) } catch {}
  session.admin = null
  items.value = []
  toast('از پنل خارج شدی', 'success')
}

function openCreate() {
  editingId.value = 0
  form.title = ''
  form.message = ''
  composerOpen.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.title = item.title
  form.message = item.message
  composerOpen.value = true
}

function closeComposer() {
  if (!saving.value) composerOpen.value = false
}

async function saveNotification() {
  if (saving.value) return
  const title = form.title.trim()
  const message = form.message.trim()
  if (!title) return toast('عنوان اعلان را وارد کن')
  if (!message) return toast('توضیحات اعلان را وارد کن')

  saving.value = true
  try {
    const response = await fetch(
      editingId.value > 0 ? `/api/admin/notifications?id=${editingId.value}` : '/api/admin/notifications',
      {
        method: editingId.value > 0 ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ title, message }),
      },
    )
    await readJson(response)
    toast(editingId.value > 0 ? 'اعلان ویرایش شد' : 'اعلان برای همه ارسال شد', 'success')
    composerOpen.value = false
    await loadNotifications()
  } catch (error) {
    toast(error.message || 'خطا در ذخیره اعلان')
  } finally {
    saving.value = false
  }
}

async function deleteNotification(item) {
  if (!window.confirm(`اعلان «${item.title}» حذف شود؟`)) return
  try {
    const response = await fetch(`/api/admin/notifications?id=${item.id}`, { method: 'DELETE' })
    await readJson(response)
    toast('اعلان حذف شد', 'success')
    await loadNotifications()
  } catch (error) {
    toast(error.message || 'خطا در حذف اعلان')
  }
}

onMounted(async () => {
  await loadSession()
  await loadNotifications()
})
</script>

<template>
  <div class="min-h-dvh bg-black text-white">
    <template v-if="!session.checked">
      <div class="grid min-h-dvh place-items-center text-white/45">
        <Loader2 class="h-7 w-7 animate-spin" />
      </div>
    </template>

    <template v-else-if="!session.admin">
      <main class="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-6 py-10">
        <section class="w-full">
          <div class="mb-10 text-center">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e11d48]/15 text-[#e11d48]">
              <Megaphone class="h-7 w-7" />
            </div>
            <h1 class="mt-5 text-xl font-bold">پنل مدیریت</h1>
            <p class="mt-2 text-xs text-white/35">LenuMoviz · مدیریت اعلان‌ها</p>
          </div>

          <form class="space-y-3" @submit.prevent="submitLogin">
            <input
              v-model="loginForm.username"
              type="text"
              autocomplete="username"
              placeholder="نام کاربری"
              class="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e11d48]/70"
            />
            <input
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
              placeholder="رمز عبور"
              class="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e11d48]/70"
            />
            <button
              v-wave
              type="submit"
              :disabled="loginBusy"
              class="wave-host flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e11d48] text-sm font-bold text-white disabled:opacity-60"
            >
              <Loader2 v-if="loginBusy" class="h-4 w-4 animate-spin" />
              {{ loginBusy ? 'در حال بررسی…' : 'ورود' }}
            </button>
          </form>
        </section>
      </main>
    </template>

    <template v-else>
      <header class="admin-header">
        <div class="admin-header__row">
          <button v-wave type="button" class="admin-header__logout wave-host" aria-label="خروج" @click="logout">
            <LogOut class="admin-header__icon" />
          </button>
          <div class="admin-header__title" dir="rtl">
            <h1>پنل مدیریت</h1>
            <p>ارسال و مدیریت اعلان‌ها</p>
          </div>
          <span class="admin-header__mark" aria-hidden="true"><Megaphone class="admin-header__icon" /></span>
        </div>
      </header>

      <main class="mx-auto w-full max-w-md px-5 pb-10 pt-6">
        <div class="admin-send-card-wrap">
          <button v-wave type="button" class="admin-send-card wave-host" @click="openCreate">
            <Plus class="admin-send-card__icon" />
            <span class="admin-send-card__text"><strong>ارسال اعلان</strong></span>
          </button>
        </div>

        <div class="mt-8 flex items-center justify-between">
          <h2 class="text-sm font-bold">اعلان‌های ارسال‌شده</h2>
          <span class="text-[11px] text-white/35">{{ items.length }} مورد</span>
        </div>

        <div v-if="listLoading" class="flex justify-center py-16 text-white/40"><Loader2 class="h-6 w-6 animate-spin" /></div>
        <div v-else-if="!items.length" class="flex flex-col items-center py-16 text-center">
          <Bell class="h-9 w-9 text-white/20" />
          <p class="mt-4 text-sm font-bold text-white/45">هنوز اعلانی ارسال نشده</p>
        </div>
        <div v-else class="mt-4 space-y-2">
          <article v-for="item in items" :key="item.id" class="admin-notification-card rounded-xl border border-white/8 bg-white/[0.035] p-3">
            <div class="flex items-start gap-2.5">
              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e11d48]/15 text-[#e11d48]"><Bell class="h-4 w-4" /></span>
              <div class="min-w-0 flex-1 text-right">
                <h3 class="text-[13px] font-bold leading-5 text-white">{{ item.title }}</h3>
                <p class="mt-1 whitespace-pre-line text-[11px] leading-5 text-white/55">{{ item.message }}</p>
                <time class="mt-2 block text-[10px] text-white/30">{{ formatDate(item.createdAt) }}</time>
              </div>
              <div class="flex shrink-0 gap-0.5">
                <button v-wave type="button" class="wave-host grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white" aria-label="ویرایش" @click="openEdit(item)"><Edit3 class="h-3.5 w-3.5" /></button>
                <button v-wave type="button" class="wave-host grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-400" aria-label="حذف" @click="deleteNotification(item)"><Trash2 class="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </article>
        </div>
      </main>

      <Transition name="sheet">
        <div v-if="composerOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm" @click.self="closeComposer">
          <section class="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-[#151519] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4">
            <div class="mb-5 flex items-center justify-between">
              <button v-wave type="button" class="wave-host grid h-9 w-9 place-items-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="بستن" @click="closeComposer"><X class="h-5 w-5" /></button>
              <h2 class="text-base font-bold">{{ composerTitle }}</h2>
            </div>
            <form class="space-y-3" @submit.prevent="saveNotification">
              <input v-model="form.title" maxlength="120" type="text" placeholder="عنوان اعلان" class="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e11d48]/70" />
              <textarea v-model="form.message" maxlength="2000" rows="5" placeholder="توضیحات اعلان" class="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-[#e11d48]/70"></textarea>
              <button v-wave type="submit" :disabled="saving" class="wave-host flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e11d48] text-sm font-bold text-white disabled:opacity-60">
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                {{ saving ? 'در حال ارسال…' : isEditing ? 'ذخیره تغییرات' : 'ارسال برای همه' }}
              </button>
            </form>
          </section>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active section,
.sheet-leave-active section {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from section,
.sheet-leave-to section {
  transform: translateY(100%);
}
</style>

<style scoped>
.admin-header {
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  background: rgba(0, 0, 0, .82);
  padding: .75rem 1.25rem;
  backdrop-filter: blur(18px);
}

.admin-header__row {
  position: relative;
  width: 100%;
  height: 40px;
  direction: ltr;
}

.admin-header__logout,
.admin-header__mark {
  position: absolute;
  top: 0;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
}

.admin-header__logout {
  left: 0;
  color: rgba(255, 255, 255, .58);
  transition: background-color .2s ease, color .2s ease;
}

.admin-header__logout:hover {
  background: rgba(255, 255, 255, .06);
  color: #fff;
}

.admin-header__mark {
  right: 0;
  background: rgba(225, 29, 72, .15);
  color: #e11d48;
}

.admin-header__title {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  white-space: nowrap;
}

.admin-header__title h1 {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}

.admin-header__title p {
  margin-top: .25rem;
  color: rgba(255, 255, 255, .35);
  font-size: 10px;
  line-height: 1;
}

.admin-header__icon {
  width: 20px;
  height: 20px;
}

.admin-send-card-wrap {
  display: flex;
  direction: ltr;
  padding-left: 8px;
}

.admin-send-card {
  display: inline-flex;
  width: auto;
  min-width: 142px;
  height: 44px;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border-radius: 13px;
  background: #e11d48;
  padding: 0 14px;
  color: #fff;
  text-align: left;
}

.admin-send-card__text {
  display: block;
  width: auto;
  padding: 0;
  direction: rtl;
  text-align: right;
}

.admin-send-card__text strong {
  display: block;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.admin-send-card__icon {
  position: static;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  opacity: .9;
}

.admin-notification-card p {
  max-height: 3.25rem;
  overflow: hidden;
}
</style>
