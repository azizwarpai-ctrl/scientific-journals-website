<?php

namespace App\Application\Services;

use App\Domain\Entities\VerificationToken;
use App\Domain\Repositories\VerificationTokenRepositoryInterface;

class OTPService
{
    public function __construct(
        private VerificationTokenRepositoryInterface $tokenRepository
    ) {}

    public function generate(string $identifier): string
    {
        $otp = $this->generateSecureOTP();
        
        // DEBUG: Output OTP to logs for testing without email
        error_log("[DEBUG] OTP for {$identifier}: {$otp}");
        file_put_contents(__DIR__ . '/../../../../temp_otp.txt', $otp); // Write to backend root
        
        $token = VerificationToken::create($identifier, $otp);
        $this->tokenRepository->save($token);

        return $otp;
    }

    public function verify(string $identifier, string $otp): bool
    {
        $token = $this->tokenRepository->findByIdentifierAndToken($identifier, $otp);

        if (!$token) {
            return false;
        }

        if ($token->isExpired()) {
            $this->tokenRepository->delete($token->getId());
            return false;
        }

        // OTP is valid
        $this->tokenRepository->delete($token->getId()); // Consume/burn the token
        return true;
    }

    private function generateSecureOTP(int $length = 6): string
    {
        $otp = '';
        for ($i = 0; $i < $length; $i++) {
            $otp .= random_int(0, 9);
        }
        return $otp;
    }
}
