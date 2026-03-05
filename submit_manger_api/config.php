<?php
/**
 * OJS API Proxy — Configuration
 * 
 * SECURITY: This file MUST be protected from direct web access.
 * The accompanying .htaccess file denies access to this file.
 * 
 * On SiteGround, ideally place this file ABOVE public_html.
 * If that's not possible, the .htaccess protection is sufficient.
 */

return [
    // ─── Database ────────────────────────────────────────────────────
    'db' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'name'     => 'dbkgvcunttgs97',
        'user'     => 'ua9oxq3q2pzvz',
        'password' => '32FFb#1449LF',
        'charset'  => 'utf8mb4',
    ],

    // ─── Authentication ──────────────────────────────────────────────
    // API key must be sent via X-API-KEY header (NOT as query param).
    // Generate a strong key: php -r "echo bin2hex(random_bytes(32));"
    'api_key' => 'dgtpub_ojs_2026_k9x7m4',

    // ─── Security ────────────────────────────────────────────────────
    // Allowed origins for CORS (comma-separated or array).
    // Set to '*' to allow all (not recommended for production).
    'allowed_origins' => [
        'https://digitopub.com',
        'https://www.digitopub.com',
        'http://localhost:3000',
    ],

    // IP whitelist (empty = allow all). Useful for server-to-server.
    // Add your Hostinger server IP(s) here for extra security.
    'ip_whitelist' => [
        '147.93.48.207',  // Hostinger production server
    ],

    // ─── Rate Limiting ───────────────────────────────────────────────
    // File-based rate limiting compatible with shared hosting.
    'rate_limit' => [
        'enabled'    => true,
        'max_requests' => 60,       // Max requests per window
        'window_seconds' => 60,     // Time window in seconds
        'storage_dir' => sys_get_temp_dir() . '/ojs_api_rate_limits',
    ],

    // ─── Caching ─────────────────────────────────────────────────────
    'cache' => [
        'enabled'     => true,
        'ttl_seconds' => 300,       // 5 minutes
        'storage_dir' => sys_get_temp_dir() . '/ojs_api_cache',
    ],
];
