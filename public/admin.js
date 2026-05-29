// Считываем пользователя из памяти. Если его нет или он не админ — выгоняем на вход
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || currentUser.role !== "admin") {
  window.location.href = "/index.html";
}

let activeAdminUserTab = null;

function toggleAdminUserView(role) {
  const opsList = document.getElementById("admin-operators-list");
  const clsList = document.getElementById("admin-clients-list");
  const opsBtn = document.getElementById("tab-ops-btn");
  const clsBtn = document.getElementById("tab-cls-btn");

  if (activeAdminUserTab === role) {
    opsList.style.display = "none";
    clsList.style.display = "none";
    opsBtn.style.background = "#f8fafc";
    clsBtn.style.background = "#f8fafc";
    activeAdminUserTab = null;
    return;
  }

  activeAdminUserTab = role;

  if (role === "operator") {
    opsList.style.display = "block";
    clsList.style.display = "none";
    opsBtn.style.background = "#007bff";
    opsBtn.style.color = "white";
    clsBtn.style.background = "#f8fafc";
    clsBtn.style.color = "#333";
  } else if (role === "client") {
    opsList.style.display = "none";
    clsList.style.display = "block";
    clsBtn.style.background = "#28a745";
    clsBtn.style.color = "white";
    opsBtn.style.background = "#f8fafc";
    opsBtn.style.color = "#333";
  }
}

// async function loadAllUsers() {
//   const res = await fetch("/api/admin-users");
//   const users = await res.json();
//   const opsList = document.getElementById("admin-operators-list");
//   const clsList = document.getElementById("admin-clients-list");

//   opsList.innerHTML = "";
//   clsList.innerHTML = "";
//   let hasOperators = false,
//     hasClients = false;

//   users.forEach((user) => {
//     const cardHTML = `
//       <div class="slot-card">
//         <div>Логин: <strong>${user.username}</strong></div>
//         <button class="book-btn" style="background: #dc3545;" onclick="deleteUser(${user.id})">Удалить</button>
//       </div>
//     `;
//     if (user.role === "operator") {
//       opsList.innerHTML += cardHTML;
//       hasOperators = true;
//     } else if (user.role === "client") {
//       clsList.innerHTML += cardHTML;
//       hasClients = true;
//     }
//   });

//   if (!hasOperators) opsList.innerHTML = "<p>Операторы не найдены.</p>";
//   if (!hasClients) clsList.innerHTML = "<p>Клиенты не найдены.</p>";
// }

async function createUser() {
  const username = document.getElementById("adm-user").value;
  const password = document.getElementById("adm-pass").value;
  const role = document.getElementById("adm-role").value;

  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await res.json();
  alert(data.message || data.error);
  loadAllAppointments();
  loadAllUsers();
}

async function deleteUser(userId) {
  if (!confirm("Удалить пользователя и все его записи?")) return;
  const res = await fetch(`/api/admin-users/${userId}`, { method: "DELETE" });
  const data = await res.json();
  alert(data.message || data.error);
  loadAllUsers();
  loadAllAppointments();
}

async function loadAllAppointments() {
  const res = await fetch("/api/admin-appointments");
  const appointments = await res.json();
  const adminDiv = document.getElementById("admin-all-appointments");
  adminDiv.innerHTML = "";

  if (appointments.length === 0) {
    adminDiv.innerHTML = "<p>В системе пока нет записей.</p>";
    return;
  }

  appointments.forEach((app) => {
    adminDiv.innerHTML += `
      <div class="slot-card" style="border-left: 5px solid #dc3545;">
        <div>Дата: <strong>${app.slot_date}</strong> в <strong>${app.slot_time}</strong><br>
        Опер.: <strong>${app.operator_name}</strong> | Клиент: <strong>${app.client_name}</strong></div>
      </div>
    `;
  });
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "/index.html";
}

// Загружаем данные при открытии страницы админа
loadAllAppointments();
loadAllUsers();
