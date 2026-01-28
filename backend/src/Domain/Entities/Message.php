<?php

namespace App\Domain\Entities;

use DateTimeImmutable;

class Message
{
    private function __construct(
        private ?int $id,
        private string $name,
        private string $email,
        private string $subject,
        private string $message,
        private string $status,
        private DateTimeImmutable $createdAt,
        private ?DateTimeImmutable $respondedAt
    ) {}

    public static function create(
        string $name,
        string $email,
        string $subject,
        string $message
    ): self {
        return new self(
            null,
            $name,
            $email,
            $subject,
            $message,
            'unread',
            new DateTimeImmutable(),
            null
        );
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function getEmail(): string { return $this->email; }
    public function getSubject(): string { return $this->subject; }
    public function getMessage(): string { return $this->message; }
    public function getStatus(): string { return $this->status; }
    public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }
    public function getRespondedAt(): ?DateTimeImmutable { return $this->respondedAt; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'subject' => $this->subject,
            'message' => $this->message,
            'status' => $this->status,
            'createdAt' => $this->createdAt->format('Y-m-d H:i:s'),
            'respondedAt' => $this->respondedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
