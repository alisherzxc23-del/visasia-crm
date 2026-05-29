import { db, toRows } from '@/lib/db'
import { requireUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'

const REALIZED = 'Реализовано'
const UNREALIZED = 'Не реализовано'

async function ensureTerminalStages() {
  const rows = toRows(await db.execute('SELECT * FROM Stage ORDER BY "order" ASC'))
  const maxOrder = rows.reduce((m, s) => Math.max(m, Number(s.order || 0)), 0)
  let realized = rows.find(s => ['реализовано', 'закрыто', 'closed'].includes(String(s.title || '').trim().toLowerCase()))
  let unrealized = rows.find(s => ['не реализовано', 'нереализовано', 'unrealized', 'lost', 'отказ'].includes(String(s.title || '').trim().toLowerCase()))

  if (realized) {
    await db.execute({ sql: 'UPDATE Stage SET title = ?, color = COALESCE(color, ?), "order" = ? WHERE id = ?', args: [REALIZED, '#33c481', maxOrder + 1, Number(realized.id)] })
  } else {
    await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: [REALIZED, '#33c481', maxOrder + 1] })
  }

  const refreshed = toRows(await db.execute('SELECT * FROM Stage ORDER BY "order" ASC'))
  unrealized = refreshed.find(s => ['не реализовано', 'нереализовано', 'unrealized', 'lost', 'отказ'].includes(String(s.title || '').trim().toLowerCase()))
  if (unrealized) {
    await db.execute({ sql: 'UPDATE Stage SET title = ?, color = COALESCE(color, ?), "order" = ? WHERE id = ?', args: [UNREALIZED, '#ef646f', maxOrder + 2, Number(unrealized.id)] })
  } else {
    await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: [UNREALIZED, '#ef646f', maxOrder + 2] })
  }
}

export async function GET() {
  const { response } = await requireUser(); if (response) return response
  await ensureTerminalStages()
  const result = await db.execute('SELECT * FROM Stage ORDER BY "order" ASC')
  return Response.json(toRows(result))
}
