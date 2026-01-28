<?php

namespace App\Presentation\Controllers;

use App\Application\UseCases\Auth\LoginUseCase;
use App\Application\UseCases\Auth\VerifyOTPUseCase;
use App\Presentation\DTOs\Request\LoginRequest;
use App\Presentation\DTOs\Request\VerifyOTPRequest;
use Psr\Htt\Message\ResponseInterface; // Not strictly needed if returning void/json

class AuthController
{
    use JsonResponseTrait;

    public function __construct(
        private LoginUseCase $loginUseCase,
        private VerifyOTPUseCase $verifyOTPUseCase
    ) {}

    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $request = new LoginRequest($data);
            $result = $this->loginUseCase->execute($request->email, $request->password);
            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            // Prevent 0 as HTTP code
            if ($code < 100 || $code > 599) $code = 400;
            
            $this->errorResponse($e->getMessage(), 'AUTH_ERROR', (int)$code);
        }
    }

    public function verifyOTP(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $request = new VerifyOTPRequest($data);
            $result = $this->verifyOTPUseCase->execute($request->tempToken, $request->otp);
            
            // Set HttpOnly Cookie for added security (optional, but requested in analysis)
            setcookie('auth_token', $result['token'], [
                'expires' => time() + 604800,
                'path' => '/',
                'domain' => '', // Current domain
                'secure' => true, // Should be true in production
                'httponly' => true,
                'samesite' => 'Strict'
            ]);

            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;

            $this->errorResponse($e->getMessage(), 'OTP_ERROR', $code);
        }
    }
    
    public function me(): void {
        // User data is attached by AuthenticationMiddleware in $_REQUEST['user']
        $userData = $_REQUEST['user'] ?? null;
        
        if (!$userData) {
            $this->errorResponse('User not authenticated', 'UNAUTHORIZED', 401);
            return;
        }
        
        // Return user data from JWT payload
        $this->jsonResponse([
            'id' => $userData['sub'] ?? null,
            'email' => $userData['email'] ?? null,
            'fullName' => $userData['fullName'] ?? null,
            'role' => $userData['role'] ?? null,
        ]);
    }
    
    public function register(): void {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $request = new \App\Presentation\DTOs\Request\RegisterRequest($data);
            
            /** @var \App\Application\UseCases\Auth\RegisterUserUseCase $useCase */
            $useCase = $this->container->get(\App\Application\UseCases\Auth\RegisterUserUseCase::class);
            
            $user = $useCase->execute(
                $request->email,
                $request->fullName,
                $request->password,
                $request->role
            );
            
            $this->jsonResponse([
                'user' => [
                    'id' => $user->getId(),
                    'email' => $user->getEmail(),
                    'fullName' => $user->getFullName(),
                    'role' => $user->getRole()
                ],
                'message' => 'Registration successful. You can now login.'
            ], 201);
            
        } catch (\InvalidArgumentException $e) {
            $this->errorResponse($e->getMessage(), 'VALIDATION_ERROR', 400);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            $this->errorResponse($e->getMessage(), 'REGISTRATION_ERROR', (int)$code);
        }
    }
    
    public function resendOTP(): void {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $request = new \App\Presentation\DTOs\Request\ResendOTPRequest($data);
            
            /** @var \App\Application\UseCases\Auth\ResendOTPUseCase $useCase */
            $useCase = $this->container->get(\App\Application\UseCases\Auth\ResendOTPUseCase::class);
            
            $result = $useCase->execute($request->tempToken);
            
            $this->jsonResponse($result);
            
        } catch (\InvalidArgumentException $e) {
            $this->errorResponse($e->getMessage(), 'VALIDATION_ERROR', 400);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            if ($code < 100 || $code > 599) $code = 400;
            $this->errorResponse($e->getMessage(), 'RESEND_OTP_ERROR', (int)$code);
        }
    }

    public function logout(): void {
        setcookie('auth_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
             'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        $this->jsonResponse(['message' => 'Logged out successfully']);
    }
}
