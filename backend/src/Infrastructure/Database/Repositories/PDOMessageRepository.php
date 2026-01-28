<?php

namespace App\Infrastructure\Database\Repositories;

use App\Domain\Entities\Message;
use App\Domain\Repositories\MessageRepositoryInterface;
use PDO;

class PDOMessageRepository implements MessageRepositoryInterface
{
    public function __construct(private PDO $pdo) {}

    public function findAll(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        
        $stmt = $this->pdo->prepare("
            SELECT * FROM messages 
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $messages = [];
        while ($row = $stmt->fetch()) {
            $messages[] = $this->mapRowToEntity($row);
        }
        
        $total = $this->pdo->query("SELECT COUNT(*) as total FROM messages")->fetch()['total'];
        
        return [
            'data' => $messages,
            'total' => (int)$total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage)
        ];
    }

    public function findById(int $id): ?Message
    {
        $stmt = $this->pdo->prepare("SELECT * FROM messages WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        $row = $stmt->fetch();
        return $row ? $this->mapRowToEntity($row) : null;
    }

    public function save(Message $message): Message
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO messages (name, email, subject, message, status, created_at, responded_at)
            VALUES (:name, :email, :subject, :message, :status, :created_at, :responded_at)
        ");
        
        $stmt->execute([
            'name' => $message->getName(),
            'email' => $message->getEmail(),
            'subject' => $message->getSubject(),
            'message' => $message->getMessage(),
            'status' => $message->getStatus(),
            'created_at' => $message->getCreatedAt()->format('Y-m-d H:i:s'),
            'responded_at' => $message->getRespondedAt()?->format('Y-m-d H:i:s'),
        ]);
        
        $id = (int)$this->pdo->lastInsertId();
        return $this->findById($id);
    }

    private function mapRowToEntity(array $row): Message
    {
        return new Message(
            (int)$row['id'],
            $row['name'],
            $row['email'],
            $row['subject'],
            $row['message'],
            $row['status'],
            new \DateTimeImmutable($row['created_at']),
            $row['responded_at'] ? new \DateTimeImmutable($row['responded_at']) : null
        );
    }
}
