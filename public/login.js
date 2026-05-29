async function handleLogin() {
  const username = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();

  if (data.error) {
    showToast(data.error, 'error');
    return;
  }

  // Сохраняем вошедшего пользователя в память браузера
  localStorage.setItem("currentUser", JSON.stringify(data.user));

  // Физически перенаправляем браузер на отдельную страницу
  if (data.user.role === "admin") {
    window.location.href = "/admin.html";
  } else if (data.user.role === "operator") {
    window.location.href = "/operator.html";
  } else if (data.user.role === "client") {
    window.location.href = "/client.html";
  }
}

// Функция переключения между Входом и Регистрацией
function toggleAuthForms(formType) {
  const loginForm = document.getElementById("screen-login");
  const registerForm = document.getElementById("screen-register");

  if (formType === "register") {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  } else {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  }
}

// Функция отправки данных регистрации на сервер
async function handleRegister() {
  const username = document.getElementById("reg-user").value.trim();
  const password = document.getElementById("reg-pass").value.trim();

  if (!username || !password) {
    showToast("Пожалуйста, заполните все поля!", "error");
    return;
  }

  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Роль при самостоятельной регистрации всегда строго 'client'
    body: JSON.stringify({ username, password, role: "client" }),
  });
  const data = await res.json();

  if (data.error) {
    showToast(data.error, "error");
    return;
  }

  showToast("Регистрация успешна! Войдите под своими данными.", "success");

  // Очищаем поля регистрации и переключаем на форму входа
  document.getElementById("reg-user").value = "";
  document.getElementById("reg-pass").value = "";
  toggleAuthForms("login");
}
