<?php

namespace App\Application\UseCases\Journal;

use App\Domain\Repositories\JournalRepositoryInterface;
use Exception;

class GetJournalUseCase
{
    public function __construct(
        private JournalRepositoryInterface $repository
    ) {}

    public function execute(int $id): ?\App\Domain\Entities\Journal
    {
        $journal = $this->repository->findById($id);
        
        if (!$journal) {
            throw new Exception("Journal with ID $id not found", 404);
        }

        return $journal;
    }
}
