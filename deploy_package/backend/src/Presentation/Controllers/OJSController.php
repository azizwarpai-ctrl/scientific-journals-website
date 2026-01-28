<?php

namespace App\Presentation\Controllers;

use App\Domain\Repositories\SubmissionRepositoryInterface;

class OJSController
{
    use JsonResponseTrait;

    public function __construct(
        private SubmissionRepositoryInterface $submissionRepository
    ) {}

    public function listSubmissions(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $perPage = (int)($_GET['per_page'] ?? 20);
        $filters = [];
        
        if (isset($_GET['journal_id'])) $filters['journal_id'] = (int)$_GET['journal_id'];
        if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
        if (isset($_GET['author_email'])) $filters['author_email'] = $_GET['author_email'];

        try {
            $result = $this->submissionRepository->findAll($page, $perPage, $filters);
            
            // Add OJS URLs to each submission
            foreach ($result['data'] as &$submission) {
                if ($submission->getOjsSubmissionId()) {
                    $ojsBaseUrl = $_ENV['OJS_BASE_URL'] ?? 'https://submitmanger.com';
                    $submission->ojsUrl = "{$ojsBaseUrl}/index.php/journal/workflow/access/{$submission->getOjsSubmissionId()}";
                }
            }
            
            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'OJS_ERROR', 500);
        }
    }

    public function getSubmission(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        
        try {
            $submission = $this->submissionRepository->findById($id);
            
            if (!$submission) {
                $this->errorResponse('Submission not found', 'NOT_FOUND', 404);
                return;
            }
            
            // Add OJS URL
            if ($submission->getOjsSubmissionId()) {
                $ojsBaseUrl = $_ENV['OJS_BASE_URL'] ?? 'https://submitmanger.com';
                $ojsUrl = "{$ojsBaseUrl}/index.php/journal/workflow/access/{$submission->getOjsSubmissionId()}";
            } else {
                $ojsUrl = null;
            }
            
            $this->jsonResponse([
                'submission' => $submission->toArray(),
                'ojs_url' => $ojsUrl,
                'message' => 'Visit OJS to view files and manage this submission'
            ]);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'OJS_ERROR', 500);
        }
    }
}
