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
    alert(data.error);
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
