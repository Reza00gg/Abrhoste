#!/usr/bin/env node
/**
 * Idempotent schema + seed for Neon PostgreSQL.
 * Run:  DATABASE_URL='postgres://...' node scripts/migrate.mjs
 */
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'

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
      email      text        not null unique,
      name       text,
      created_at timestamptz not null default now()
    )
  `
  console.log('✓ schema ready (titles, users)')

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
