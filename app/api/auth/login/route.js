import { findUserByLogin, setSessionCookie, recordLogin, normalizeRole, verifyPassword, hashPassword, isHashed } from '@/lib/auth'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  const { login, password } = await request.json()
  if (!login || !password) return Response.json({ error: 'Введите логин и пароль' }, { status: 400 })

  const user = await findUserByLogin(login)
  const ok = user && user.active !== 0 && await verifyPassword(password, user.password)
  if (!ok) {
    return Response.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  // Плавная миграция: если пароль ещё в открытом виде — захэшировать после успешного входа.
  if (!isHashed(user.password)) {
    try {
      const hashed = await hashPassword(password)
      await db.execute({ sql: 'UPDATE Manager SET password = ? WHERE id = ?', args: [hashed, Number(user.id)] })
    } catch (e) { /* не критично: вход уже выполнен */ }
  }

  const safeUser = { id: Number(user.id), name: user.name, login: user.login, role: normalizeRole(user.role), telegramId: user.telegramId || null }
  await setSessionCookie(safeUser)
  await recordLogin(safeUser)
  return Response.json({ ok: true, user: safeUser })
}
