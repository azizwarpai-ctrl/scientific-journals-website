<?php

namespace App\Presentation\DTOs\Request;

use InvalidArgumentException;

class VerifyOTPRequest
{
    public string $tempToken;
    public string $otp;

    public function __construct(array $data)
    {
        if (empty($data['tempToken']) || empty($data['otp'])) {
            throw new InvalidArgumentException('Temporary token and OTP are required.');
        }

        $this->tempToken = $data['tempToken'];
        $this->otp = $data['otp'];
    }
}
