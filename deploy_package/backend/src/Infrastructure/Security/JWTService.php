<?php

namespace App\Infrastructure\Security;

use App\Domain\Entities\AdminUser;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use DateTimeImmutable;

class JWTService
{
    private string $secret;
    private string $algo = 'HS256';

    public function __construct()
    {
        $this->secret = $_ENV['JWT_SECRET'] ?? 'default-secret-unsafe';
        $this->algo = $_ENV['JWT_ALGO'] ?? 'HS256';
    }

    public function createTemporaryToken(AdminUser $user): string
    {
        $payload = [
            'iss' => $_ENV['APP_URL'] ?? 'http://localhost',
            'sub' => $user->getId(),
            'email' => $user->getEmail(),
            'type' => 'temp_2fa',
            'iat' => time(),
            'exp' => time() + (15 * 60) // 15 minutes
        ];

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    public function createSessionToken(AdminUser $user): string
    {
        $payload = [
            'iss' => $_ENV['APP_URL'] ?? 'http://localhost',
            'sub' => $user->getId(),
            'email' => $user->getEmail(),
            'role' => $user->getRole(),
            'type' => 'session',
            'iat' => time(),
            'exp' => time() + (7 * 24 * 60 * 60) // 7 days
        ];

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    public function decode(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algo));
        } catch (\Exception $e) {
            return null;
        }
    }
}
