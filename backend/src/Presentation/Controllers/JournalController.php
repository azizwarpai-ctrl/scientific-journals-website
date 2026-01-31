<?php

namespace App\Presentation\Controllers;

use App\Application\UseCases\Journal\CreateJournalUseCase;
use App\Application\UseCases\Journal\ListJournalsUseCase;
use App\Application\UseCases\Journal\GetJournalUseCase;

class JournalController
{
    use JsonResponseTrait;

    public function __construct(
        private CreateJournalUseCase $createUseCase,
        private ListJournalsUseCase $listUseCase,
        private GetJournalUseCase $getUseCase
    ) {}

    public function index(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $perPage = (int)($_GET['per_page'] ?? 20);
        $filters = [];
        if (isset($_GET['status'])) $filters['status'] = $_GET['status'];

        try {
            $result = $this->listUseCase->execute($page, $perPage, $filters);
            // Convert Journal entities to arrays for JSON response
            if (isset($result['data']) && is_array($result['data'])) {
                $result['data'] = array_map(fn ($j) => method_exists($j, 'toArray') ? $j->toArray() : (array) $j, $result['data']);
            }
            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage());
        }
    }

    public function show(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        
        try {
            $journal = $this->getUseCase->execute($id);
            $this->jsonResponse($journal->toArray());
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'NOT_FOUND', 404);
        }
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Basic validation could happen here or in Request DTO
        if (empty($data['title']) || empty($data['field'])) {
            $this->errorResponse("Title and Field are required.", 'VALIDATION_ERROR', 400);
            return;
        }

        try {
            // Get current user from middleware injection (simulated)
            // $userId = $_REQUEST['user']['sub'] ?? null;
            // $data['created_by'] = $userId;

            $journal = $this->createUseCase->execute($data);
            $this->jsonResponse($journal->toArray(), 201);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'CREATE_ERROR', 500);
        }
    }
}
