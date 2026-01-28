<?php

namespace App\Domain\Entities;

use DateTimeImmutable;

class Journal
{
    private ?int $id;
    private string $title;
    private ?string $abbreviation;
    private ?string $issn;
    private ?string $eIssn;
    private ?string $description;
    private string $field;
    private ?string $publisher;
    private ?float $submissionFee;
    private ?float $publicationFee;
    private string $status;
    private ?int $createdBy;
    private ?string $ojsId;
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $updatedAt;

    public function __construct(
        ?int $id,
        string $title,
        ?string $abbreviation,
        ?string $issn,
        ?string $eIssn,
        ?string $description,
        string $field,
        ?string $publisher,
        ?float $submissionFee,
        ?float $publicationFee,
        string $status,
        ?int $createdBy,
        ?string $ojsId,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt
    ) {
        $this->id = $id;
        $this->title = $title;
        $this->abbreviation = $abbreviation;
        $this->issn = $issn;
        $this->eIssn = $eIssn;
        $this->description = $description;
        $this->field = $field;
        $this->publisher = $publisher;
        $this->submissionFee = $submissionFee;
        $this->publicationFee = $publicationFee;
        $this->status = $status;
        $this->createdBy = $createdBy;
        $this->ojsId = $ojsId;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public static function create(
        string $title,
        ?string $abbreviation,
        ?string $issn,
        string $field,
        ?int $createdBy = null
    ): self {
        $now = new DateTimeImmutable();
        return new self(
            null,
            $title,
            $abbreviation,
            $issn,
            null, // eIssn
            null, // description
            $field,
            null, // publisher
            0.0, // submissionFee
            0.0, // publicationFee
            'active',
            $createdBy,
            null, // ojsId
            $now,
            $now
        );
    }
    
    // Getters and Setters can be added as needed
    public function getId(): ?int { return $this->id; }
    public function getTitle(): string { return $this->title; }
    public function getAbbreviation(): ?string { return $this->abbreviation; }
    public function getIssn(): ?string { return $this->issn; }
    public function getEIssn(): ?string { return $this->eIssn; }
    public function getDescription(): ?string { return $this->description; }
    public function getField(): string { return $this->field; }
    public function getPublisher(): ?string { return $this->publisher; }
    public function getSubmissionFee(): ?float { return $this->submissionFee; }
    public function getPublicationFee(): ?float { return $this->publicationFee; }
    public function getStatus(): string { return $this->status; }
    public function getCreatedBy(): ?int { return $this->createdBy; }
    public function getOjsId(): ?string { return $this->ojsId; }
    
    public function toArray(): array {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'abbreviation' => $this->abbreviation,
            'issn' => $this->issn,
            'e_issn' => $this->eIssn,
            'description' => $this->description,
            'field' => $this->field,
            'publisher' => $this->publisher,
            'submission_fee' => $this->submissionFee,
            'publication_fee' => $this->publicationFee,
            'status' => $this->status,
            'created_by' => $this->createdBy,
            'ojs_id' => $this->ojsId,
            'created_at' => $this->createdAt->format('c'),
            'updated_at' => $this->updatedAt->format('c'),
        ];
    }
}
