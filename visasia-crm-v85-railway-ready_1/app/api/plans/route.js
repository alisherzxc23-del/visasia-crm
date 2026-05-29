import { db, toRows, nowIso } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

function monthKey(value) {
  const raw = String(value || '').trim()
  if (/^\d{4}-\d{2}$/.test(raw)) return raw
  return new Date().toISOString().slice(0, 7)
}

async function managerExists(managerId) {
  if (managerId === null) return true
  const r = await db.execute({ sql: 'SELECT id FROM Manager WHERE id = ? LIMIT 1', args: [managerId] })
  return Boolean(r.rows[0])
}

export async function GET(request) {
  const { user, response } = await requireUser(); if (response) return response
  const { searchParams } = new URL(request.url)
  const month = monthKey(searchParams.get('month'))
  const sql = canSeeAll(user)
    ? 'SELECT * FROM ManagerPlan WHERE month = ? ORDER BY managerId IS NOT NULL, managerId ASC'
    : 'SELECT * FROM ManagerPlan WHERE month = ? AND (managerId = ? OR managerId IS NULL) ORDER BY managerId IS NOT NULL, managerId ASC'
  const args = canSeeAll(user) ? [month] : [month, user.id]
  return Response.json(toRows(await db.execute({ sql, args })).map(p => ({ ...p, amount: Number(p.amount || 0), managerId: p.managerId === null ? null : Number(p.managerId) })))
}

export async function POST(request) {
  const { user, response } = await requireUser(); if (response) return response
  if (!canSeeAll(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const d = await request.json()
    const month = monthKey(d.month)
    const managerId = d.managerId === null || d.managerId === undefined || d.managerId === '' ? null : Number(d.managerId)
    const amount = Math.max(0, Math.round(Number(d.amount || 0)))
    if (managerId !== null && !Number.isFinite(managerId)) return Response.json({ error: 'Invalid managerId' }, { status: 400 })
    if (!(await managerExists(managerId))) return Response.json({ error: 'Manager not found' }, { status: 404 })
    const existing = await db.execute({
      sql: managerId === null ? 'SELECT id FROM ManagerPlan WHERE month = ? AND managerId IS NULL LIMIT 1' : 'SELECT id FROM ManagerPlan WHERE month = ? AND managerId = ? LIMIT 1',
      args: managerId === null ? [month] : [month, managerId]
    })
    const now = nowIso()
    if (existing.rows[0]) {
      await db.execute({ sql: 'UPDATE ManagerPlan SET amount = ?, updatedAt = ? WHERE id = ?', args: [amount, now, Number(existing.rows[0].id)] })
      const row = await db.execute({ sql: 'SELECT * FROM ManagerPlan WHERE id = ?', args: [Number(existing.rows[0].id)] })
      return Response.json(row.rows[0])
    }
    const inserted = await db.execute({ sql: 'INSERT INTO ManagerPlan (managerId, month, amount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', args: [managerId, month, amount, now, now] })
    const row = await db.execute({ sql: 'SELECT * FROM ManagerPlan WHERE id = ?', args: [Number(inserted.lastInsertRowid)] })
    return Response.json(row.rows[0], { status: 201 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
