<?php

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

use App\Infrastructure\Database\OJSConnection;

echo "=== Testing OJS Database Connection ===\n\n";

try {
    $ojsConn = new OJSConnection();
    
    if ($ojsConn->testConnection()) {
        echo "✅ OJS database connection: SUCCESS\n";
        
        // Try a simple query
        $pdo = $ojsConn->getConnection();
        $stmt = $pdo->query("SELECT DATABASE() as db");
        $result = $stmt->fetch();
        echo "✅ Connected to database: " . $result['db'] . "\n";
        
        // Check if submissions table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'submissions'");
        if ($stmt->rowCount() > 0) {
            echo "✅ OJS 'submissions' table found\n";
            
            // Count submissions
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM submissions");
            $result = $stmt->fetch();
            echo "   Total submissions in OJS: " . $result['count'] . "\n";
        } else {
            echo "⚠️  'submissions' table not found in OJS database\n";
        }
        
    } else {
        echo "❌ OJS database connection: FAILED\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
