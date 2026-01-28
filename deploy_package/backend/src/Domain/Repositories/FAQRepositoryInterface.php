<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\FAQ;

interface FAQRepositoryInterface
{
    public function findAll(int $page = 1, int $perPage = 20, bool $publishedOnly = false): array;
    public function findById(int $id): ?FAQ;
    public function save(FAQ $faq): FAQ;
    public function delete(int $id): bool;
}
