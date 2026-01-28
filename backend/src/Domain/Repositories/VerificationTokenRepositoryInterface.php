<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\VerificationToken;

interface VerificationTokenRepositoryInterface
{
    public function save(VerificationToken $token): void;
    public function findLatestByIdentifier(string $identifier): ?VerificationToken;
    public function findByIdentifierAndToken(string $identifier, string $token): ?VerificationToken;
    public function delete(int $id): void;
    public function deleteByIdentifier(string $identifier): void;
}
