import { db } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

async function recalcClient(clientId) {
  const sum = await db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as paid FROM Payment WHERE clientId = ?', args: [clientId] })
  const paid = Number(sum.rows[0]?.paid || 0)
  await db.execute({ sql: 'UPDATE Client SET paid = ?, status = ?, updatedAt = ? WHERE id = ?', args: [paid, paid > 0 ? 'work' : 'new', new Date().toISOString(), clientId] })
  return { paid }
}

export async function PATCH(request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const params = await ctx.params
    const id = Number(params.id)
    const d = await request.json()
    const oldRow = await db.execute({ sql: 'SELECT * FROM Payment WHERE id = ?', args: [id] })
    const old = oldRow.rows[0]
    if (!old) return Response.json({ error: 'Payment not found' }, { status: 404 })
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT p.id FROM Payment p LEFT JOIN Client c ON c.id = p.clientId WHERE p.id = ? AND c.managerId = ? LIMIT 1', args: [id, user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const fields = []
    const args = []
    if (d.amount !== undefined) { fields.push('amount = ?'); args.push(Number(d.amount || 0)) }
    if (d.method !== undefined) { fields.push('method = ?'); args.push(d.method || null) }
    if (d.clientId !== undefined) { fields.push('clientId = ?'); args.push(Number(d.clientId)) }
    if (!fields.length) return Response.json(old)
    args.push(id)
    await db.execute({ sql: `UPDATE Payment SET ${fields.join(', ')} WHERE id = ?`, args })

    await recalcClient(Number(old.clientId))
    if (d.clientId !== undefined && Number(d.clientId) !== Number(old.clientId)) await recalcClient(Number(d.clientId))

    const row = await db.execute({ sql: 'SELECT * FROM Payment WHERE id = ?', args: [id] })
    return Response.json(row.rows[0])
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}

export async function DELETE(_request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const params = await ctx.params
    const id = Number(params.id)
    const row = await db.execute({ sql: 'SELECT * FROM Payment WHERE id = ?', args: [id] })
    const payment = row.rows[0]
    if (!payment) return Response.json({ ok: true, id })
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT p.id FROM Payment p LEFT JOIN Client c ON c.id = p.clientId WHERE p.id = ? AND c.managerId = ? LIMIT 1', args: [id, user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    await db.execute({ sql: 'DELETE FROM Payment WHERE id = ?', args: [id] })
    await recalcClient(Number(payment.clientId))
    return Response.json({ ok: true, id })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
