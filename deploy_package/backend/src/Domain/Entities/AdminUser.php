<?php

namespace App\Domain\Entities;

use DateTimeImmutable;
use InvalidArgumentException;

class AdminUser
{
    private ?int $id;
    private string $email;
    private string $fullName;
    private string $role;
    private string $passwordHash;
    private bool $twoFactorEnabled;
    private ?string $twoFactorSecret; // In this system we use email OTP, but keeping structure compatible
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $updatedAt;

    public function __construct(
        ?int $id,
        string $email,
        string $fullName,
        string $role,
        string $passwordHash,
        bool $twoFactorEnabled,
        ?string $twoFactorSecret,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt
    ) {
        $this->id = $id;
        $this->setEmail($email);
        $this->fullName = $fullName;
        $this->role = $role;
        $this->passwordHash = $passwordHash;
        $this->twoFactorEnabled = $twoFactorEnabled;
        $this->twoFactorSecret = $twoFactorSecret;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public static function create(string $email, string $fullName, string $plainPassword, string $role = 'admin'): self
    {
        return new self(
            null,
            $email,
            $fullName,
            $role,
            password_hash($plainPassword, PASSWORD_BCRYPT),
            true, // Mandatory 2FA
            null,
            new DateTimeImmutable(),
            new DateTimeImmutable()
        );
    }

    private function setEmail(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("Invalid email address: $email");
        }
        $this->email = $email;
    }

    public function verifyPassword(string $plainPassword): bool
    {
        return password_verify($plainPassword, $this->passwordHash);
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getEmail(): string { return $this->email; }
    public function getFullName(): string { return $this->fullName; }
    public function getRole(): string { return $this->role; }
    public function isTwoFactorEnabled(): bool { return $this->twoFactorEnabled; }
    
    // Setters if needed (e.g. for update profile)
}
