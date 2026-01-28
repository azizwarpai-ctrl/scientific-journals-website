<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$pdo = new PDO(
    'mysql:host=' . $_ENV['DB_HOST'] . ';port=' . $_ENV['DB_PORT'] . ';dbname=' . $_ENV['DB_DATABASE'],
    $_ENV['DB_USERNAME'],
    $_ENV['DB_PASSWORD']
);

echo "=== Database Schema Inspection ===\n\n";

// List all tables
echo "Tables in database:\n";
$stmt = $pdo->query("SHOW TABLES");
while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    echo "  - " . $row[0] . "\n";
}

echo "\n=== admin_users table structure ===\n";
$stmt = $pdo->query("DESCRIBE admin_users");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo sprintf("  %-25s %-15s %s\n", $row['Field'], $row['Type'], $row['Null'] === 'YES' ? 'NULL' : 'NOT NULL');
}

echo "\n=== journals table structure ===\n";
$stmt = $pdo->query("DESCRIBE journals");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo sprintf("  %-25s %-15s %s\n", $row['Field'], $row['Type'], $row['Null'] === 'YES' ? 'NULL' : 'NOT NULL');
}
