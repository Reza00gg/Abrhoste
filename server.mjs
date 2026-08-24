#!/usr/bin/env node
/**
 * Small VPS runtime for LenuMoviz.
 * It serves the Vite dist/ folder and adapts the existing Vercel-style
 * handlers under api/ to a normal Node HTTP process. Nginx terminates TLS.
 */
import http from 'node:http'
import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import health from './api/health.js'
import titles from './api/titles.js'
import authLogin from './api/auth/login.js'
import authLogout from './api/auth/logout.js'
import authMe from './api/auth/me.js'
import authRegister from './api/auth/register.js'
import notifications from './api/notifications.js'
import adminLogin from './api/admin/auth/login.js'
import adminLogout from './api/admin/auth/logout.js'
import adminMe from './api/admin/auth/me.js'
import adminNotifications from './api/admin/notifications.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(process.env.STATIC_DIR || path.join(ROOT, 'dist'))
const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT || 3000)
const MAX_BODY_BYTES = 2 * 1024 * 1024

const routes = new Map([
  ['GET /api/health', health],
  ['GET /api/titles', titles],
  ['GET /api/notifications', notifications],
  ['POST /api/auth/login', authLogin],
  ['POST /api/auth/logout', authLogout],
  ['GET /api/auth/me', authMe],
  ['POST /api/auth/register', authRegister],
  ['POST /api/admin/auth/login', adminLogin],
  ['POST /api/admin/auth/logout', adminLogout],
  ['GET /api/admin/auth/me', adminMe],
  ['GET /api/admin/notifications', adminNotifications],
  ['POST /api/admin/notifications', adminNotifications],
  ['PATCH /api/admin/notifications', adminNotifications],
  ['DELETE /api/admin/notifications', adminNotifications],
])

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function attachVercelResponseMethods(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }
  return res
}

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries())
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength > MAX_BODY_BYTES) throw Object.assign(new Error('body_too_large'), { statusCode: 413 })

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('body_too_large'), { statusCode: 413 })
    chunks.push(chunk)
  }
  if (!size) return {}

  const raw = Buffer.concat(chunks).toString('utf8')
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw) } catch { throw Object.assign(new Error('invalid_json'), { statusCode: 400 }) }
  }
  return Object.fromEntries(new URLSearchParams(raw).entries())
}

function jsonError(res, status, message) {
  if (res.headersSent) return res.end()
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ error: 'server_error', message }))
}

async function runApi(req, res, url, handler) {
  try {
    req.query = parseQuery(url)
    req.body = await readBody(req)
    await handler(req, attachVercelResponseMethods(res))
    if (!res.writableEnded) res.end()
  } catch (error) {
    jsonError(res, error?.statusCode || 500, error?.statusCode === 413 ? 'بدنه درخواست بیش از حد بزرگ است' : 'خطای سرور')
  }
}

function safeStaticPath(pathname) {
  let decoded
  try { decoded = decodeURIComponent(pathname) } catch { return null }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const file = path.resolve(DIST, relative)
  return file === DIST || file.startsWith(`${DIST}${path.sep}`) ? file : null
}

async function serveStatic(req, res, url) {
  const requested = safeStaticPath(url.pathname)
  let file = requested
  let isFallback = false
  if (!file) return jsonError(res, 400, 'مسیر نامعتبر است')

  try {
    const info = await stat(file)
    if (!info.isFile()) throw new Error('not_file')
  } catch {
    file = path.join(DIST, 'index.html')
    isFallback = true
  }

  try { await access(file) } catch { return jsonError(res, 404, 'صفحه پیدا نشد') }
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream')
  if (isFallback) res.setHeader('Cache-Control', 'no-store')
  else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  createReadStream(file).on('error', () => { if (!res.headersSent) jsonError(res, 500, 'خطای خواندن فایل') }).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const host = String(req.headers.host || '').split(':')[0]
  if (host === 'localhost' || host === '127.0.0.1') {
    // local health/testing is allowed; Nginx is the public boundary in production
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const handler = routes.get(`${req.method} ${url.pathname}`)
  if (handler) return runApi(req, res, url, handler)
  if (url.pathname.startsWith('/api/')) return jsonError(res, 404, 'مسیر API پیدا نشد')
  if (req.method !== 'GET' && req.method !== 'HEAD') return jsonError(res, 405, 'متد پشتیبانی نمی‌شود')
  return serveStatic(req, res, url)
})

server.on('error', (error) => {
  console.error('server error:', error.message)
  process.exitCode = 1
})

server.listen(PORT, HOST, () => {
  console.log(`LenuMoviz Node server listening on ${HOST}:${PORT}`)
  console.log(`Static directory: ${DIST}`)
})

function shutdown(signal) {
  console.log(`${signal}: shutting down`) 
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
