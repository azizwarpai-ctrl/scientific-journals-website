<?php

namespace App\Presentation\DTOs\Request;

use InvalidArgumentException;

class RegisterRequest
{
    public string $email;
    public string $fullName;
    public string $password;
    public string $passwordConfirmation;
    public string $role;

    public function __construct(array $data)
    {
        $this->validate($data);
        
        $this->email = $data['email'];
        $this->fullName = $data['full_name'] ?? $data['fullName'] ?? '';
        $this->password = $data['password'];
        $this->passwordConfirmation = $data['password_confirmation'] ?? $data['passwordConfirmation'] ?? '';
        $this->role = $data['role'] ?? 'admin';
    }

    private function validate(array $data): void
    {
        // Email validation
        if (empty($data['email'])) {
            throw new InvalidArgumentException('Email is required');
        }
        
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Invalid email format');
        }

        // Full name validation
        $fullName = $data['full_name'] ?? $data['fullName'] ?? '';
        if (empty($fullName)) {
            throw new InvalidArgumentException('Full name is required');
        }

        // Password validation
        if (empty($data['password'])) {
            throw new InvalidArgumentException('Password is required');
        }

        if (strlen($data['password']) < 8) {
            throw new InvalidArgumentException('Password must be at least 8 characters');
        }

        // Password confirmation
        $confirmation = $data['password_confirmation'] ?? $data['passwordConfirmation'] ?? '';
        if ($data['password'] !== $confirmation) {
            throw new InvalidArgumentException('Password confirmation does not match');
        }

        // Password strength check
        if (!$this->isStrongPassword($data['password'])) {
            throw new InvalidArgumentException('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }
    }

    private function isStrongPassword(string $password): bool
    {
        // At least one uppercase, one lowercase, one number
        return preg_match('/[A-Z]/', $password) &&
               preg_match('/[a-z]/', $password) &&
               preg_match('/[0-9]/', $password);
    }
}
