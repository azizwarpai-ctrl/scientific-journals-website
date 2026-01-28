<?php

namespace App\Application\Services;

interface EmailService
{
    public function send(string $to, string $subject, string $body, bool $isHtml = true): bool;
}
