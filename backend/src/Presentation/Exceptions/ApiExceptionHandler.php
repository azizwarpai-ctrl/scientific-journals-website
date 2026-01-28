<?php

namespace App\Presentation\Exceptions;

use Psr\Http\Message\ResponseInterface;
use Throwable;

class ApiExceptionHandler
{
    public function __invoke(Throwable $exception): void
    {
        $statusCode = 500;
        $errorCode = 'INTERNAL_SERVER_ERROR';
        $message = 'An unexpected error occurred.';

        // Handle specific exceptions here
        if ($exception instanceof \InvalidArgumentException) {
            $statusCode = 400;
            $errorCode = 'VALIDATION_ERROR';
            $message = $exception->getMessage();
        }

        // Log the error
        error_log($exception->getMessage());
        error_log($exception->getTraceAsString());

        if (php_sapi_name() !== 'cli') {
            http_response_code($statusCode);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => [
                    'code' => $errorCode,
                    'message' => $message,
                    // In debug mode, show actual error
                     'debug' => ($_ENV['APP_DEBUG'] ?? 'false') === 'true' ? $exception->getMessage() : null
                ]
            ]);
        }
    }
}
