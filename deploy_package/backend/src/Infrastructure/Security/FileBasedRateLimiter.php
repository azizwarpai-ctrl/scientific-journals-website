<?php

namespace App\Infrastructure\Security;

class FileBasedRateLimiter
{
    private string $storageDir;

    public function __construct()
    {
        $this->storageDir = __DIR__ . '/../../../storage/rate_limits/';
        
        if (!is_dir($this->storageDir)) {
            mkdir($this->storageDir, 0755, true);
        }
    }

    public function attempt(string $key, int $maxAttempts, int $decaySeconds): bool
    {
        if ($this->tooManyAttempts($key, $maxAttempts)) {
            return false;
        }

        $this->hit($key, $decaySeconds);
        return true;
    }

    public function tooManyAttempts(string $key, int $maxAttempts): bool
    {
        return $this->attempts($key) >= $maxAttempts;
    }

    public function attempts(string $key): int
    {
        $file = $this->getFilePath($key);
        
        if (!file_exists($file)) {
            return 0;
        }

        $data = json_decode(file_get_contents($file), true);
        
        // Check if expired
        if (isset($data['expires_at']) && time() > $data['expires_at']) {
            $this->clear($key);
            return 0;
        }

        return (int)($data['attempts'] ?? 0);
    }

    public function hit(string $key, int $decaySeconds): void
    {
        $file = $this->getFilePath($key);
        $attempts = $this->attempts($key) + 1;
        
        $data = [
            'attempts' => $attempts,
            'expires_at' => time() + $decaySeconds
        ];

        file_put_contents($file, json_encode($data));
    }

    public function clear(string $key): void
    {
        $file = $this->getFilePath($key);
        
        if (file_exists($file)) {
            unlink($file);
        }
    }

    public function availableIn(string $key): int
    {
        $file = $this->getFilePath($key);
        
        if (!file_exists($file)) {
            return 0;
        }

        $data = json_decode(file_get_contents($file), true);
        $expiresAt = $data['expires_at'] ?? time();
        
        return max(0, $expiresAt - time());
    }

    private function getFilePath(string $key): string
    {
        return $this->storageDir . sha1($key) . '.json';
    }

    public function resetAll(): void
    {
        $files = glob($this->storageDir . '*.json');
        foreach ($files as $file) {
            unlink($file);
        }
    }
}
