<?php

namespace App\Application\UseCases\Journal;

use App\Domain\Repositories\JournalRepositoryInterface;

class ListJournalsUseCase
{
    public function __construct(
        private JournalRepositoryInterface $repository
    ) {}

    public function execute(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        return $this->repository->findAll($page, $perPage, $filters);
    }
}
