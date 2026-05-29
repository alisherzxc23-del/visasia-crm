const { createClient } = require('@libsql/client')
const db = createClient({ url: 'file:prisma/dev.db' })

async function main() {
  await db.batch([
    'DROP TABLE IF EXISTS Comment',
    'DROP TABLE IF EXISTS Payment',
    'DROP TABLE IF EXISTS Task',
    'DROP TABLE IF EXISTS Client',
    'DROP TABLE IF EXISTS Stage',
    'DROP TABLE IF EXISTS Manager',
    `CREATE TABLE Manager (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, login TEXT NOT NULL UNIQUE, password TEXT NOT NULL, telegramId TEXT, role TEXT NOT NULL DEFAULT 'manager', active BOOLEAN NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE Stage (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#4f80e8', "order" INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE Client (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, telegram TEXT, city TEXT, direction TEXT, source TEXT, status TEXT NOT NULL DEFAULT 'new', value INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, note TEXT, managerId INTEGER, stageId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL, FOREIGN KEY(managerId) REFERENCES Manager(id), FOREIGN KEY(stageId) REFERENCES Stage(id))`,
    `CREATE TABLE Task (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, dueAt DATETIME, done BOOLEAN NOT NULL DEFAULT 0, clientId INTEGER NOT NULL, managerId INTEGER, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(clientId) REFERENCES Client(id), FOREIGN KEY(managerId) REFERENCES Manager(id))`,
    `CREATE TABLE Payment (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, method TEXT, clientId INTEGER NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(clientId) REFERENCES Client(id))`,
    `CREATE TABLE Comment (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, author TEXT NOT NULL, clientId INTEGER NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(clientId) REFERENCES Client(id))`,
  ], 'write')

  for (const [title, color, order] of [
    ['Новый лид', '#4f80e8', 1], ['Связались', '#8b9bb8', 2], ['Консультация', '#c8a96a', 3], ['Ожидает оплату', '#f2a044', 4], ['Документы', '#a78bfa', 5], ['Реализовано', '#33c481', 6], ['Не реализовано', '#ef646f', 7]
  ]) await db.execute({ sql: 'INSERT INTO Stage (title, color, "order") VALUES (?, ?, ?)', args: [title, color, order] })

  for (const m of [
    ['Динара', 'dinara@visasia.kz', '123456', '712345678', 'manager'],
    ['Руслан', 'ruslan@visasia.kz', '123456', '701234567', 'manager'],
    ['Мадина', 'madina@visasia.kz', '123456', '747555331', 'manager'],
    ['Директор', 'director@visasia.kz', '123456', '700000000', 'owner'],
    ['Руководитель ОП', 'admin@visasia.kz', '123456', '700000001', 'admin'],
  ]) await db.execute({ sql: 'INSERT INTO Manager (name, login, password, telegramId, role) VALUES (?, ?, ?, ?, ?)', args: m })

  const now = '2026-05-27T00:00:00.000Z'
  for (const c of [
    ['Алишер Каримов', '+7 777 123 45 67', '@alisher_k', 'Алматы', 'Австралия', 'Telegram Bot', 'work', 1250000, 600000, null, 1, 4, now, now],
    ['Рустам Назаров', '+998 90 234 56 78', null, 'Ташкент', 'Европа', 'Mini App', 'risk', 1600000, 0, null, 1, 4, now, now],
    ['Сабина Ахметова', '+7 707 888 77 66', '@sabina_a', 'Алматы', 'Корея', 'Telegram Bot', 'paid', 900000, 900000, null, 2, 6, now, now],
  ]) await db.execute({ sql: 'INSERT INTO Client (name, phone, telegram, city, direction, source, status, value, paid, note, managerId, stageId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: c })

  await db.execute({ sql: 'INSERT INTO Payment (amount, method, clientId, createdAt) VALUES (?, ?, ?, ?)', args: [600000, 'Kaspi Gold', 1, '2026-05-24T12:00:00.000Z'] })
  await db.execute({ sql: 'INSERT INTO Payment (amount, method, clientId, createdAt) VALUES (?, ?, ?, ?)', args: [900000, 'Kaspi Gold', 3, '2026-05-20T12:00:00.000Z'] })
  await db.execute({ sql: 'INSERT INTO Task (title, dueAt, done, clientId, managerId, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: ['Дожать оплату', '2026-05-28T18:00:00.000Z', 0, 1, 1, now] })
  await db.execute({ sql: 'INSERT INTO Task (title, dueAt, done, clientId, managerId, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: ['Повторный звонок', '2026-05-26T15:00:00.000Z', 0, 2, 1, now] })
  console.log('✓ База данных VisAsia CRM заполнена')
}

main().catch((error) => { console.error(error); process.exit(1) })
