<?php

namespace App\Domain\Entities;

use DateTimeImmutable;

class FAQ
{
    private function __construct(
        private ?int $id,
        private string $question,
        private string $answer,
        private ?string $category,
        private int $priority,
        private bool $isPublished,
        private DateTimeImmutable $createdAt,
        private DateTimeImmutable $updatedAt
    ) {}

    public static function create(
        string $question,
        string $answer,
        ?string $category = null,
        int $priority = 0,
        bool $isPublished = true
    ): self {
        return new self(
            null,
            $question,
            $answer,
            $category,
            $priority,
            $isPublished,
            new DateTimeImmutable(),
            new DateTimeImmutable()
        );
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getQuestion(): string { return $this->question; }
    public function getAnswer(): string { return $this->answer; }
    public function getCategory(): ?string { return $this->category; }
    public function getPriority(): int { return $this->priority; }
    public function isPublished(): bool { return $this->isPublished; }
    public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): DateTimeImmutable { return $this->updatedAt; }

    // Methods
    public function update(
        string $question,
        string $answer,
        ?string $category,
        int $priority,
        bool $isPublished
    ): void {
        $this->question = $question;
        $this->answer = $answer;
        $this->category = $category;
        $this->priority = $priority;
        $this->isPublished = $isPublished;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'category' => $this->category,
            'priority' => $this->priority,
            'isPublished' => $this->isPublished,
            'createdAt' => $this->createdAt->format('Y-m-d H:i:s'),
            'updatedAt' => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}
