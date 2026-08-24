import { db } from '../_lib/db.js'
import { json, withCors } from '../_lib/http.js'
import { requireAdmin } from '../_lib/admin-auth.js'

function mapNotification(row) {
  return { id: Number(row.id), title: row.title, message: row.message, createdAt: row.created_at, updatedAt: row.updated_at }
}

function readId(req) {
  const id = Number(req.query?.id)
  return Number.isSafeInteger(id) && id > 0 ? id : 0
}

export default async function handler(req, res) {
  if (withCors(req, res)) return
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'method_not_allowed' })

  const admin = await requireAdmin(req, res)
  if (!admin) return

  try {
    if (req.method === 'GET') {
      const rows = await db()`select id, title, message, created_at, updated_at from notifications order by id desc limit 100`
      return json(res, 200, { items: rows.map(mapNotification) })
    }

    if (req.method === 'POST') {
      const title = String(req.body?.title ?? '').trim()
      const message = String(req.body?.message ?? '').trim()
      if (!title || title.length > 120 || !message || message.length > 2000) {
        return json(res, 422, { error: 'invalid_notification', message: 'عنوان یا متن اعلان معتبر نیست' })
      }
      const [created] = await db()`
        insert into notifications (title, message) values (${title}, ${message})
        returning id, title, message, created_at, updated_at
      `
      return json(res, 201, { item: mapNotification(created) })
    }

    const id = readId(req)
    if (!id) return json(res, 422, { error: 'invalid_id', message: 'شناسه اعلان معتبر نیست' })

    if (req.method === 'PATCH') {
      const title = String(req.body?.title ?? '').trim()
      const message = String(req.body?.message ?? '').trim()
      if (!title || title.length > 120 || !message || message.length > 2000) {
        return json(res, 422, { error: 'invalid_notification', message: 'عنوان یا متن اعلان معتبر نیست' })
      }
      const [updated] = await db()`
        update notifications set title = ${title}, message = ${message}, updated_at = now()
        where id = ${id}
        returning id, title, message, created_at, updated_at
      `
      if (!updated) return json(res, 404, { error: 'not_found', message: 'اعلان پیدا نشد' })
      return json(res, 200, { item: mapNotification(updated) })
    }

    const [deleted] = await db()`delete from notifications where id = ${id} returning id`
    if (!deleted) return json(res, 404, { error: 'not_found', message: 'اعلان پیدا نشد' })
    return json(res, 200, { success: true, id: Number(deleted.id) })
  } catch {
    return json(res, 500, { error: 'server_error', message: 'خطا در مدیریت اعلان' })
  }
}
