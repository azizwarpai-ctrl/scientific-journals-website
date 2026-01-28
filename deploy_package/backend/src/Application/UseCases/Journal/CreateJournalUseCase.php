<?php

namespace App\Application\UseCases\Journal;

use App\Domain\Entities\Journal;
use App\Domain\Repositories\JournalRepositoryInterface;

class CreateJournalUseCase
{
    public function __construct(
        private JournalRepositoryInterface $repository
    ) {}

    public function execute(array $data): Journal
    {
        // Add business logic/validation here if needed
        $journal = Journal::create(
            $data['title'],
            $data['abbreviation'] ?? null,
            $data['issn'] ?? null,
            $data['field'],
            $data['created_by'] ?? null
        );

        return $this->repository->save($journal);
    }
}
