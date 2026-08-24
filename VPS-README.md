# LenuMoviz روی VPS

این بسته برای اجرای آزمایشی LenuMoviz روی یک سرور Ubuntu/Debian آماده شده است.

## پیش‌نیازها

- رکورد DNS نوع A برای `lnupro.space` که به IP سرور اشاره کند.
- بازبودن پورت‌های 80 و 443 و دسترسی SSH.
- دسترسی root یا امکان اجرای `sudo`.
- یک ایمیل معتبر برای گرفتن گواهی HTTPS در صورت نیاز.

## اجرا

پس از انتقال bundle به سرور:

```bash
unzip LenuMoviz-v1.2.8.1-vps.zip
cd LenuMoviz-v1.2.8.1-vps
chmod +x main.sh
sudo ./main.sh
```

اسکریپت به‌صورت خودکار Node.js، npm، Nginx و وابستگی‌های لازم را آماده می‌کند، پروژه را از payload استخراج می‌کند، migration Neon و seed ادمین را اجرا می‌کند، build می‌گیرد و سرویس را با PM2 بالا می‌آورد.

در اجرای اول، `DATABASE_URL`، نام کاربری و رمز ادمین و در صورت تمایل ایمیل Certbot پرسیده می‌شود. این مقادیر داخل ZIP قرار ندارند و در فایل محافظت‌شدهٔ زیر ذخیره می‌شوند:

```text
/etc/lenumoviz/lenumoviz.env
```

سرویس Node روی localhost اجرا می‌شود و Nginx دامنهٔ زیر را به آن وصل می‌کند:

```text
https://lnupro.space
https://lnupro.space/api
```

## مدیریت سرویس

```bash
pm2 status
pm2 logs lenumoviz
pm2 restart lenumoviz
```

این پروژه از Neon فعلی استفاده می‌کند؛ دیتابیس روی خود VPS نصب نمی‌شود.
