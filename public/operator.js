const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || currentUser.role !== "operator") {
  window.location.href = "/index.html";
}

async function createSlot() {
  const slot_date = document.getElementById("op-date").value;
  const slot_time = document.getElementById("op-time").value;

  if (!slot_date || !slot_time) {
    alert("Пожалуйста, выберите дату и время!");
    return;
  }

  const res = await fetch("/api/slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operator_id: currentUser.id, slot_date, slot_time }),
  });
  const data = await res.json();
  alert(data.message || data.error);
  document.getElementById("op-time").value = "";
  loadOperatorQueue();
  loadOperatorSlots();
}

async function loadOperatorQueue() {
  const res = await fetch(
    `/api/operator-appointments?operator_id=${currentUser.id}`,
  );
  const appointments = await res.json();
  const queueDiv = document.getElementById("operator-queue-list");
  queueDiv.innerHTML = "";

  if (appointments.length === 0) {
    queueDiv.innerHTML = "<p>К вам пока никто не записался.</p>";
    return;
  }

  appointments.forEach((app) => {
    queueDiv.innerHTML += `
      <div class="slot-card" style="border-left: 5px solid #007bff;">
        <div>Дата: <strong>${app.slot_date}</strong> в <strong>${app.slot_time}</strong><br>
        Клиент: <strong>${app.client_name}</strong></div>
      </div>
    `;
  });
}

async function loadOperatorSlots() {
  const res = await fetch(`/api/operator-slots?operator_id=${currentUser.id}`);
  const slots = await res.json();
  const listDiv = document.getElementById("operator-my-slots-list");
  listDiv.innerHTML = "";

  if (slots.length === 0) {
    listDiv.innerHTML = "<p>Вы еще не открывали время.</p>";
    return;
  }

  slots.forEach((slot) => {
    const statusText =
      slot.is_booked === 1
        ? '<span style="color:#dc3545;font-weight:bold;">Занят</span>'
        : '<span style="color:#28a745;">Свободен</span>';
    listDiv.innerHTML += `
      <div class="slot-card">
        <div>Дата: <strong>${slot.slot_date}</strong> в <strong>${slot.slot_time}</strong></div>
        <div>${statusText}</div>
      </div>
    `;
  });
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "/index.html";
}

loadOperatorQueue();
loadOperatorSlots();

// Переключение видимости форм создания
function setOrderMode(mode) {
  if (mode === "single") {
    document.getElementById("form-single").style.display = "block";
    document.getElementById("form-batch").style.display = "none";
  } else {
    document.getElementById("form-single").style.display = "none";
    document.getElementById("form-batch").style.display = "block";
  }
}

// Функция пакетной генерации дня
async function generateWorkDay() {
  const slot_date = document.getElementById("op-date").value;
  const start_time = document.getElementById("op-start").value;
  const end_time = document.getElementById("op-end").value;
  const interval_minutes = document.getElementById("op-interval").value;

  if (!slot_date || !start_time || !end_time) {
    showToast("Пожалуйста, заполните все параметры генерации!", "error");
    return;
  }

  const res = await fetch("/api/slots/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operator_id: currentUser.id,
      slot_date,
      start_time,
      end_time,
      interval_minutes,
    }),
  });

  const data = await res.json();

  if (data.error) {
    showToast(data.error, "error");
  } else {
    showToast(data.message, "success");
  }

  loadOperatorSlots(); // Мгновенно обновляем сетку внизу у оператора
}
