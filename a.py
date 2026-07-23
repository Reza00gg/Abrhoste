# -*- coding: utf-8 -*-
"""
ربات افزایش ویو تلگرام (کار با سشن اکانت‌ها)
اجرا شده روی Pydroid3 و PC
"""

import asyncio
import json
import os
import re

from telethon import TelegramClient, events, Button, functions
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    FloodWaitError,
)

# ==================== تنظیمات ====================
API_ID = 22297480                      # <-- api_id خودت
API_HASH = "a8bee15087e5cf49970093a723e8bb1a"           # <-- api_hash خودت
BOT_TOKEN = "8866311508:AAFcPhVt9aizbeM1f6ED7Gfjq2TRcV26jbo"         # <-- توکن ربات از BotFather
ADMIN_ID = 1634314876                 # <-- آیدی عددی ادمین (خودت)

ACCOUNTS_FILE = "accounts.json"      # فایل ذخیره سشن‌ها

# اطلاعات دستگاه جعلی (آیفون)
DEVICE_MODEL = "iPhone 14 Pro Max"
SYSTEM_VERSION = "iOS 17.4.1"
APP_VERSION = "10.9.2"
# ================================================


# کلاینت خود ربات
bot = TelegramClient("bot_session", API_ID, API_HASH)

# دیکشنری کلاینت‌های اکانت‌های لاگین‌شده  {phone: TelegramClient}
account_clients = {}

# وضعیت مکالمه‌ی کاربرها  {user_id: {"state": ..., "data": {...}}}
states = {}

# داده‌ی موقت لاگین (temp client هنگام افزودن اکانت)
temp_login = {}


# ---------- توابع ذخیره/خواندن اکانت‌ها ----------
def load_accounts():
    if not os.path.exists(ACCOUNTS_FILE):
        return []
    try:
        with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_accounts(accounts):
    with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
        json.dump(accounts, f, ensure_ascii=False, indent=2)


def add_account_to_file(phone, session_str):
    accounts = load_accounts()
    # اگر قبلا بوده حذفش کن و دوباره اضافه کن
    accounts = [a for a in accounts if a["phone"] != phone]
    accounts.append({"phone": phone, "session": session_str})
    save_accounts(accounts)


def remove_account_from_file(phone):
    accounts = load_accounts()
    accounts = [a for a in accounts if a["phone"] != phone]
    save_accounts(accounts)


def make_client(session_str=None):
    """ساخت کلاینت اکانت با StringSession و اطلاعات آیفون"""
    return TelegramClient(
        StringSession(session_str) if session_str else StringSession(),
        API_ID,
        API_HASH,
        device_model=DEVICE_MODEL,
        system_version=SYSTEM_VERSION,
        app_version=APP_VERSION,
    )


# ---------- بارگذاری اکانت‌ها هنگام روشن شدن ربات ----------
async def load_all_sessions():
    accounts = load_accounts()
    for acc in accounts:
        phone = acc["phone"]
        try:
            client = make_client(acc["session"])
            await client.connect()
            if await client.is_user_authorized():
                account_clients[phone] = client
                print(f"[+] اکانت لود شد: {phone}")
            else:
                print(f"[-] سشن نامعتبر: {phone}")
                await client.disconnect()
        except Exception as e:
            print(f"[!] خطا در لود {phone}: {e}")


# ---------- کیبورد منوی اصلی ----------
def main_menu():
    return [
        [Button.text("👁 افزایش ویو", resize=True)],
    ]


# ==================== هندلر /start ====================
@bot.on(events.NewMessage(pattern=r"^/start$"))
async def start_handler(event):
    uid = event.sender_id
    states.pop(uid, None)
    await event.respond(
        "سلام 👋\nبه ربات افزایش ویو خوش اومدی.\n\n"
        "برای شروع روی دکمه‌ی «افزایش ویو» بزن.",
        buttons=main_menu(),
    )


# ==================== /add  (فقط ادمین) ====================
@bot.on(events.NewMessage(pattern=r"^/add$"))
async def add_handler(event):
    uid = event.sender_id
    if uid != ADMIN_ID:
        await event.respond("⛔️ این دستور فقط برای ادمین است.")
        return
    states[uid] = {"state": "add_phone", "data": {}}
    await event.respond(
        "📱 شماره‌ی اکانت را با کد کشور وارد کن.\nمثال: +989123456789"
    )


