<?php
header('Content-Type: text/plain; charset=utf-8');

echo "=== ПРИНУДИТЕЛЬНАЯ УСТАНОВКА БИБЛИОТЕК ===\n";
// Сервер выполнит установку пакетов и создаст базу данных
$output = shell_exec('npm install 2>&1 && node database.js 2>&1');
echo $output;
?>
