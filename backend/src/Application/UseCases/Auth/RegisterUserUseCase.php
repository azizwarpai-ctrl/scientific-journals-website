<?php

namespace App\Application\UseCases\Auth;

use App\Domain\Entities\AdminUser;
use App\Domain\Repositories\AdminUserRepositoryInterface;
use Exception;

class RegisterUserUseCase
{
    public function __construct(
        private AdminUserRepositoryInterface $adminUserRepository
    ) {}

    public function execute(string $email, string $fullName, string $password, string $role = 'admin'): AdminUser
    {
        // Check if user already exists
        $existing = $this->adminUserRepository->findByEmail($email);
        if ($existing) {
            throw new Exception('User with this email already exists', 409);
        }

        // Create new admin user
        $user = AdminUser::create($email, $fullName, $password, $role);

        // Save to database
        $savedUser = $this->adminUserRepository->save($user);

        return $savedUser;
    }
}
