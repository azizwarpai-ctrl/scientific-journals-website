<?php

namespace App\Presentation\DTOs\Request;

use InvalidArgumentException;

class LoginRequest
{
    public string $email;
    public string $password;

    public function __construct(array $data)
    {
        if (empty($data['email']) || empty($data['password'])) {
            throw new InvalidArgumentException('Email and password are required.');
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Invalid email format.');
        }

        $this->email = $data['email'];
        $this->password = $data['password'];
    }
}
