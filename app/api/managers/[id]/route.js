import { db } from '@/lib/db'
import { requireUser, canSeeAll, hashPassword } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function PATCH(request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  if (!canSeeAll(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const params = await ctx.params
    const d = await request.json()
    // Если передан новый непустой пароль — хэшируем его перед сохранением.
    if (d.password !== undefined && d.password !== '') {
      d.password = await hashPassword(d.password)
    }
    const fields = []
    const args = []
    for (const key of ['name','login','password','telegramId','phone','role']) if (d[key] !== undefined) { fields.push(`${key} = ?`); args.push(d[key]) }
    if (d.password === '') { const i = fields.indexOf('password = ?'); if (i >= 0) { fields.splice(i, 1); args.splice(i, 1) } }
    if (d.active !== undefined) { fields.push('active = ?'); args.push(d.active ? 1 : 0) }
    if (!fields.length) return Response.json({ ok: true })
    args.push(Number(params.id))
    await db.execute({ sql: `UPDATE Manager SET ${fields.join(', ')} WHERE id = ?`, args })
    const row = await db.execute({ sql: 'SELECT * FROM Manager WHERE id = ?', args: [Number(params.id)] })
    return Response.json({ ...row.rows[0], password: undefined, active: row.rows[0].active !== 0 })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}


export async function DELETE(request, ctx) {
  const { user, response } = await requireUser(); if (response) return response
  if (!canSeeAll(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const params = await ctx.params
    const id = Number(params.id)
    if (!id) return Response.json({ error: 'Invalid manager id' }, { status: 400 })
    await db.execute({ sql: 'DELETE FROM Manager WHERE id = ?', args: [id] })
    return Response.json({ ok: true })
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
}
