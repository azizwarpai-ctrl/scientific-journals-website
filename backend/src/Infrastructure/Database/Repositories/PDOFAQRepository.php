<?php

namespace App\Infrastructure\Database\Repositories;

use App\Domain\Entities\FAQ;
use App\Domain\Repositories\FAQRepositoryInterface;
use PDO;

class PDOFAQRepository implements FAQRepositoryInterface
{
    public function __construct(private PDO $pdo) {}

    public function findAll(int $page = 1, int $perPage = 20, bool $publishedOnly = false): array
    {
        $offset = ($page - 1) * $perPage;
        
        $sql = "SELECT * FROM faq_solutions";
        if ($publishedOnly) {
            $sql .= " WHERE is_published = 1";
        }
        $sql .= " ORDER BY priority DESC, created_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $faqs = [];
        while ($row = $stmt->fetch()) {
            $faqs[] = $this->mapRowToEntity($row);
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM faq_solutions";
        if ($publishedOnly) {
            $countSql .= " WHERE is_published = 1";
        }
        $total = $this->pdo->query($countSql)->fetch()['total'];
        
        return [
            'data' => $faqs,
            'total' => (int)$total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage)
        ];
    }

    public function findById(int $id): ?FAQ
    {
        $stmt = $this->pdo->prepare("SELECT * FROM faq_solutions WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        $row = $stmt->fetch();
        return $row ? $this->mapRowToEntity($row) : null;
    }

    public function save(FAQ $faq): FAQ
    {
        if ($faq->getId() === null) {
            // INSERT
            $stmt = $this->pdo->prepare("
                INSERT INTO faq_solutions (question, answer, category, priority, is_published, created_at, updated_at)
                VALUES (:question, :answer, :category, :priority, :is_published, :created_at, :updated_at)
            ");
            
            $stmt->execute([
                'question' => $faq->getQuestion(),
                'answer' => $faq->getAnswer(),
                'category' => $faq->getCategory(),
                'priority' => $faq->getPriority(),
                'is_published' => $faq->isPublished() ? 1 : 0,
                'created_at' => $faq->getCreatedAt()->format('Y-m-d H:i:s'),
                'updated_at' => $faq->getUpdatedAt()->format('Y-m-d H:i:s'),
            ]);
            
            $id = (int)$this->pdo->lastInsertId();
            return $this->findById($id);
        }
        
        // UPDATE
        $stmt = $this->pdo->prepare("
            UPDATE faq_solutions 
            SET question = :question, answer = :answer, category = :category,
                priority = :priority, is_published = :is_published, updated_at = :updated_at
            WHERE id = :id
        ");
        
        $stmt->execute([
            'id' => $faq->getId(),
            'question' => $faq->getQuestion(),
            'answer' => $faq->getAnswer(),
            'category' => $faq->getCategory(),
            'priority' => $faq->getPriority(),
            'is_published' => $faq->isPublished() ? 1 : 0,
            'updated_at' => $faq->getUpdatedAt()->format('Y-m-d H:i:s'),
        ]);
        
        return $faq;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM faq_solutions WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    private function mapRowToEntity(array $row): FAQ
    {
        return new FAQ(
            (int)$row['id'],
            $row['question'],
            $row['answer'],
            $row['category'],
            (int)$row['priority'],
            (bool)$row['is_published'],
            new \DateTimeImmutable($row['created_at']),
            new \DateTimeImmutable($row['updated_at'])
        );
    }
}
