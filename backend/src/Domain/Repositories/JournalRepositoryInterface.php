<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\Journal;

interface JournalRepositoryInterface
{
    public function findAll(int $page = 1, int $perPage = 20, array $filters = []): array;
    public function findById(int $id): ?Journal;
    public function save(Journal $journal): Journal;
    public function delete(int $id): bool;
}
