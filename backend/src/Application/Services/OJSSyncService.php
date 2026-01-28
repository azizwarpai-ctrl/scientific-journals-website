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
        // Sync journal metadata from OJS (if needed)
        // For now, journals are managed locally
        return 0;
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
