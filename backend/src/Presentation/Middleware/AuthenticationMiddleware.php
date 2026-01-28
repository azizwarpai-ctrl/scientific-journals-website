<?php

namespace App\Presentation\Middleware;

use App\Infrastructure\Security\JWTService;

class AuthenticationMiddleware
{
    public function __construct(
        private JWTService $jwtService
    ) {}

    public function handle(): void
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? '';
        
        // Also check cookie
        $cookieToken = $_COOKIE['auth_token'] ?? null;

        $token = null;
        if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        } elseif ($cookieToken) {
            $token = $cookieToken;
        }

        if (!$token) {
            $this->unauthorized('Missing authentication token');
        }

        try {
            $payload = $this->jwtService->decode($token);
            if (!$payload) {
                $this->unauthorized('Invalid token');
            }

            // Verify it's a session token and not a temp token or other
            if (($payload->type ?? '') !== 'session') {
                $this->unauthorized('Invalid token type');
            }

            // Attach user info to global request or container (simplified for this structure)
            // In a real framework, we'd modify the Request object. 
            // Here, we'll assume the controller can fetch it if needed, or we store it in $_REQUEST for now.
            $_REQUEST['user'] = (array)$payload;

        } catch (\Exception $e) {
            $this->unauthorized('Authentication failed: ' . $e->getMessage());
        }
    }

    private function unauthorized(string $message): void
    {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized', 'message' => $message]);
        exit;
    }
}
