import { cookies, headers } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { db, toRows } from '@/lib/db'
import { ensureCoreSchema } from '@/lib/schema'

const COOKIE_NAME = 'visasia_session'
const SECRET = process.env.AUTH_SECRET || 'visasia-dev-secret-change-before-production'
const DAY = 60 * 60 * 24

// ---- Пароли ----
// Хэшируем пароль перед сохранением в базу.
export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10)
}
// true, если строка похожа на bcrypt-хэш (а не старый plaintext-пароль)
export function isHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value)
}
// Проверка пароля с обратной совместимостью:
// - если в базе уже хэш — сравниваем через bcrypt;
// - если ещё старый plaintext — сравниваем напрямую (старые аккаунты не теряют доступ).
export async function verifyPassword(plain, stored) {
  if (stored == null) return false
  if (isHashed(stored)) {
    try { return await bcrypt.compare(String(plain), String(stored)) } catch { return false }
  }
  return String(plain) === String(stored)
}

function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

function safeEqual(a, b) {
  const ab = Buffer.from(a || '')
  const bb = Buffer.from(b || '')
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function normalizeRole(role) {
  const value = String(role || '').toLowerCase()
  if (value.includes('admin') || value.includes('админ')) return 'admin'
  if (value.includes('owner') || value.includes('руковод') || value.includes('director')) return 'owner'
  return 'manager'
}

export function canSeeAll(user) {
  return user && ['owner', 'admin'].includes(normalizeRole(user.role))
}

export function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    login: user.login,
    name: user.name,
    role: normalizeRole(user.role),
    exp: Math.floor(Date.now() / 1000) + DAY * 7,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function parseSessionToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  if (!safeEqual(signature, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

export async function findUserById(id) {
  await ensureCoreSchema()
  const result = await db.execute({ sql: 'SELECT * FROM Manager WHERE id = ? LIMIT 1', args: [Number(id)] })
  const user = toRows(result)[0]
  if (!user || user.active === 0) return null
  return { id: Number(user.id), name: user.name, login: user.login, role: normalizeRole(user.role), telegramId: user.telegramId || null }
}

export async function findUserByLogin(login) {
  await ensureCoreSchema()
  const result = await db.execute({ sql: 'SELECT * FROM Manager WHERE login = ? LIMIT 1', args: [String(login).trim()] })
  return toRows(result)[0] || null
}

export async function getSessionUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  const session = parseSessionToken(token)
  if (!session?.id) return null
  return findUserById(session.id)
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) return { user: null, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { user, response: null }
}

export async function setSessionCookie(user) {
  const store = await cookies()
  store.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DAY * 7,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

export async function recordLogin(user) {
  const h = await headers()
  console.log('VISASIA_LOGIN', JSON.stringify({
    userId: user.id,
    login: user.login,
    at: new Date().toISOString(),
    ip: h.get('x-forwarded-for') || h.get('x-real-ip') || 'local',
    userAgent: h.get('user-agent') || '',
  }))
}
