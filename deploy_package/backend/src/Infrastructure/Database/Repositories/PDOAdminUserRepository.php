<?php

namespace App\Infrastructure\Database\Repositories;

use App\Domain\Entities\AdminUser;
use App\Domain\Repositories\AdminUserRepositoryInterface;
use DateTimeImmutable;
use PDO;

class PDOAdminUserRepository implements AdminUserRepositoryInterface
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findByEmail(string $email): ?AdminUser
    {
        $stmt = $this->pdo->prepare("SELECT * FROM admin_users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->mapRowToEntity($row);
    }

    public function findById(int $id): ?AdminUser
    {
        $stmt = $this->pdo->prepare("SELECT * FROM admin_users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->mapRowToEntity($row);
    }

    public function save(AdminUser $user): AdminUser
    {
        if ($user->getId() === null) {
            // Insert - Use reflection to access private password_hash
            $reflection = new \ReflectionClass($user);
            $passwordProperty = $reflection->getProperty('passwordHash');
            $passwordProperty->setAccessible(true);
            $passwordHash = $passwordProperty->getValue($user);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO admin_users (email, full_name, role, password_hash, created_at, updated_at)
                VALUES (:email, :full_name, :role, :password_hash, :created_at, :updated_at)
            ");
            
            $stmt->execute([
                'email' => $user->getEmail(),
                'full_name' => $user->getFullName(),
                'role' => $user->getRole(),
                'password_hash' => $passwordHash,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            
            // Return the saved entity with ID
            $id = (int)$this->pdo->lastInsertId();
            return $this->findById($id);
        }
        
        // Update existing user
        $reflection = new \ReflectionClass($user);
        $passwordProperty = $reflection->getProperty('passwordHash');
        $passwordProperty->setAccessible(true);
        $passwordHash = $passwordProperty->getValue($user);
        
        $stmt = $this->pdo->prepare("
            UPDATE admin_users 
            SET email = :email, full_name = :full_name, role = :role, 
                password_hash = :password_hash, updated_at = :updated_at
            WHERE id = :id
        ");
        
        $stmt->execute([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'full_name' => $user->getFullName(),
            'role' => $user->getRole(),
            'password_hash' => $passwordHash,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        
        return $this->findById($user->getId());
    }

    private function mapRowToEntity(array $row): AdminUser
    {
        return new AdminUser(
            (int)$row['id'],
            $row['email'],
            $row['full_name'],
            $row['role'],
            $row['password_hash'],
            true, // Default: 2FA enabled (even though not in DB)
            null, // No 2FA secret in DB
            new DateTimeImmutable($row['created_at']),
            new DateTimeImmutable($row['updated_at'])
        );
    }
}
