<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\Message;

interface MessageRepositoryInterface
{
    public function findAll(int $page = 1, int $perPage = 20): array;
    public function findById(int $id): ?Message;
    public function save(Message $message): Message;
}
