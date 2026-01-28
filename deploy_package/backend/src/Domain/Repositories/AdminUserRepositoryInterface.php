<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\AdminUser;

interface AdminUserRepositoryInterface
{
    public function findByEmail(string $email): ?AdminUser;
    public function findById(int $id): ?AdminUser;
    public function save(AdminUser $user): AdminUser;
}
