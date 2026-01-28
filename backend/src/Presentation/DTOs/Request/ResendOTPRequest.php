<?php

namespace App\Presentation\DTOs\Request;

use InvalidArgumentException;

class ResendOTPRequest
{
    public string $tempToken;

    public function __construct(array $data)
    {
        if (empty($data['tempToken'])) {
            throw new InvalidArgumentException('Temporary token is required');
        }

        $this->tempToken = $data['tempToken'];
    }
}
