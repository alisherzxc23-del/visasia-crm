import { db } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function PATCH(request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const params = await ctx.params
    const d = await request.json()
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT t.id FROM Task t LEFT JOIN Client c ON c.id = t.clientId WHERE t.id = ? AND (t.managerId = ? OR c.managerId = ?) LIMIT 1', args: [Number(params.id), user.id, user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const fields = []
    const args = []
    if (d.title !== undefined) { fields.push('title = ?'); args.push(d.title) }
    if (d.dueAt !== undefined) { fields.push('dueAt = ?'); args.push(d.dueAt || null) }
    if (d.done !== undefined) { fields.push('done = ?'); args.push(d.done ? 1 : 0) }
    if (d.clientId !== undefined) { fields.push('clientId = ?'); args.push(Number(d.clientId)) }
    if (d.managerId !== undefined) { fields.push('managerId = ?'); args.push(d.managerId ? Number(d.managerId) : null) }
    if (!fields.length) return Response.json({ ok: true })
    args.push(Number(params.id))
    await db.execute({ sql: `UPDATE Task SET ${fields.join(', ')} WHERE id = ?`, args })
    const row = await db.execute({ sql: 'SELECT * FROM Task WHERE id = ?', args: [Number(params.id)] })
    return Response.json({ ...row.rows[0], done: row.rows[0].done !== 0 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
