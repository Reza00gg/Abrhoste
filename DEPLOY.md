# راه‌اندازی: Vercel + Neon + خروجی APK

سه قدم، همه از داخل GitHub. بعدش همه‌چیز خودکار است.

---

## قدم ۰ — نصب ورک‌فلوها (یک‌بار)

اپلیکیشن گیت‌هاب Arena اجازهٔ نوشتن فایل داخل `.github/workflows` را ندارد،
پس ورک‌فلوها در `ci/workflows/` قرار دارند. یک‌بار این را اجرا کن:

```bash
git pull
bash ci/install-workflows.sh
```

یا از UI گیت‌هاب: محتوای `ci/workflows/deploy.yml` و `ci/workflows/android.yml`
را در مسیر `.github/workflows/` با همان نام بساز.

---

## قدم ۱ — افزودن Secrets

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| نام | مقدار |
| --- | --- |
| `VERCEL_TOKEN` | توکن Vercel (Account Settings → Tokens) |
| `DATABASE_URL` | کانکشن‌استرینگ **pooler** نئون: `postgresql://…-pooler.…neon.tech/neondb?sslmode=require&channel_binding=require` |

و در تب **Variables** (اختیاری، برای APK):

| نام | مقدار |
| --- | --- |
| `API_BASE` | آدرس نهایی Vercel، مثلاً `https://lenumoviz.vercel.app` |

---

## قدم ۲ — دیپلوی

ورک‌فلوی **Deploy (Vercel + Neon)** با هر push روی این برنچ اجرا می‌شود،
یا دستی از تب **Actions → Deploy → Run workflow**.

کاری که می‌کند:
1. `node scripts/migrate.mjs` → ساخت جدول‌های `titles` و `users` در نئون + seed اولیه (idempotent)
2. ساخت/لینک پروژهٔ Vercel با نام `lenumoviz`
3. ست‌کردن `DATABASE_URL` روی هر سه محیط Vercel
4. `vercel build` + `vercel deploy --prod`
5. تست دود روی `/api/health` و `/api/titles`

آدرس دیپلوی در خلاصهٔ همان Run نمایش داده می‌شود.

---

## قدم ۳ — ساخت APK

**Actions → Build Android APK → Run workflow** و در فیلد `api_base`
آدرس Vercel را بگذار (مثلاً `https://lenumoviz.vercel.app`).

خروجی:
- **Artifacts** همان Run → `LenuMoviz-apk`
- و یک **Release** با تگ `apk-<شماره>` که فایل APK به آن پیوست است ← از اینجا دانلود کن

جزئیات فنی:
- Capacitor پروژهٔ اندروید را در همان CI می‌سازد (`npx cap add android`)، پس پوشهٔ `android/` در ریپو نیست و در `.gitignore` است
- JDK 21 + Android SDK فقط روی رانر گیت‌هاب نصب می‌شوند، نه روی سیستم تو
- APK از نوع **debug** است (~۵ مگابایت). برای نصب کافی است؛ برای Play Store باید keystore و امضا اضافه شود

---

## API

| مسیر | توضیح |
| --- | --- |
| `GET /api/health` | وضعیت سرویس + اتصال نئون |
| `GET /api/titles?q=&kind=movie\|series&limit=` | فهرست/جستجوی فیلم و سریال |

CORS برای مبدأ WebView کپسیتور (`https://localhost`) باز است تا APK بتواند به API وصل شود.

## اجرای محلی مهاجرت

```bash
DATABASE_URL='postgresql://…' npm run migrate
```
