<?php
require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

try {
    $pdo = new PDO(
        'mysql:host=' . $_ENV['DB_HOST'] . ';port=' . $_ENV['DB_PORT'] . ';dbname=' . $_ENV['DB_DATABASE'],
        $_ENV['DB_USERNAME'],
        $_ENV['DB_PASSWORD']
    );
    
    echo "Using Database: " . $_ENV['DB_DATABASE'] . "\n";
    
    $tables = ['admin_users', 'journals', 'messages', 'faq_solutions', 'verification_tokens', 'submissions'];
    
    foreach ($tables as $table) {
        echo "\nTable: $table\n";
        try {
            $stmt = $pdo->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($columns as $col) {
                echo " - " . $col['Field'] . " (" . $col['Type'] . ")\n";
            }
        } catch (Exception $e) {
            echo " - ERROR: " . $e->getMessage() . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage();
}