# ==================== /account  (فقط ادمین) ====================
@bot.on(events.NewMessage(pattern=r"^/account$"))
async def account_handler(event):
    uid = event.sender_id
    if uid != ADMIN_ID:
        await event.respond("⛔️ این دستور فقط برای ادمین است.")
        return

    accounts = load_accounts()
    if not accounts:
        await event.respond("هیچ اکانتی ثبت نشده.")
        return

    buttons = []
    for acc in accounts:
        phone = acc["phone"]
        status = "🟢" if phone in account_clients else "🔴"
        buttons.append(
            [Button.inline(f"{status} {phone}  ❌ حذف", data=f"del:{phone}")]
        )

    await event.respond(
        f"📋 اکانت‌های ثبت‌شده ({len(accounts)} عدد):\n"
        "برای خروج/حذف یک اکانت روی آن بزن.",
        buttons=buttons,
    )


# ==================== هندلر دکمه‌ی شیشه‌ای حذف ====================
@bot.on(events.CallbackQuery(pattern=b"del:"))
async def delete_account_cb(event):
    uid = event.sender_id
    if uid != ADMIN_ID:
        await event.answer("⛔️ فقط ادمین.", alert=True)
        return

    phone = event.data.decode().split("del:", 1)[1]

    # خروج (logout) از اکانت بدون آسیب به اکانت
    client = account_clients.pop(phone, None)
    if client:
        try:
            await client.log_out()   # خروج تمیز از سشن
        except Exception:
            try:
                await client.disconnect()
            except Exception:
                pass

    remove_account_from_file(phone)
    await event.answer("✅ حذف شد.")

    # به‌روزرسانی لیست
    accounts = load_accounts()
    if not accounts:
        await event.edit("هیچ اکانتی باقی نمانده.")
        return

    buttons = []
    for acc in accounts:
        p = acc["phone"]
        status = "🟢" if p in account_clients else "🔴"
        buttons.append([Button.inline(f"{status} {p}  ❌ حذف", data=f"del:{p}")])
    await event.edit(f"📋 اکانت‌های ثبت‌شده ({len(accounts)} عدد):", buttons=buttons)


# ==================== هندلر اصلی پیام‌ها (FSM) ====================
@bot.on(events.NewMessage)
async def message_router(event):
    uid = event.sender_id
    text = (event.raw_text or "").strip()

    # دستورات را اینجا رد کن (هندلرهای اختصاصی دارند)
    if text.startswith("/"):
        return

    # دکمه‌ی منو
    if text == "👁 افزایش ویو":
        if not account_clients:
            await event.respond("⚠️ هیچ اکانت فعالی ثبت نشده. ادمین باید با /add اضافه کند.")
            return
        states[uid] = {"state": "view_link", "data": {}}
        await event.respond("🔗 لینک پست عمومی را بفرست.\nمثال: https://t.me/channel/123")
        return

    st = states.get(uid)
    if not st:
        return

    state = st["state"]

    # ---------- مرحله‌ی افزودن اکانت: شماره ----------
    if state == "add_phone":
        phone = text.replace(" ", "")
        if not re.match(r"^\+\d{6,15}$", phone):
            await event.respond("❌ فرمت شماره اشتباه است. مثال: +989123456789")
            return
        await event.respond("⏳ در حال ارسال کد ...")
        try:
            client = make_client()
            await client.connect()
            sent = await client.send_code_request(phone)
            temp_login[uid] = {
                "client": client,
                "phone": phone,
                "hash": sent.phone_code_hash,
            }
            st["state"] = "add_code"
            await event.respond(
                "🔑 کد تایید ارسال شد.\n"
                "کد را وارد کن ولی بین رقم‌ها فاصله بذار تا تلگرام لغوش نکنه.\n"
                "مثال: اگر کد 12345 است بنویس: 1 2 3 4 5"
            )
        except Exception as e:
            states.pop(uid, None)
            await event.respond(f"❌ خطا در ارسال کد:\n{e}")
        return

    # ---------- مرحله‌ی افزودن اکانت: کد ----------
    if state == "add_code":
        code = re.sub(r"\s+", "", text)  # فاصله‌ها را حذف کن
        info = temp_login.get(uid)
        if not info:
            states.pop(uid, None)
            await event.respond("❌ نشست منقضی شده. دوباره /add بزن.")
            return
        client = info["client"]
        try:
            await client.sign_in(
                phone=info["phone"], code=code, phone_code_hash=info["hash"]
            )
            # موفق شد
            session_str = client.session.save()
            add_account_to_file(info["phone"], session_str)
            account_clients[info["phone"]] = client
            temp_login.pop(uid, None)
            states.pop(uid, None)
            await event.respond(f"✅ اکانت {info['phone']} با موفقیت اضافه شد.")
        except SessionPasswordNeededError:
            st["state"] = "add_password"
            await event.respond("🔒 این اکانت رمز دو مرحله‌ای دارد. رمز را وارد کن:")
        except (PhoneCodeInvalidError, PhoneCodeExpiredError):
            await event.respond("❌ کد اشتباه یا منقضی شده. دوباره کد را بفرست یا /add بزن.")
        except Exception as e:
            states.pop(uid, None)
            temp_login.pop(uid, None)
            await event.respond(f"❌ خطا در لاگین:\n{e}")
        return

    # ---------- مرحله‌ی افزودن اکانت: رمز دو مرحله‌ای ----------
    if state == "add_password":
        info = temp_login.get(uid)
        if not info:
            states.pop(uid, None)
            await event.respond("❌ نشست منقضی شده. دوباره /add بزن.")
            return
        client = info["client"]
        try:
            await client.sign_in(password=text)
            session_str = client.session.save()
            add_account_to_file(info["phone"], session_str)
            account_clients[info["phone"]] = client
            temp_login.pop(uid, None)
            states.pop(uid, None)
            await event.respond(f"✅ اکانت {info['phone']} با موفقیت اضافه شد.")
        except Exception as e:
            await event.respond(f"❌ رمز اشتباه است یا خطا رخ داد:\n{e}\nدوباره رمز را بفرست.")
        return

    # ---------- مرحله‌ی ویو: لینک ----------
    if state == "view_link":
        link = text
        parsed = parse_link(link)
        if not parsed:
            await event.respond("❌ لینک نامعتبر است. مثال درست:\nhttps://t.me/channel/123")
            return
        st["data"]["channel"] = parsed[0]
        st["data"]["msg_id"] = parsed[1]
        st["state"] = "view_count"
        n = len(account_clients)
        await event.respond(
            f"🔢 چند ویو می‌خوای؟\n"
            f"(حداکثر برابر تعداد اکانت‌های ربات = {n})"
        )
        return

    # ---------- مرحله‌ی ویو: تعداد ----------
    if state == "view_count":
        if not text.isdigit():
            await event.respond("❌ فقط عدد وارد کن.")
            return
        count = int(text)
        n = len(account_clients)
        if count < 1:
            await event.respond("❌ عدد باید حداقل ۱ باشد.")
            return
        if count > n:
            await event.respond(f"⚠️ بیشتر از تعداد اکانت‌ها ({n}) نمی‌شود. دوباره عدد بده.")
            return

        data = st["data"]
        states.pop(uid, None)

        msg = await event.respond("🚀 عملیات شروع شد ...")
        ok, fail = await do_views(data["channel"], data["msg_id"], count)
        await msg.edit(
            f"✅ ویو زده شد!\n"
            f"موفق: {ok}\n"
            f"ناموفق: {fail}"
        )
        return


