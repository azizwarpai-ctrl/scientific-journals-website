<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

// Bootstrap the application
$container = require __DIR__ . '/../src/bootstrap.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Basic Router (Temporary for Phase 1 verification)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://digitopub.com', // Production
];

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *'); // Development fallback
}

if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // 24 hours
    exit(0);
}

// Set CORS headers for all requests
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Expose-Headers: Set-Cookie');

// Simple health check route
if ($uri === '/api/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'timestamp' => time()]);
    exit;
}

// Routing with Middleware Support
$routes = [
    'POST' => [
        '/api/auth/login' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'login',
            'middleware' => []
        ],
        '/api/auth/verify-2fa' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'verifyOTP',
            'middleware' => []
        ],
        '/api/auth/register' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'register',
            'middleware' => [],
            'rate_limit' => ['identifier' => 'register', 'max' => 3,  'decay' => 3600] // 3 per hour
        ],
        '/api/auth/resend-otp' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'resendOTP',
            'middleware' => [],
            'rate_limit' => ['identifier' => 'resend-otp', 'max' => 3, 'decay' => 300] // 3 per 5 min
        ],
        '/api/auth/logout' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'logout',
            'middleware' => []
        ],
        // Journal Routes
        '/api/journals' => [
            'controller' => \App\Presentation\Controllers\JournalController::class,
            'action' => 'store',
            'middleware' => [\App\Presentation\Middleware\AuthenticationMiddleware::class] // Protected
        ],
        // FAQ Routes
        '/api/faq' => [
            'controller' => \App\Presentation\Controllers\FAQController::class,
            'action' => 'store',
            'middleware' => [\App\Presentation\Middleware\AuthenticationMiddleware::class] // Protected
        ],
        // Messages Routes
        '/api/messages' => [
            'controller' => \App\Presentation\Controllers\MessageController::class,
            'action' => 'store',
            'middleware' => [] // Public
        ],
    ],
    'GET' => [
        '/api/auth/me' => [
            'controller' => \App\Presentation\Controllers\AuthController::class,
            'action' => 'me',
            'middleware' => [\App\Presentation\Middleware\AuthenticationMiddleware::class]
        ],
        // Journal Routes
        '/api/journals' => [
            'controller' => \App\Presentation\Controllers\JournalController::class,
            'action' => 'index',
            'middleware' => [] // Public list? Or protected? Analysis said public pages exist. Assuming public read, private write.
        ],
        '/api/journals/show' => [ // Using query param /api/journals?id=1 often standard in simple PHP, or /api/journals/show?id=1
             'controller' => \App\Presentation\Controllers\JournalController::class,
             'action' => 'show',
             'middleware' => []
        ],
        // FAQ Routes
        '/api/faq' => [
            'controller' => \App\Presentation\Controllers\FAQController::class,
            'action' => 'index',
            'middleware' => [] // Public
        ],
        '/api/faq/show' => [
            'controller' => \App\Presentation\Controllers\FAQController::class,
            'action' => 'show',
            'middleware' => [] // Public
        ],
        // Messages Routes
        '/api/messages' => [
            'controller' => \App\Presentation\Controllers\MessageController::class,
            'action' => 'index',
            'middleware' => [\App\Presentation\Middleware\AuthenticationMiddleware::class] // Protected
        ],
        // OJS Integration (Display Only)
        '/api/ojs/submissions' => [
            'controller' => \App\Presentation\Controllers\OJSController::class,
            'action' => 'listSubmissions',
            'middleware' => [\App\Presentation\Middleware\AuthenticationMiddleware::class] // Admin only
        ],
        '/api/ojs/submissions/show' => [
            'controller' => \App\Presentation\Controllers\OJSController::class,
            'action' => 'getSubmission',
            'middleware' => [] // Public (for authors)
        ],
    ]
];

// Dispatch
if (isset($routes[$method][$uri])) {
    $route = $routes[$method][$uri];
    $controllerClass = $route['controller'];
    $action = $route['action'];
    $middlewares = $route['middleware'] ?? [];
    $rateLimitConfig = $route['rate_limit'] ?? null;

    // Apply rate limiting if configured
    if ($rateLimitConfig) {
        $rateLimiter = new \App\Presentation\Middleware\RateLimitMiddleware(
            $rateLimitConfig['max'],
            $rateLimitConfig['decay']
        );
        if (!$rateLimiter->handle($rateLimitConfig['identifier'])) {
            // Rate limit exceeded, response already sent
            exit;
        }
    }

    // Resolve and run middlewares
    foreach ($middlewares as $middlewareClass) {
        $middleware = $container->get($middlewareClass);
        // Middleware handle method should exit if authentication fails
        // In a real framework, this would be a pipeline
        if (method_exists($middleware, 'handle')) {
            $middleware->handle();
        } elseif (is_callable($middleware)) {
            $middleware();
        }
    }
    
    // Resolve controller from container
    $controller = $container->get($controllerClass);
    $controller->$action();
} else {
    header("HTTP/1.0 404 Not Found");
    echo json_encode(['error' => 'Not Found']);
}
