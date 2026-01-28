<?php

namespace App\Domain\Entities;

use DateTimeImmutable;

class VerificationToken
{
    private ?int $id;
    private string $identifier;
    private string $token;
    private DateTimeImmutable $expires;
    private DateTimeImmutable $createdAt;

    public function __construct(
        ?int $id,
        string $identifier,
        string $token,
        DateTimeImmutable $expires,
        DateTimeImmutable $createdAt
    ) {
        $this->id = $id;
        $this->identifier = $identifier;
        $this->token = $token;
        $this->expires = $expires;
        $this->createdAt = $createdAt;
    }

    public static function create(string $identifier, string $token, int $expiresInMinutes = 10): self
    {
        $now = new DateTimeImmutable();
        return new self(
            null,
            $identifier,
            $token,
            $now->modify("+$expiresInMinutes minutes"),
            $now
        );
    }

    public function isExpired(): bool
    {
        return new DateTimeImmutable() > $this->expires;
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getIdentifier(): string { return $this->identifier; }
    public function getToken(): string { return $this->token; }
    public function getExpires(): DateTimeImmutable { return $this->expires; }
}
