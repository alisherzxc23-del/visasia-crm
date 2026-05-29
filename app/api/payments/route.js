import { db, toRows } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, response } = await requireUser(); if (response) return response
  const sql = 'SELECT p.*, c.name as client_name, c.phone as client_phone, c.value as client_value, c.managerId as client_managerId FROM Payment p LEFT JOIN Client c ON c.id = p.clientId'
  const result = canSeeAll(user)
    ? await db.execute(`${sql} ORDER BY p.createdAt DESC`)
    : await db.execute({ sql: `${sql} WHERE c.managerId = ? ORDER BY p.createdAt DESC`, args: [user.id] })
  return Response.json(toRows(result).map(p => ({ ...p, client: p.clientId ? { id: p.clientId, name: p.client_name, phone: p.client_phone, value: p.client_value, managerId: p.client_managerId } : null })))
}

export async function POST(request) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const d = await request.json()
    const amount = Number(d.amount || 0)
    const clientId = Number(d.clientId)
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT id FROM Client WHERE id = ? AND managerId = ? LIMIT 1', args: [clientId, user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const result = await db.execute({ sql: 'INSERT INTO Payment (amount, method, clientId) VALUES (?, ?, ?)', args: [amount, d.method || null, clientId] })
    const sum = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as paid FROM Payment WHERE clientId = ?', args: [clientId] })
    const paid = Number(sum.rows[0]?.paid || 0)
    await db.execute({ sql: 'UPDATE Client SET paid = ?, status = ?, updatedAt = ? WHERE id = ?', args: [paid, paid > 0 ? 'work' : 'new', new Date().toISOString(), clientId] })
    const row = await db.execute({ sql: 'SELECT * FROM Payment WHERE id = ?', args: [Number(result.lastInsertRowid)] })
    return Response.json(row.rows[0], { status: 201 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
