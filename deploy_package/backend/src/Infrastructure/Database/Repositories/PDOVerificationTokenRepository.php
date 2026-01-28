<?php

namespace App\Infrastructure\Database\Repositories;

use App\Domain\Entities\VerificationToken;
use App\Domain\Repositories\VerificationTokenRepositoryInterface;
use DateTimeImmutable;
use PDO;

class PDOVerificationTokenRepository implements VerificationTokenRepositoryInterface
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function save(VerificationToken $token): void
    {
        // Delete existing tokens for this identifier to prevent clutter
        $this->deleteByIdentifier($token->getIdentifier());

        $stmt = $this->pdo->prepare("
            INSERT INTO verification_tokens (identifier, token, expires, created_at)
            VALUES (:identifier, :token, :expires, :created_at)
        ");

        $stmt->execute([
            'identifier' => $token->getIdentifier(),
            'token' => $token->getToken(),
            'expires' => $token->getExpires()->format('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function findLatestByIdentifier(string $identifier): ?VerificationToken
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM verification_tokens 
            WHERE identifier = :identifier 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute(['identifier' => $identifier]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->mapRowToEntity($row);
    }

    public function findByIdentifierAndToken(string $identifier, string $token): ?VerificationToken
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM verification_tokens 
            WHERE identifier = :identifier AND token = :token
            LIMIT 1
        ");
        $stmt->execute(['identifier' => $identifier, 'token' => $token]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->mapRowToEntity($row);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare("DELETE FROM verification_tokens WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }

    public function deleteByIdentifier(string $identifier): void
    {
        $stmt = $this->pdo->prepare("DELETE FROM verification_tokens WHERE identifier = :identifier");
        $stmt->execute(['identifier' => $identifier]);
    }

    private function mapRowToEntity(array $row): VerificationToken
    {
        return new VerificationToken(
            (int)$row['id'],
            $row['identifier'],
            $row['token'],
            new DateTimeImmutable($row['expires']),
            new DateTimeImmutable($row['created_at'])
        );
    }
}
