#!/usr/bin/env node
/**
 * Idempotent schema + seed for Neon PostgreSQL.
 * Run:  DATABASE_URL='postgres://...' node scripts/migrate.mjs
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set')
  process.exit(1)
}

const sql = neon(url)

const seed = [
  ['dune-part-two', 'تل ماسه: بخش دوم', 'Dune: Part Two', 'movie', 2024, 8.5],
  ['oppenheimer', 'اوپنهایمر', 'Oppenheimer', 'movie', 2023, 8.3],
  ['interstellar', 'در میان ستارگان', 'Interstellar', 'movie', 2014, 8.7],
  ['breaking-bad', 'برکینگ بد', 'Breaking Bad', 'series', 2008, 9.5],
  ['dark', 'تاریکی', 'Dark', 'series', 2017, 8.7],
  ['severance', 'جدایی', 'Severance', 'series', 2022, 8.7],
]

async function main() {
  console.log('→ connecting to Neon…')
  const [{ version }] = await sql`select version()`
  console.log('✓', version.split(',')[0])

  console.log('→ applying schema…')
  await sql`
    create table if not exists titles (
      id             bigint generated always as identity primary key,
      slug           text        not null unique,
      title          text        not null,
      original_title text,
      kind           text        not null default 'movie' check (kind in ('movie','series')),
      year           integer,
      rating         numeric(3,1),
      poster_url     text,
      overview       text,
      created_at     timestamptz not null default now()
    )
  `
  await sql`create index if not exists titles_kind_idx on titles (kind)`
  await sql`create index if not exists titles_title_idx on titles (title)`

  await sql`
    create table if not exists users (
      id         bigint generated always as identity primary key,
      email      text        unique,
      name       text,
      created_at timestamptz not null default now()
    )
  `
  // ---- auth fields (v1.2.3) ----
  await sql`alter table users add column if not exists display_name text`
  await sql`alter table users add column if not exists identifier text`
  await sql`alter table users add column if not exists password_hash text`
  await sql`alter table users alter column email drop not null`
  await sql`create unique index if not exists users_identifier_key on users (identifier)`

  await sql`
    create table if not exists sessions (
      id         bigint generated always as identity primary key,
      token_hash text        not null unique,
      user_id    bigint      not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `
  await sql`create index if not exists sessions_user_idx on sessions (user_id)`

  // Public announcements are global rows; clients poll this small table for live updates.
  await sql`
    create table if not exists notifications (
      id         bigint generated always as identity primary key,
      title      text        not null,
      message    text        not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `
  await sql`create index if not exists notifications_created_idx on notifications (created_at desc)`

  // Admin access is independent from website users and uses opaque server sessions.
  await sql`
    create table if not exists admin_users (
      id         bigint generated always as identity primary key,
      username   text        not null unique,
      password_hash text      not null,
      role       text        not null default 'owner',
      active     boolean     not null default true,
      last_login_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `
  await sql`
    create table if not exists admin_sessions (
      id         bigint generated always as identity primary key,
      token_hash text        not null unique,
      admin_id   bigint      not null references admin_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `
  await sql`create index if not exists admin_sessions_admin_idx on admin_sessions (admin_id)`
  await sql`
    create table if not exists admin_login_attempts (
      identifier       text primary key,
      failures         integer     not null default 0,
      window_started_at timestamptz not null default now(),
      blocked_until    timestamptz,
      updated_at       timestamptz not null default now()
    )
  `

  const adminUsername = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase()
  const adminPassword = String(process.env.ADMIN_PASSWORD || '')
  if (adminUsername && adminPassword) {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(adminPassword, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString('hex')
    const passwordHash = `s3$32768$${salt}$${hash}`
    await sql`
      insert into admin_users (username, password_hash, role, active)
      values (${adminUsername}, ${passwordHash}, 'owner', true)
      on conflict (username) do update
        set password_hash = excluded.password_hash, active = true, updated_at = now()
    `
    console.log('✓ admin seed: active')
  }
  console.log('✓ schema ready (titles, users + auth, sessions, notifications, admin auth)')

  await sql`
    create table if not exists app_meta (
      key        text primary key,
      value      text not null,
      updated_at timestamptz not null default now()
    )
  `
  // نسخه‌ی آخر اپ — منبع حقیقت برای اعتبارسنجی کلاینت‌ها
  await sql`
    insert into app_meta (key, value) values ('latest_app_version', ${pkg.version})
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `
  console.log(`✓ app_meta: latest_app_version = ${pkg.version}`)

  console.log('→ seeding…')
  for (const [slug, title, original, kind, year, rating] of seed) {
    await sql`
      insert into titles (slug, title, original_title, kind, year, rating)
      values (${slug}, ${title}, ${original}, ${kind}, ${year}, ${rating})
      on conflict (slug) do nothing
    `
  }
  const [{ count }] = await sql`select count(*)::int as count from titles`
  console.log(`✓ titles rows: ${count}`)
  console.log('✅ migration complete')
}

main().catch((error) => {
  console.error('✗ migration failed:', error.message)
  process.exit(1)
})
