<?php

namespace App\Application\Services;

use App\Infrastructure\Database\OJSConnection;
use PDO;
use Exception;

class OJSSyncService
{
    private PDO $localPdo;
    private PDO $ojsPdo;
    
    // OJS 3.x status constants
    private const OJS_STATUS_QUEUED = 1;
    private const OJS_STATUS_REVIEW = 3;
    private const OJS_STATUS_ACCEPTED = 4;
    private const OJS_STATUS_PUBLISHED = 5;
    
    public function __construct(
        PDO $localPdo,
        OJSConnection $ojsConnection
    ) {
        $this->localPdo = $localPdo;
        $this->ojsPdo = $ojsConnection->getConnection();
    }

    public function syncAll(): array
    {
        $results = [
            'journals' => $this->syncJournals(),
            'submissions' => $this->syncSubmissions(),
            'reviews' => $this->syncReviews(),
            'articles' => $this->syncPublishedArticles(),
        ];
        
        // Update last sync timestamp
        $this->updateLastSyncTime();
        
        return $results;
    }

    public function syncJournals(): int
    {
        $count = 0;
        
        try {
            // Fetch journals from OJS with their settings (EAV pattern)
            $stmt = $this->ojsPdo->prepare("
                SELECT j.journal_id, j.path,
                       MAX(CASE WHEN s.setting_name = 'name' THEN s.setting_value END) as title,
                       MAX(CASE WHEN s.setting_name = 'description' THEN s.setting_value END) as description,
                       MAX(CASE WHEN s.setting_name = 'printIssn' THEN s.setting_value END) as issn,
                       MAX(CASE WHEN s.setting_name = 'onlineIssn' THEN s.setting_value END) as e_issn,
                       MAX(CASE WHEN s.setting_name = 'abbreviation' THEN s.setting_value END) as abbreviation,
                       MAX(CASE WHEN s.setting_name = 'publisherInstitution' THEN s.setting_value END) as publisher
                FROM journals j
                LEFT JOIN journal_settings s ON j.journal_id = s.journal_id
                WHERE s.locale = 'en_US' OR s.locale IS NULL
                GROUP BY j.journal_id
            ");
            
            $stmt->execute();
            
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->upsertJournal($row);
                $count++;
            }
            
        } catch (Exception $e) {
            error_log("[OJS SYNC ERROR] Journals: " . $e->getMessage());
        }
        
        return $count;
    }

    private function upsertJournal(array $ojsData): void
    {
        // Check if journal exists by OJS ID
        $stmt = $this->localPdo->prepare("SELECT id FROM journals WHERE ojs_id = :ojs_id");
        $stmt->execute(['ojs_id' => $ojsData['journal_id']]);
        $existing = $stmt->fetch();
        
        $title = $ojsData['title'] ?: 'Untitled Journal';
        $desc = $ojsData['description'];
        $issn = $ojsData['issn'];
        $eIssn = $ojsData['e_issn'];
        $abbr = $ojsData['abbreviation'];
        $publisher = $ojsData['publisher'];
        
        if ($existing) {
            // Update existing journal
            $updateStmt = $this->localPdo->prepare("
                UPDATE journals 
                SET title = :title, 
                    description = :description,
                    issn = :issn,
                    e_issn = :e_issn,
                    abbreviation = :abbreviation,
                    publisher = :publisher,
                    updated_at = NOW()
                WHERE id = :id
            ");
            
            $updateStmt->execute([
                'title' => $title,
                'description' => $desc,
                'issn' => $issn,
                'e_issn' => $eIssn,
                'abbreviation' => $abbr,
                'publisher' => $publisher,
                'id' => $existing['id']
            ]);
        } else {
            // Insert new journal
            $insertStmt = $this->localPdo->prepare("
                INSERT INTO journals 
                (title, description, issn, e_issn, abbreviation, publisher, ojs_id, field, status, created_at, updated_at)
                VALUES 
                (:title, :description, :issn, :e_issn, :abbreviation, :publisher, :ojs_id, :field, 'active', NOW(), NOW())
            ");
            
            $insertStmt->execute([
                'title' => $title,
                'description' => $desc,
                'issn' => $issn,
                'e_issn' => $eIssn,
                'abbreviation' => $abbr,
                'publisher' => $publisher,
                'ojs_id' => $ojsData['journal_id'],
                'field' => 'General Science' // Default field
            ]);
        }
    }

    public function syncSubmissions(): int
    {
        $count = 0;
        
        try {
            // Get last sync time
            $lastSync = $this->getLastSyncTime();
            
            // Query OJS database for submissions
            // Note: This is simplified - actual OJS schema is more complex
            $stmt = $this->ojsPdo->prepare("
                SELECT 
                    s.submission_id,
                    s.context_id,
                    s.date_submitted,
                    s.status,
                    s.last_modified
                FROM submissions s
                WHERE s.last_modified > :last_sync
                ORDER BY s.submission_id
            ");
            
            $stmt->execute(['last_sync' => date('Y-m-d H:i:s', $lastSync)]);
            
            while ($row = $stmt->fetch()) {
                $this->upsertSubmission($row);
                $count++;
            }
            
        } catch (Exception $e) {
            error_log("[OJS SYNC ERROR] Submissions: " . $e->getMessage());
        }
        
        return $count;
    }

    public function syncReviews(): int
    {
        // Sync review data
        // Simplified for now
        return 0;
    }

    public function syncPublishedArticles(): int
    {
        // Sync published articles metadata
        // Simplified for now
        return 0;
    }

    private function upsertSubmission(array $ojsData): void
    {
        // Map OJS data to local schema
        $localStatus = $this->mapOJSStatus($ojsData['status']);
        
        // Check if already exists
        $stmt = $this->localPdo->prepare("
            SELECT id FROM submissions WHERE ojs_submission_id = :ojs_id
        ");
        $stmt->execute(['ojs_id' => $ojsData['submission_id']]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Update
            $stmt = $this->localPdo->prepare("
                UPDATE submissions 
                SET status = :status, 
                    last_updated = :last_updated
                WHERE ojs_submission_id = :ojs_id
            ");
            
            $stmt->execute([
                'status' => $localStatus,
                'last_updated' => $ojsData['last_modified'],
                'ojs_id' => $ojsData['submission_id']
            ]);
        }
        // Note: INSERT would require full submission metadata from OJS
        // which involves joining multiple OJS tables
    }

    private function mapOJSStatus(int $ojsStatus): string
    {
        return match($ojsStatus) {
            self::OJS_STATUS_QUEUED => 'submitted',
            self::OJS_STATUS_REVIEW => 'under_review',
            self::OJS_STATUS_ACCEPTED => 'accepted',
            self::OJS_STATUS_PUBLISHED => 'published',
            default => 'submitted'
        };
    }

    private function getLastSyncTime(): int
    {
        $file = __DIR__ . '/../../../storage/last_ojs_sync.txt';
        
        if (file_exists($file)) {
            return (int)file_get_contents($file);
        }
        
        // Default: 30 days ago
        return strtotime('-30 days');
    }

    private function updateLastSyncTime(): void
    {
        $file = __DIR__ . '/../../../storage/last_ojs_sync.txt';
        $dir = dirname($file);
        
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        file_put_contents($file, time());
    }
}
