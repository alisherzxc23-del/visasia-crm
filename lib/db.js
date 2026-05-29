// Подключение к базе данных.
// Используется только Turso/libSQL через web-клиент.
// Для запуска требуется TURSO_DATABASE_URL.
// Опционально используется TURSO_AUTH_TOKEN.

import { createClient as createWebClient } from '@libsql/client/web'

const globalForDb = globalThis

function createDbClient() {
const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
throw new Error('TURSO_DATABASE_URL is not configured')
}

return createWebClient({
url,
authToken,
})
}

export const db = globalForDb.visasiaDb || createDbClient()

if (process.env.NODE_ENV !== 'production') {
globalForDb.visasiaDb = db
}

export function rowToBool(value) {
return value === 1 || value === true
}

export function nowIso() {
return new Date().toISOString()
}

export function toRows(result) {
return result.rows.map((r) => ({ ...r }))
}
