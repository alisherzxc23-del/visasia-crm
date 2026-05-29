import { db, toRows, nowIso } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

async function hydrateClients(where = '', args = []) {
  const clients = toRows(await db.execute({ sql: `SELECT c.*, m.id as manager_id, m.name as manager_name, m.login as manager_login, m.telegramId as manager_telegramId, m.role as manager_role, s.id as stage_id, s.title as stage_title, s.color as stage_color FROM Client c LEFT JOIN Manager m ON m.id = c.managerId LEFT JOIN Stage s ON s.id = c.stageId ${where} ORDER BY c.createdAt DESC`, args }))
  for (const c of clients) {
    c.manager = c.manager_id ? { id: c.manager_id, name: c.manager_name, login: c.manager_login, telegramId: c.manager_telegramId, role: c.manager_role } : null
    c.stage = c.stage_id ? { id: c.stage_id, title: c.stage_title, color: c.stage_color } : null
    c.tasks = toRows(await db.execute({ sql: 'SELECT * FROM Task WHERE clientId = ?', args: [c.id] })).map(t => ({ ...t, done: t.done !== 0 }))
    c.payments = toRows(await db.execute({ sql: 'SELECT * FROM Payment WHERE clientId = ?', args: [c.id] }))
    c.comments = toRows(await db.execute({ sql: 'SELECT * FROM Comment WHERE clientId = ?', args: [c.id] }))
  }
  return clients
}

async function managerIdByName(name) {
  if (!name) return null
  const r = await db.execute({ sql: 'SELECT id FROM Manager WHERE name = ? LIMIT 1', args: [name] })
  return r.rows[0]?.id || null
}

export async function GET() {
  const { user, response } = await requireUser(); if (response) return response
  if (!canSeeAll(user)) return Response.json(await hydrateClients('WHERE c.managerId = ?', [user.id]))
  return Response.json(await hydrateClients())
}

export async function POST(request) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const d = await request.json()
    const managerId = canSeeAll(user) ? (d.managerId ? Number(d.managerId) : await managerIdByName(d.manager)) : user.id
    const stageId = d.stageId ? Number(d.stageId) : Number(d.stage || 1)
    const now = nowIso()
    const result = await db.execute({
      sql: 'INSERT INTO Client (name, phone, telegram, city, direction, source, status, value, paid, note, managerId, stageId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [d.name || 'Новый клиент', d.phone || '—', d.telegram ?? d.tg ?? null, d.city || null, d.direction || null, d.source || 'Вручную', d.status || 'new', Number(d.value || 0), Number(d.paid || 0), d.note || null, managerId, Number.isFinite(stageId) ? stageId : null, now, now]
    })
    const clients = await hydrateClients('WHERE c.id = ?', [Number(result.lastInsertRowid)])
    return Response.json(clients[0], { status: 201 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
