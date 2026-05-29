import { db, toRows } from '@/lib/db'
import { requireUser, canSeeAll, hashPassword } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, response } = await requireUser(); if (response) return response
  const sql = canSeeAll(user) ? 'SELECT * FROM Manager WHERE active != 0 ORDER BY name ASC' : 'SELECT * FROM Manager WHERE id = ? AND active != 0 ORDER BY name ASC'
  const result = canSeeAll(user) ? await db.execute(sql) : await db.execute({ sql, args: [user.id] })
  return Response.json(toRows(result).map(m => ({ ...m, active: m.active !== 0, password: undefined })))
}

export async function POST(request) {
  const { user, response } = await requireUser(); if (response) return response
  if (!canSeeAll(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const d = await request.json()
    const hashed = await hashPassword(d.password || '123456')
    const result = await db.execute({
      sql: 'INSERT INTO Manager (name, login, password, telegramId, phone, role, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [d.name, d.login || `${Date.now()}@visasia.kz`, hashed, d.telegramId || null, d.phone || null, d.role || 'manager', d.active === false ? 0 : 1]
    })
    const row = await db.execute({ sql: 'SELECT * FROM Manager WHERE id = ?', args: [Number(result.lastInsertRowid)] })
    return Response.json({ ...row.rows[0], password: undefined, active: row.rows[0].active !== 0 }, { status: 201 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
