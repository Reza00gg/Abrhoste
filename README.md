# LenuMoviz — لنو موویز

وب‌اپلیکیشن فیلم و سریال. Vue 3 + Vite + Tailwind CSS v4 + Vue Router + v-wave.

## اجرا

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # خروجی در dist/
npm run preview
```

## وضعیت فعلی (فاز ۱)

- تم تمام‌مشکی (dark)، راست‌به‌چپ، فونت وزیرمتن (بسته‌شده در بیلد، بدون CDN)
- ناوبری پایین مینیمال — از راست به چپ: **خانه / جستجو / حساب** با آیکون Lucide
- افکت ریپل حرفه‌ای با `v-wave` (`waitForRelease`): با نگه‌داشتن انگشت ریپل باقی می‌ماند، با رها کردن محو می‌شود
- سه مسیر SPA با `vue-router` (history mode) + انیمیشن انتقال صفحه
- وسط هر صفحه: `coming soon...`
- کاملاً ریسپانسیو با حس اپ موبایل (safe-area، بدون pull-to-refresh، بدون tap-highlight)
- توکن‌های رنگ سازگار با shadcn-vue (`--background`, `--primary`, ...) برای افزودن کامپوننت‌ها در فازهای بعد

## نقشه راه

- [x] بک‌اند (Vercel Serverless Functions) + Neon PostgreSQL
- [ ] احراز هویت و صفحه حساب
- [ ] جستجو و صفحات فیلم/سریال
- [x] خط لولهٔ دیپلوی روی Vercel (GitHub Actions)
- [x] خروجی APK با Capacitor از طریق GitHub Actions — راهنما: [DEPLOY.md](./DEPLOY.md)
