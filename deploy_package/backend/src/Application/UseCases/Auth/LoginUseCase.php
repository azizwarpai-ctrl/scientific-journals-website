<?php

namespace App\Application\UseCases\Auth;

use App\Application\Services\EmailService;
use App\Application\Services\OTPService;
use App\Domain\Repositories\AdminUserRepositoryInterface;
use App\Infrastructure\Security\JWTService;
use Exception;

class LoginUseCase
{
    public function __construct(
        private AdminUserRepositoryInterface $userRepository,
        private OTPService $otpService,
        private EmailService $emailService,
        private JWTService $jwtService
    ) {}

    public function execute(string $email, string $password): array
    {
        $user = $this->userRepository->findByEmail($email);

        if (!$user || !$user->verifyPassword($password)) {
            throw new Exception('Invalid email or password', 401);
        }

        // Generate OTP
        $otp = $this->otpService->generate($email);

        // Send Email
        $sent = $this->emailService->send(
            $email,
            'Your Verification Code',
            "Your verification code is: <strong>$otp</strong>. It expires in 10 minutes."
        );

        if (!$sent) {
            throw new Exception('Failed to send verification email.', 500);
        }

        // Create Temporary Token
        $tempToken = $this->jwtService->createTemporaryToken($user);

        return [
            'twoFactorRequired' => true,
            'tempToken' => $tempToken,
            'message' => 'Verification code sent to your email'
        ];
    }
}
