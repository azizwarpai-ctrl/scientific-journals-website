<?php

namespace App\Infrastructure\Database\Repositories;

use App\Domain\Entities\Journal;
use App\Domain\Repositories\JournalRepositoryInterface;
use DateTimeImmutable;
use PDO;

class PDOJournalRepository implements JournalRepositoryInterface
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findAll(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $offset = ($page - 1) * $perPage;
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'status = :status';
            $params['status'] = $filters['status'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $countSql = "SELECT COUNT(*) FROM journals $whereClause";
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int)$stmt->fetchColumn();

        $sql = "SELECT * FROM journals $whereClause ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($params as $key => $val) {
            $stmt->bindValue(":$key", $val);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $journals = [];
        while ($row = $stmt->fetch()) {
            $journals[] = $this->mapRowToEntity($row);
        }

        return [
            'data' => $journals,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }

    public function findById(int $id): ?Journal
    {
        $stmt = $this->pdo->prepare("SELECT * FROM journals WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToEntity($row) : null;
    }

    public function save(Journal $journal): Journal
    {
        if ($journal->getId() === null) {
            $stmt = $this->pdo->prepare("
                INSERT INTO journals (
                    title, abbreviation, issn, e_issn, description, field, publisher, 
                    submission_fee, publication_fee, status, created_by, ojs_id, created_at, updated_at
                ) VALUES (
                    :title, :abbreviation, :issn, :e_issn, :description, :field, :publisher,
                    :submission_fee, :publication_fee, :status, :created_by, :ojs_id, :created_at, :updated_at
                )
            ");
            
            $data = $journal->toArray();
            unset($data['id']); // PK not needed for insert

            $stmt->execute([
                'title' => $data['title'],
                'abbreviation' => $data['abbreviation'],
                'issn' => $data['issn'],
                'e_issn' => $data['e_issn'],
                'description' => $data['description'],
                'field' => $data['field'],
                'publisher' => $data['publisher'],
                'submission_fee' => $data['submission_fee'],
                'publication_fee' => $data['publication_fee'],
                'status' => $data['status'],
                'created_by' => $data['created_by'],
                'ojs_id' => $data['ojs_id'],
                'created_at' => $data['created_at'],
                'updated_at' => $data['updated_at']
            ]);

            return $this->findById((int)$this->pdo->lastInsertId());
        }
        
        // Update existing journal
        $data = $journal->toArray();
        
        $stmt = $this->pdo->prepare("
            UPDATE journals 
            SET title = :title, abbreviation = :abbreviation, issn = :issn, 
                e_issn = :e_issn, description = :description, field = :field,
                publisher = :publisher, submission_fee = :submission_fee,
                publication_fee = :publication_fee, status = :status,
                updated_at = :updated_at
            WHERE id = :id
        ");
        
        $stmt->execute([
            'id' => $data['id'],
            'title' => $data['title'],
            'abbreviation' => $data['abbreviation'],
            'issn' => $data['issn'],
            'e_issn' => $data['e_issn'],
            'description' => $data['description'],
            'field' => $data['field'],
            'publisher' => $data['publisher'],
            'submission_fee' => $data['submission_fee'],
            'publication_fee' => $data['publication_fee'],
            'status' => $data['status'],
            'updated_at' => date('c'),
        ]);
        
        return $this->findById($journal->getId());
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM journals WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    private function mapRowToEntity(array $row): Journal
    {
        return new Journal(
            (int)$row['id'],
            $row['title'],
            $row['abbreviation'],
            $row['issn'],
            $row['e_issn'],
            $row['description'],
            $row['field'],
            $row['publisher'],
            (float)($row['submission_fee'] ?? 0.0),
            (float)($row['publication_fee'] ?? 0.0),
            $row['status'],
            $row['created_by'] ? (int)$row['created_by'] : null,
            $row['ojs_id'],
            new DateTimeImmutable($row['created_at']),
            new DateTimeImmutable($row['updated_at'])
        );
    }
}
