<?php

namespace App\Infrastructure\Database;

use PDO;
use PDOException;

class OJSConnection
{
    private ?PDO $ojsPdo = null;
    private bool $connected = false;

    public function __construct()
    {
        // Lazy connection - only connect when needed
    }

    public function getConnection(): PDO
    {
        if (!$this->connected) {
            $this->connect();
        }
        
        return $this->ojsPdo;
    }

    private function connect(): void
    {
        try {
            $host = $_ENV['OJS_DB_HOST'] ?? null;
            $port = $_ENV['OJS_DB_PORT'] ?? '3306';
            $database = $_ENV['OJS_DB_NAME'] ?? null;
            $username = $_ENV['OJS_DB_USER'] ?? null;
            $password = $_ENV['OJS_DB_PASSWORD'] ?? null;

            if (!$host || !$database) {
                throw new PDOException('OJS database configuration missing');
            }

            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            
            $this->ojsPdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ]);
            
            $this->connected = true;
            
            error_log("[OJS] Connected to OJS database: {$database}");
            
        } catch (PDOException $e) {
            error_log("[OJS ERROR] Failed to connect: " . $e->getMessage());
            throw $e;
        }
    }

    public function isConnected(): bool
    {
        return $this->connected;
    }

    public function testConnection(): bool
    {
        try {
            $pdo = $this->getConnection();
            $pdo->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            error_log("[OJS ERROR] Connection test failed: " . $e->getMessage());
            return false;
        }
    }
}
