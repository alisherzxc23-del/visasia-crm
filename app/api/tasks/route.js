import { db, toRows } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, response } = await requireUser(); if (response) return response
  const result = canSeeAll(user)
    ? await db.execute('SELECT t.* FROM Task t ORDER BY t.createdAt DESC')
    : await db.execute({ sql: 'SELECT t.* FROM Task t LEFT JOIN Client c ON c.id = t.clientId WHERE t.managerId = ? OR c.managerId = ? ORDER BY t.createdAt DESC', args: [user.id, user.id] })
  return Response.json(toRows(result).map(t => ({ ...t, done: t.done !== 0 })))
}

export async function POST(request) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const d = await request.json()
    let managerId = d.managerId ? Number(d.managerId) : null
    if (!canSeeAll(user)) managerId = user.id
    const result = await db.execute({ sql: 'INSERT INTO Task (title, dueAt, done, clientId, managerId) VALUES (?, ?, ?, ?, ?)', args: [d.title || 'Новая задача', d.dueAt || null, d.done ? 1 : 0, Number(d.clientId), managerId] })
    const row = await db.execute({ sql: 'SELECT * FROM Task WHERE id = ?', args: [Number(result.lastInsertRowid)] })
    return Response.json({ ...row.rows[0], done: row.rows[0].done !== 0 }, { status: 201 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
