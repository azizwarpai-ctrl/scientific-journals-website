<?php

namespace App\Infrastructure\Logger;

class FileLogger
{
    private string $logFile;

    public function __construct(string $logFile)
    {
        $this->logFile = $logFile;
        // Ensure directory exists
        $dir = dirname($logFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
    }

    public function info(string $message, array $context = []): void
    {
        $this->log('INFO', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('ERROR', $message, $context);
    }

    private function log(string $level, string $message, array $context): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $contextString = !empty($context) ? json_encode($context) : '';
        $entry = "[$timestamp] $level: $message $contextString" . PHP_EOL;
        
        file_put_contents($this->logFile, $entry, FILE_APPEND);
    }
}
