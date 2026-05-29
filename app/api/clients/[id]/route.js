import { db, nowIso } from '@/lib/db'
import { requireUser, canSeeAll } from '@/lib/auth'
export const dynamic = 'force-dynamic'

async function managerIdByName(name) {
  if (!name) return null
  const r = await db.execute({ sql: 'SELECT id FROM Manager WHERE name = ? LIMIT 1', args: [name] })
  return r.rows[0]?.id || null
}

async function stageIdByTitle(title) {
  const r = await db.execute({ sql: 'SELECT id FROM Stage WHERE lower(title) = lower(?) LIMIT 1', args: [title] })
  return r.rows[0]?.id || null
}

async function realizedStageId() { return stageIdByTitle('Реализовано') }
async function unrealizedStageId() { return stageIdByTitle('Не реализовано') }

export async function PATCH(request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const params = await ctx.params
    const d = await request.json()
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT id FROM Client WHERE id = ? AND managerId = ? LIMIT 1', args: [Number(params.id), user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const fields = []
    const args = []
    const map = { tg: 'telegram' }

    for (const key of ['name','phone','city','direction','source','status','note','telegram','tg']) {
      if (d[key] !== undefined) { fields.push(`${map[key] || key} = ?`); args.push(d[key]) }
    }
    if (d.value !== undefined) { fields.push('value = ?'); args.push(Number(d.value)) }
    if (d.paid !== undefined) { fields.push('paid = ?'); args.push(Number(d.paid)) }
    if (d.managerId !== undefined || d.manager) { fields.push('managerId = ?'); args.push(d.managerId ? Number(d.managerId) : await managerIdByName(d.manager)) }

    if (d.outcome === 'realized') {
      fields.push('status = ?'); args.push('paid')
      fields.push('stageId = ?'); args.push(await realizedStageId())
    } else if (d.outcome === 'unrealized') {
      fields.push('status = ?'); args.push('risk')
      fields.push('stageId = ?'); args.push(await unrealizedStageId())
    } else if (d.stageId !== undefined || d.stage !== undefined) {
      const raw = d.stageId ?? d.stage
      const sid = raw === 'closed' || raw === 'realized' ? await realizedStageId() : raw === 'unrealized' ? await unrealizedStageId() : Number(raw)
      if (Number.isFinite(Number(sid))) { fields.push('stageId = ?'); args.push(Number(sid)) }
    }

    if (!fields.length) return Response.json({ ok: true })
    fields.push('updatedAt = ?'); args.push(nowIso())
    args.push(Number(params.id))
    await db.execute({ sql: `UPDATE Client SET ${fields.join(', ')} WHERE id = ?`, args })
    const row = await db.execute({ sql: 'SELECT * FROM Client WHERE id = ?', args: [Number(params.id)] })
    return Response.json(row.rows[0])
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}

export async function DELETE(_request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  try {
    const params = await ctx.params
    const id = Number(params.id)
    if (!canSeeAll(user)) {
      const own = await db.execute({ sql: 'SELECT id FROM Client WHERE id = ? AND managerId = ? LIMIT 1', args: [id, user.id] })
      if (!own.rows[0]) return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    await db.batch([
      { sql: 'DELETE FROM Comment WHERE clientId = ?', args: [id] },
      { sql: 'DELETE FROM Payment WHERE clientId = ?', args: [id] },
      { sql: 'DELETE FROM Task WHERE clientId = ?', args: [id] },
      { sql: 'DELETE FROM Client WHERE id = ?', args: [id] },
    ], 'write')
    return Response.json({ ok: true, id })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
