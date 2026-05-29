import { db, toRows } from '@/lib/db'

let schemaPromise = null

async function tableExists(name) {
  const r = await db.execute({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1", args: [name] })
  return Boolean(r.rows[0])
}

async function columns(table) {
  if (!(await tableExists(table))) return new Set()
  const r = await db.execute(`PRAGMA table_info(${table})`)
  return new Set(toRows(r).map(c => c.name))
}

async function addColumn(table, name, ddl) {
  const cols = await columns(table)
  if (!cols.has(name)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

async function ensureTables() {
  await db.execute(`CREATE TABLE IF NOT EXISTS Manager (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'Менеджер', login TEXT, password TEXT, telegramId TEXT, role TEXT NOT NULL DEFAULT 'manager', active BOOLEAN NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  await addColumn('Manager', 'login', 'login TEXT')
  await addColumn('Manager', 'password', 'password TEXT')
  await addColumn('Manager', 'telegramId', 'telegramId TEXT')
  await addColumn('Manager', 'phone', 'phone TEXT')
  await addColumn('Manager', 'role', "role TEXT NOT NULL DEFAULT 'manager'")
  await addColumn('Manager', 'active', 'active BOOLEAN NOT NULL DEFAULT 1')
  await addColumn('Manager', 'createdAt', 'createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await db.execute(`CREATE TABLE IF NOT EXISTS Stage (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#4f80e8', "order" INTEGER NOT NULL DEFAULT 0)`)
  await addColumn('Stage', 'color', "color TEXT NOT NULL DEFAULT '#4f80e8'")
  await addColumn('Stage', 'order', '"order" INTEGER NOT NULL DEFAULT 0')

  await db.execute(`CREATE TABLE IF NOT EXISTS Client (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'Новый клиент', phone TEXT NOT NULL DEFAULT '—', telegram TEXT, city TEXT, direction TEXT, source TEXT, status TEXT NOT NULL DEFAULT 'new', value INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, note TEXT, managerId INTEGER, stageId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  for (const [name, ddl] of [
    ['phone', "phone TEXT NOT NULL DEFAULT '—'"], ['telegram', 'telegram TEXT'], ['city', 'city TEXT'], ['direction', 'direction TEXT'], ['source', 'source TEXT'], ['status', "status TEXT NOT NULL DEFAULT 'new'"], ['value', 'value INTEGER NOT NULL DEFAULT 0'], ['paid', 'paid INTEGER NOT NULL DEFAULT 0'], ['note', 'note TEXT'], ['managerId', 'managerId INTEGER'], ['stageId', 'stageId INTEGER'], ['createdAt', 'createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'], ['updatedAt', 'updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'],
    ['telegramChatId', 'telegramChatId TEXT'], ['botStarted', 'botStarted BOOLEAN NOT NULL DEFAULT 0']
  ]) await addColumn('Client', name, ddl)

  await db.execute(`CREATE TABLE IF NOT EXISTS Task (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT 'Новая задача', dueAt DATETIME, done BOOLEAN NOT NULL DEFAULT 0, clientId INTEGER, managerId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  for (const [name, ddl] of [['dueAt','dueAt DATETIME'], ['done','done BOOLEAN NOT NULL DEFAULT 0'], ['clientId','clientId INTEGER'], ['managerId','managerId INTEGER'], ['createdAt','createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']]) await addColumn('Task', name, ddl)

  await db.execute(`CREATE TABLE IF NOT EXISTS Payment (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL DEFAULT 0, method TEXT, clientId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  for (const [name, ddl] of [['method','method TEXT'], ['clientId','clientId INTEGER'], ['createdAt','createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']]) await addColumn('Payment', name, ddl)

  await db.execute(`CREATE TABLE IF NOT EXISTS Comment (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL DEFAULT '', author TEXT NOT NULL DEFAULT 'CRM', clientId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  for (const [name, ddl] of [['author',"author TEXT NOT NULL DEFAULT 'CRM'"], ['clientId','clientId INTEGER'], ['createdAt','createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']]) await addColumn('Comment', name, ddl)


  await db.execute(`CREATE TABLE IF NOT EXISTS ManagerPlan (id INTEGER PRIMARY KEY AUTOINCREMENT, managerId INTEGER, month TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  for (const [name, ddl] of [['managerId','managerId INTEGER'], ['month','month TEXT NOT NULL DEFAULT ""'], ['amount','amount INTEGER NOT NULL DEFAULT 0'], ['createdAt','createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'], ['updatedAt','updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']]) await addColumn('ManagerPlan', name, ddl)
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_plan_month_manager ON ManagerPlan(month, managerId)`)
}

async function ensureDefaults() {
  const managerCount = Number((await db.execute('SELECT COUNT(*) AS count FROM Manager')).rows[0]?.count || 0)
  if (!managerCount) {
    for (const m of [
      ['Динара', 'dinara@visasia.kz', '123456', '712345678', 'manager'],
      ['Руслан', 'ruslan@visasia.kz', '123456', '701234567', 'manager'],
      ['Мадина', 'madina@visasia.kz', '123456', '747555331', 'manager'],
      ['Руководитель', 'director@visasia.kz', '123456', '700000000', 'owner'],
      ['Админ', 'admin@visasia.kz', '123456', '700000001', 'admin'],
    ]) await db.execute({ sql: 'INSERT INTO Manager (name, login, password, telegramId, role, active) VALUES (?, ?, ?, ?, ?, 1)', args: m })
  } else {
    const managers = toRows(await db.execute('SELECT id, name, login, password, role FROM Manager ORDER BY id ASC'))
    for (const m of managers) {
      const login = m.login || `${String(m.name || 'manager').toLowerCase().replace(/\s+/g, '-')}-${m.id}@visasia.kz`
      const password = m.password || '123456'
      const role = m.role || 'manager'
      await db.execute({ sql: 'UPDATE Manager SET login = ?, password = ?, role = COALESCE(role, ?), active = COALESCE(active, 1) WHERE id = ?', args: [login, password, role, Number(m.id)] })
    }
    const hasDirector = (await db.execute({ sql: 'SELECT id FROM Manager WHERE login = ? LIMIT 1', args: ['director@visasia.kz'] })).rows[0]
    if (!hasDirector) await db.execute({ sql: 'INSERT INTO Manager (name, login, password, telegramId, role, active) VALUES (?, ?, ?, ?, ?, 1)', args: ['Руководитель', 'director@visasia.kz', '123456', '700000000', 'owner'] })
    const hasAdmin = (await db.execute({ sql: 'SELECT id FROM Manager WHERE login = ? LIMIT 1', args: ['admin@visasia.kz'] })).rows[0]
    if (!hasAdmin) await db.execute({ sql: 'INSERT INTO Manager (name, login, password, telegramId, role, active) VALUES (?, ?, ?, ?, ?, 1)', args: ['Админ', 'admin@visasia.kz', '123456', '700000001', 'admin'] })
  }

  const stageCount = Number((await db.execute('SELECT COUNT(*) AS count FROM Stage')).rows[0]?.count || 0)
  if (!stageCount) {
    for (const [title, color, order] of [
      ['Новый лид', '#4f80e8', 1], ['Связались', '#8b9bb8', 2], ['Консультация', '#c8a96a', 3], ['Ожидает оплату', '#f2a044', 4], ['Документы', '#a78bfa', 5], ['Реализовано', '#33c481', 98], ['Не реализовано', '#ef646f', 99]
    ]) await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: [title, color, order] })
  }
  const rows = toRows(await db.execute('SELECT * FROM Stage'))
  const realized = rows.find(s => String(s.title || '').trim().toLowerCase() === 'реализовано')
  const unrealized = rows.find(s => ['не реализовано', 'нереализовано'].includes(String(s.title || '').trim().toLowerCase()))
  if (!realized) await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: ['Реализовано', '#33c481', 98] })
  else await db.execute({ sql: 'UPDATE Stage SET title = ?, color = ?, "order" = 98 WHERE id = ?', args: ['Реализовано', realized.color || '#33c481', Number(realized.id)] })
  if (!unrealized) await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: ['Не реализовано', '#ef646f', 99] })
  else await db.execute({ sql: 'UPDATE Stage SET title = ?, color = ?, "order" = 99 WHERE id = ?', args: ['Не реализовано', unrealized.color || '#ef646f', Number(unrealized.id)] })
}

export async function ensureCoreSchema() {
  if (!schemaPromise) schemaPromise = (async () => { await ensureTables(); await ensureDefaults() })()
  return schemaPromise
}
