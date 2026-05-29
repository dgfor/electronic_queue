const express = require("express");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// === АВТОРИЗАЦИЯ ===
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);
    if (!user || user.password !== password) {
      return res.status(400).json({ error: "Неверный логин или пароль" });
    }
    res.json({
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ ===
app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body;
  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    );
    const info = stmt.run(username, password, role);
    res.status(201).json({ userId: info.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === ОПЕРАТОР: СОЗДАТЬ СЛОТ ===
// app.post("/api/slots", (req, res) => {
//   const { operator_id, slot_date, slot_time } = req.body;
//   try {
//     const stmt = db.prepare(
//       "INSERT INTO time_slots (operator_id, slot_date, slot_time) VALUES (?, ?, ?)",
//     );
//     const info = stmt.run(operator_id, slot_date, slot_time);
//     res.status(201).json({ message: "Тайм-слот успешно открыт для записи!" });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// === ОПЕРАТОР: ГЕНЕРАЦИЯ СЕТКИ РАБОЧЕГО ДНЯ С ЗАЩИТОЙ ОТ ДУБЛИКАТОВ ===
app.post("/api/slots/generate", (req, res) => {
  const { operator_id, slot_date, start_time, end_time, interval_minutes } =
    req.body;

  try {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(
        "INSERT INTO time_slots (operator_id, slot_date, slot_time) VALUES (?, ?, ?)",
      );

      let [currentH, currentM] = start_time.split(":").map(Number);
      const [endH, endM] = end_time.split(":").map(Number);

      const startTotal = currentH * 60 + currentM;
      const endTotal = endH * 60 + endM;
      let runningTotal = startTotal;

      let createdCount = 0;
      let skippedCount = 0; // Считаем, сколько дубликатов мы пропустили

      while (runningTotal <= endTotal) {
        const h = String(Math.floor(runningTotal / 60)).padStart(2, "0");
        const m = String(runningTotal % 60).padStart(2, "0");
        const timeStr = `${h}:${m}`;

        // УМНАЯ ПРОВЕРКА: Ищем, существует ли уже ТОЧНО ТАКОЙ ЖЕ слот в базе
        const existingSlot = db
          .prepare(
            `
          SELECT id FROM time_slots 
          WHERE operator_id = ? AND slot_date = ? AND slot_time = ?
        `,
          )
          .get(operator_id, slot_date, timeStr);

        if (!existingSlot) {
          // Если слота нет — создаем его
          stmt.run(operator_id, slot_date, timeStr);
          createdCount++;
        } else {
          // Если слот уже был создан вручную ранее — пропускаем
          skippedCount++;
        }

        runningTotal += Number(interval_minutes);
      }

      // Возвращаем оба значения из транзакции
      return { createdCount, skippedCount };
    });

    const result = transaction();

    // Формируем понятный ответ для оператора
    let responseMessage = `Успешно сгенерировано слотов: ${result.createdCount}.`;
    if (result.skippedCount > 0) {
      responseMessage += ` Пропущено дубликатов: ${result.skippedCount}.`;
    }

    res.status(201).json({ message: responseMessage });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === ОПЕРАТОР: ПОЛУЧИТЬ ВСЕ СВОИ СЛОТЫ ===
app.get("/api/operator-slots", (req, res) => {
  const { operator_id } = req.query;
  try {
    const slots = db
      .prepare(
        "SELECT * FROM time_slots WHERE operator_id = ? ORDER BY slot_date ASC, slot_time ASC",
      )
      .all(operator_id);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ОПЕРАТОР: ПОЛУЧИТЬ ЗАПИСАННЫХ К НЕМУ КЛИЕНТОВ ===
app.get("/api/operator-appointments", (req, res) => {
  const { operator_id } = req.query;
  try {
    const appointments = db
      .prepare(
        `
      SELECT appointments.id, time_slots.slot_date, time_slots.slot_time, users.username AS client_name
      FROM appointments
      JOIN time_slots ON appointments.slot_id = time_slots.id
      JOIN users ON appointments.client_id = users.id
      WHERE time_slots.operator_id = ?
    `,
      )
      .all(operator_id);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === КЛИЕНТ: ПОЛУЧИТЬ СВОБОДНЫЕ СЛОТЫ ПО ДАТЕ ===
app.get("/api/slots", (req, res) => {
  const { date } = req.query;
  try {
    const slots = db
      .prepare(
        "SELECT * FROM time_slots WHERE is_booked = 0 AND slot_date = ? ORDER BY slot_time ASC",
      )
      .all(date);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === КЛИЕНТ: ЗАПИСАТЬСЯ НА ПРИЕМ ===
app.post("/api/appointments", (req, res) => {
  const { client_id, slot_id } = req.body;
  const transaction = db.transaction(() => {
    db.prepare("UPDATE time_slots SET is_booked = 1 WHERE id = ?").run(slot_id);
    db.prepare(
      "INSERT INTO appointments (client_id, slot_id) VALUES (?, ?)",
    ).run(client_id, slot_id);
    return true;
  });
  try {
    transaction();
    res.status(201).json({ message: "Вы успешно записались на прием!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === КЛИЕНТ: ЛИЧНЫЕ ЗАПИСИ ===
app.get("/api/my-appointments", (req, res) => {
  const { client_id } = req.query;
  try {
    const appointments = db
      .prepare(
        `
      SELECT appointments.id AS appointment_id, time_slots.slot_date, time_slots.slot_time 
      FROM appointments
      JOIN time_slots ON appointments.slot_id = time_slots.id
      WHERE appointments.client_id = ?
    `,
      )
      .all(client_id);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === КЛИЕНТ: ОТМЕНА ЗАПИСИ ===
app.delete("/api/appointments/:id", (req, res) => {
  try {
    const appId = req.params.id;
    const appointment = db
      .prepare("SELECT slot_id FROM appointments WHERE id = ?")
      .get(appId);
    if (appointment) {
      db.prepare("UPDATE time_slots SET is_booked = 0 WHERE id = ?").run(
        appointment.slot_id,
      );
      db.prepare("DELETE FROM appointments WHERE id = ?").run(appId);
    }
    res.json({ message: "Запись отменена!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === АДМИН: ЖУРНАЛ ===
app.get("/api/admin-appointments", (req, res) => {
  try {
    const appointments = db
      .prepare(
        `
      SELECT appointments.id, time_slots.slot_date, time_slots.slot_time, c.username AS client_name, o.username AS operator_name
      FROM appointments
      JOIN time_slots ON appointments.slot_id = time_slots.id
      JOIN users AS c ON appointments.client_id = c.id
      JOIN users AS o ON time_slots.operator_id = o.id
    `,
      )
      .all();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === МАРШРУТ АДМИНА: Получить список ВСЕХ зарегистрированных пользователей ===
app.get("/api/admin-users", (req, res) => {
  try {
    // Выбираем всех, кроме самого главного админа, чтобы он случайно себя не удалил
    const users = db
      .prepare(
        "SELECT id, username, role FROM users WHERE role != 'admin' ORDER BY role ASC, username ASC",
      )
      .all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === МАРШРУТ АДМИНА: Удалить пользователя из системы ===
app.delete("/api/admin-users/:id", (req, res) => {
  const userId = req.params.id;
  try {
    // Благодаря настройке FOREIGN KEY в database.js, при удалении пользователя
    // автоматически удалятся все его тайм-слоты и записи на прием!
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    res.json({ message: "Пользователь успешно удален из системы!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// === ОПЕРАТОР: ГЕНЕРАЦИЯ СЕТКИ РАБОЧЕГО ДНЯ ===
app.post("/api/slots/generate", (req, res) => {
  const { operator_id, slot_date, start_time, end_time, interval_minutes } =
    req.body;

  try {
    // Используем транзакцию, чтобы все слоты создались пачкой безопасно
    const transaction = db.transaction(() => {
      const stmt = db.prepare(
        "INSERT INTO time_slots (operator_id, slot_date, slot_time) VALUES (?, ?, ?)",
      );

      // Переводим часы и минуты в удобный для расчета формат
      let [currentH, currentM] = start_time.split(":").map(Number);
      const [endH, endM] = end_time.split(":").map(Number);

      const startTotal = currentH * 60 + currentM;
      const endTotal = endH * 60 + endM;
      let runningTotal = startTotal;

      let createdCount = 0;

      while (runningTotal <= endTotal) {
        const h = String(Math.floor(runningTotal / 60)).padStart(2, "0");
        const m = String(runningTotal % 60).padStart(2, "0");
        const timeStr = `${h}:${m}`;

        // Проверяем, нет ли уже такого слота у этого оператора на это время
        const exist = db
          .prepare(
            "SELECT id FROM time_slots WHERE operator_id = ? AND slot_date = ? AND slot_time = ?",
          )
          .get(operator_id, slot_date, timeStr);

        if (!exist) {
          stmt.run(operator_id, slot_date, timeStr);
          createdCount++;
        }

        runningTotal += Number(interval_minutes); // Шаг вперед (например, +30 минут)
      }
      return createdCount;
    });

    const count = transaction();
    res.status(201).json({ message: `Успешно сгенерировано слотов: ${count}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () =>
  console.log(`Сервер запущен на http://localhost:${PORT}`),
);
