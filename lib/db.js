// Подключение к базе данных.
// - На сервере (Railway + Turso): заданы TURSO_DATABASE_URL и TURSO_AUTH_TOKEN —
//   используем ВЕБ-клиент libSQL (работает по HTTP, без нативных драйверов под Linux).
// - Локально: переменных нет — подгружаем обычный клиент для файла prisma/dev.db.
//   Обычный клиент подключается через "спрятанный" require, чтобы сборщик Next.js
//   не пытался запекать нативные бинарники в серверную сборку.

import { createClient as createWebClient } from '@libsql/client/web'

const globalForDb = globalThis

function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (url) {
    return createWebClient({ url, authToken })
  }
  // Локальный режим (файл). require спрятан за переменной, чтобы бандлер его не трогал.
  const pkg = '@libsql/' + 'client'
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require(pkg)
  return createClient({ url: 'file:prisma/dev.db' })
}

export const db = globalForDb.visasiaDb || createDbClient()

if (process.env.NODE_ENV !== 'production') globalForDb.visasiaDb = db

export function rowToBool(value) { return value === 1 || value === true }
export function nowIso() { return new Date().toISOString() }
export function toRows(result) { return result.rows.map(r => ({ ...r })) }
