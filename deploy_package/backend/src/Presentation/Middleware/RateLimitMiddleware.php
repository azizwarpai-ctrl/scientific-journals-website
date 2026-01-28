<?php

namespace App\Presentation\Middleware;

use App\Infrastructure\Security\FileBasedRateLimiter;

class RateLimitMiddleware
{
    private FileBasedRateLimiter $limiter;
    private int $maxAttempts;
    private int $decaySeconds;

    public function __construct(int $maxAttempts = 60, int $decaySeconds = 60)
    {
        $this->limiter = new FileBasedRateLimiter();
        $this->maxAttempts = $maxAttempts;
        $this->decaySeconds = $decaySeconds;
    }

    public function handle(string $identifier): bool
    {
        $key = $this->resolveRequestSignature($identifier);

        if ($this->limiter->tooManyAttempts($key, $this->maxAttempts)) {
            $this->sendRateLimitResponse($key);
            return false;
        }

        $this->limiter->hit($key, $this->decaySeconds);
        return true;
    }

    private function resolveRequestSignature(string $identifier): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        return "{$identifier}:{$ip}";
    }

    private function sendRateLimitResponse(string $key): void
    {
        $retryAfter = $this->limiter->availableIn($key);
        
        header('Content-Type: application/json');
        header('Retry-After: ' . $retryAfter);
        http_response_code(429);
        
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => 'RATE_LIMIT_EXCEEDED',
                'message' => 'Too many attempts. Please try again later.',
                'retry_after' => $retryAfter
            ],
            'meta' => [
                'timestamp' => date('Y-m-d\TH:i:sP')
            ]
        ]);
        
        exit;
    }
}