# ---------- تجزیه لینک پست ----------
def parse_link(link):
    """
    خروجی: (channel, msg_id)
    پشتیبانی از:
    https://t.me/username/123
    https://t.me/c/1234567890/123  (کانال خصوصی)
    """
    link = link.strip()
    m = re.match(r"https?://t\.me/c/(\d+)/(\d+)", link)
    if m:
        return (int("-100" + m.group(1)), int(m.group(2)))
    m = re.match(r"https?://t\.me/([A-Za-z0-9_]+)/(\d+)", link)
    if m:
        return (m.group(1), int(m.group(2)))
    return None


# ---------- انجام ویو با اکانت‌ها ----------
async def do_views(channel, msg_id, count):
    ok = 0
    fail = 0
    clients = list(account_clients.values())[:count]

    for client in clients:
        try:
            # گرفتن entity کانال
            try:
                entity = await client.get_entity(channel)
            except Exception:
                # اگر عضو نبود سعی کن جوین بشه (برای کانال عمومی)
                if isinstance(channel, str):
                    await client(functions.channels.JoinChannelRequest(channel))
                    entity = await client.get_entity(channel)
                else:
                    raise

            # افزایش ویو
            await client(
                functions.messages.GetMessagesViewsRequest(
                    peer=entity,
                    id=[msg_id],
                    increment=True,
                )
            )
            ok += 1
        except FloodWaitError as e:
            print(f"[FloodWait] {e.seconds}s")
            fail += 1
        except Exception as e:
            print(f"[view error] {e}")
            fail += 1
        await asyncio.sleep(0.7)  # فاصله برای جلوگیری از محدودیت

    return ok, fail


# ==================== اجرای ربات ====================
async def main():
    await bot.start(bot_token=BOT_TOKEN)
    print("[*] ربات روشن شد، در حال لود سشن‌ها ...")
    await load_all_sessions()
    print(f"[*] {len(account_clients)} اکانت آماده است.")
    print("[*] ربات آماده کار است.")
    await bot.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())