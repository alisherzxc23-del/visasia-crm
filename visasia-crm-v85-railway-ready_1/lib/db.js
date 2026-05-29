import { createClient } from '@libsql/client'

const globalForDb = globalThis

// Подключение к базе:
// - Если заданы переменные TURSO_DATABASE_URL и TURSO_AUTH_TOKEN (облако Turso) — работаем с облачной базой.
// - Иначе (локальная разработка) — используем локальный файл prisma/dev.db.
// Так один и тот же код работает и на компьютере, и на сервере (Railway + Turso).
function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (url) {
    return createClient({ url, authToken })
  }
  return createClient({ url: 'file:prisma/dev.db' })
}

export const db = globalForDb.visasiaDb || createDbClient()

if (process.env.NODE_ENV !== 'production') globalForDb.visasiaDb = db

export function rowToBool(value) { return value === 1 || value === true }
export function nowIso() { return new Date().toISOString() }
export function toRows(result) { return result.rows.map(r => ({ ...r })) }
