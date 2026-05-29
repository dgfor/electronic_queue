const Database = require("better-sqlite3");
// Создаем или открываем файл базы данных queue.db
const db = new Database("queue.db", { verbose: console.log });

// Включаем поддержку связей между таблицами (Foreign Keys)
db.pragma("foreign_keys = ON");

// Создаем таблицы, если их еще нет
db.exec(`
  -- 1. Таблица пользователей (Админ, Операторы, Клиенты)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'client'))
  );

  -- 2. Таблица доступных тайм-слотов (то, что генерирует оператор)
  CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    slot_date TEXT NOT NULL,       -- Дата в формате ГГГГ-ММ-ДД
    slot_time TEXT NOT NULL,       -- Время в формате ЧЧ:ММ
    is_booked INTEGER DEFAULT 0,    -- 0 - свободно, 1 - занято клиентом
    FOREIGN KEY(operator_id) REFERENCES users(id) ON DELETE CASCADE
		-- ПРАВИЛО: Один оператор не может иметь два одинаковых времени в один день
    UNIQUE(operator_id, slot_date, slot_time) 
  );

  -- 3. Таблица записей клиентов на прием
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL UNIQUE, -- Один слот может быть занят только один раз
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(slot_id) REFERENCES time_slots(id) ON DELETE CASCADE
  );
`);

console.log("База данных и таблицы успешно созданы!");

// Экспортируем базу данных, чтобы использовать в других файлах
module.exports = db;
