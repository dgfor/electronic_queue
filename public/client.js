const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || currentUser.role !== "client") {
  window.location.href = "/index.html";
}

function initCalendar() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayLocal = `${yyyy}-${mm}-${dd}`;

  const calendar = document.getElementById("client-calendar");
  if (calendar) {
    calendar.value = todayLocal;
    calendar.min = todayLocal;
  }
}

function handleDateChange() {
  loadSlots();
}

// async function loadSlots() {
//   const selectedDate = document.getElementById("client-calendar").value;
//   if (!selectedDate) return;

//   const res = await fetch(`/api/slots?date=${selectedDate}`);
//   const slots = await res.json();
//   const listDiv = document.getElementById("slots-list");
//   const slotsTitle = document.getElementById("slots-title");

//   listDiv.innerHTML = "";
//   slotsTitle.style.display = "block";

//   if (slots.length === 0) {
//     listDiv.innerHTML = "<p>На эту дату свободных окон нет.</p>";
//     return;
//   }

//   slots.forEach((slot) => {
//     listDiv.innerHTML += `
//       <div class="slot-card">
//         <div>Время: <span style="font-size: 18px; font-weight: bold; color: #4f46e5;">${slot.slot_time}</span></div>
//         <button class="book-btn" onclick="bookSlot(${slot.id})">Записаться</button>
//       </div>
//     `;
//   });
// }

// async function bookSlot(slotId) {
//   const res = await fetch("/api/appointments", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ client_id: currentUser.id, slot_id: slotId }),
//   });
//   const data = await res.json();
//   alert(data.message || data.error);
//   loadSlots();
//   loadMyAppointments();
// }

// Хранилище для ID слота, который клиент выбрал в данный момент
let selectedSlotIdForBooking = null;

// Загрузка слотов
async function loadSlots() {
  const selectedDate = document.getElementById("client-calendar").value;
  if (!selectedDate) return;

  const res = await fetch(`/api/slots?date=${selectedDate}`);
  const slots = await res.json();
  const listDiv = document.getElementById("slots-list");
  const slotsTitle = document.getElementById("slots-title");

  listDiv.innerHTML = "";
  slotsTitle.style.display = "block";

  if (slots.length === 0) {
    listDiv.innerHTML = "<p>На эту дату свободных окон нет.</p>";
    return;
  }

  slots.forEach((slot) => {
    // При клике на кнопку теперь вызывается функция пред-просмотра в окне openBookingModal
    listDiv.innerHTML += `
      <div class="slot-card">
        <div>Время: <span style="font-size: 18px; font-weight: bold; color: #4f46e5;">${slot.slot_time}</span></div>
        <button class="book-btn" onclick="openBookingModal(${slot.id}, '${slot.slot_date}', '${slot.slot_time}')">Выбрать</button>
      </div>
    `;
  });
}

// Открытие модального окна подтверждения
function openBookingModal(slotId, date, time) {
  selectedSlotIdForBooking = slotId;

  // Переворачиваем техническую дату для красивого вывода клиенту в окне
  const parts = date.split("-");
  const prettyDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

  document.getElementById("modal-booking-info").innerHTML =
    `${prettyDate} в ${time}`;
  document.getElementById("booking-modal").style.display = "flex";

  // Привязываем действие к кнопке подтверждения
  document.getElementById("confirm-booking-btn").onclick = function () {
    executeBooking(slotId);
  };
}

// Закрытие окна
function closeClientModal() {
  document.getElementById("booking-modal").style.display = "none";
  selectedSlotIdForBooking = null;
}

// Физическое бронирование после нажатия кнопки "Да, записаться" в окне
async function executeBooking(slotId) {
  // 1. МГНОВЕННО закрываем модальное окно, чтобы не заставлять пользователя ждать
  closeClientModal();

  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: currentUser.id, slot_id: slotId }),
  });
  const data = await res.json();

  // 2. Выводим наше красивое анимированное уведомление
  if (data.error) {
    showToast(data.error, "error");
  } else {
    showToast(data.message || "Вы успешно записались на прием!", "success");
  }

  // 3. СРАЗУ ЖЕ перезагружаем оба списка на экране клиента
  loadSlots(); // Слот исчезнет из доступного времени
  loadMyAppointments(); // Слот ТУТ ЖЕ появится внизу в блоке "Мои активные записи" с кнопкой отмены!
}

async function loadMyAppointments() {
  const res = await fetch(`/api/my-appointments?client_id=${currentUser.id}`);
  const appointments = await res.json();
  const listDiv = document.getElementById("my-appointments-list");
  listDiv.innerHTML = "";

  if (appointments.length === 0) {
    listDiv.innerHTML = "<p>У вас пока нет активных записей.</p>";
    return;
  }

  appointments.forEach((app) => {
    listDiv.innerHTML += `
      <div class="slot-card" style="border-left: 5px solid #28a745;">
        <div>Дата: <strong>${app.slot_date}</strong> в <strong>${app.slot_time}</strong></div>
        <button class="book-btn" style="background: #dc3545;" onclick="cancelAppointment(${app.appointment_id})">Отменить</button>
      </div>
    `;
  });
}

// Отмена записи Клиентом
async function cancelAppointment(appointmentId) {
  if (!confirm("Вы уверены, что хотите отменить эту запись?")) return;

  const res = await fetch(`/api/appointments/${appointmentId}`, {
    method: "DELETE",
  });
  const data = await res.json();

  if (data.error) {
    showToast(data.error, "error");
  } else {
    showToast(data.message || "Запись отменена!", "success");
  }

  // Мгновенно обновляем интерфейс кабинета
  loadSlots();
  loadMyAppointments();
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "/index.html";
}

// Запуск при загрузке страницы клиента
initCalendar();
loadSlots();
loadMyAppointments();
