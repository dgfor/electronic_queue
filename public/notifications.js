// Автоматически создаем контейнер для уведомлений на странице при старте скрипта
if (!document.getElementById("toast-container")) {
  const container = document.createElement("div");
  container.id = "toast-container";
  document.body.appendChild(container);
}

// Главная глобальная функция вызова красивого уведомления
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");

  // Задаем иконку в зависимости от типа сообщения
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";

  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span>${icon}</span><div>${message}</div>`;

  container.appendChild(toast);

  // Через 3.5 секунды запускаем плавное исчезновение
  setTimeout(() => {
    toast.classList.add("fade-out");
    // Еще через 300мс (время анимации CSS) полностью удаляем элемент из HTML
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
