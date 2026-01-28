<?php

namespace App\Presentation\Controllers;

trait JsonResponseTrait
{
    protected function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'data' => $data,
            'meta' => [
                'timestamp' => date('c')
            ]
        ]);
        exit;
    }

    protected function errorResponse(string $message, string $code = 'ERROR', int $statusCode = 400): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message
            ],
            'meta' => [
                'timestamp' => date('c')
            ]
        ]);
        exit;
    }
}
