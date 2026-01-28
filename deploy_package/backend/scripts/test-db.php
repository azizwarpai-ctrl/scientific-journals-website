<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

echo "Testing database connection...\n";
echo "Host: " . $_ENV['DB_HOST'] . "\n";
echo "Port: " . $_ENV['DB_PORT'] . "\n";
echo "Database: " . $_ENV['DB_DATABASE'] . "\n";
echo "Username: " . $_ENV['DB_USERNAME'] . "\n\n";

try {
    $pdo = new PDO(
        'mysql:host=' . $_ENV['DB_HOST'] . ';port=' . $_ENV['DB_PORT'] . ';dbname=' . $_ENV['DB_DATABASE'],
        $_ENV['DB_USERNAME'],
        $_ENV['DB_PASSWORD'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    echo "✅ Database connection: SUCCESS\n";
    
    // Test query
    $stmt = $pdo->query("SELECT DATABASE() as db");
    $result = $stmt->fetch();
    echo "✅ Connected to database: " . $result['db'] . "\n";
    
    // Check if admin_users table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'admin_users'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Table 'admin_users' exists\n";
    } else {
        echo "⚠️  Table 'admin_users' does NOT exist - run migrations!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database connection FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
