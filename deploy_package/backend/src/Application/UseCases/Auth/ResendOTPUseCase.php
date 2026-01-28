<?php

namespace App\Application\UseCases\Auth;

use App\Infrastructure\Security\JWTService;
use App\Application\Services\OTPService;
use App\Infrastructure\Email\EmailServiceInterface;
use App\Domain\Repositories\AdminUserRepositoryInterface;
use Exception;

class ResendOTPUseCase
{
    public function __construct(
        private JWTService $jwtService,
        private OTPService $otpService,
        private EmailServiceInterface $emailService,
        private AdminUserRepositoryInterface $adminUserRepository
    ) {}

    public function execute(string $tempToken): array
    {
        // Verify temporary token
        $payload = $this->jwtService->verifyTemporaryToken($tempToken);
        
        if (!$payload) {
            throw new Exception('Invalid or expired temporary token', 401);
        }

        // Get user
        $userId = $payload['sub'] ?? null;
        $email = $payload['email'] ?? null;

        if (!$userId || !$email) {
            throw new Exception('Invalid token payload', 401);
        }

        // Verify user still exists
        $user = $this->adminUserRepository->findById($userId);
        if (!$user) {
            throw new Exception('User not found', 404);
        }

        // Generate new OTP (this will delete old ones)
        $otp = $this->otpService->generate($email);

        // Send new OTP email
        $sent = $this->emailService->send(
            $email,
            'Your New Verification Code',
            "Your new verification code is: {$otp}\n\nThis code will expire in 15 minutes."
        );

        if (!$sent) {
            throw new Exception('Failed to send verification email', 500);
        }

        return [
            'message' => 'New verification code sent to your email',
            'email' => $email
        ];
    }
}
