<?php

namespace App\Application\UseCases\Auth;

use App\Application\Services\OTPService;
use App\Domain\Repositories\AdminUserRepositoryInterface;
use App\Infrastructure\Security\JWTService;
use Exception;

class VerifyOTPUseCase
{
    public function __construct(
        private AdminUserRepositoryInterface $userRepository,
        private OTPService $otpService,
        private JWTService $jwtService
    ) {}

    public function execute(string $tempToken, string $otp): array
    {
        // 1. Verify JWT validity
        $decoded = $this->jwtService->decode($tempToken);
        
        if (!$decoded || ($decoded->type ?? '') !== 'temp_2fa') {
            throw new Exception('Invalid or expired temporary token.', 401);
        }

        $userId = $decoded->sub ?? null;
        $email = $decoded->email ?? null;

        if (!$userId || !$email) {
             throw new Exception('Invalid token payload.', 401);
        }

        // 2. Verify OTP
        $isValid = $this->otpService->verify($email, $otp);
        if (!$isValid) {
            throw new Exception('Invalid or expired OTP.', 401);
        }

        // 3. Retrieve User
        $user = $this->userRepository->findById($userId);
        if (!$user) {
            throw new Exception('User not found.', 404);
        }

        // 4. Create Session Token
        $sessionToken = $this->jwtService->createSessionToken($user);

        return [
            'success' => true,
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'fullName' => $user->getFullName(),
                'role' => $user->getRole()
            ],
            'token' => $sessionToken,
            'expiresIn' => 604800 // 7 days
        ];
    }
}
