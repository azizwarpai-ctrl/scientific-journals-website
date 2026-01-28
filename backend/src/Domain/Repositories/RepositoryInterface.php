<?php

namespace App\Domain\Repositories;

interface RepositoryInterface
{
    public function findAll(int $page = 1, int $perPage = 20, array $filters = []): array;
    public function findById(int $id): ?object;
    public function create(object $entity): object;
    public function update(object $entity): object;
    public function delete(int $id): bool;
}
