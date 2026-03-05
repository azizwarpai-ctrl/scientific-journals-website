<?php
/**
 * OJS Journals API Proxy — Production Hardened
 * 
 * Connects as localhost to the OJS MySQL database and serves
 * journal data as JSON for the DigitoPub Next.js application.
 * 
 * Security layers:
 *   1. Request method restriction (GET only)
 *   2. IP whitelisting (REMOTE_ADDR — not spoofable)
 *   3. API key authentication (timing-safe comparison)
 *   4. Rate limiting (file-based, per-IP)
 *   5. Static SQL queries (no user input in SQL)
 *   6. XSS-safe JSON encoding
 *   7. Generic error responses (no stack traces)
 * 
 * Deploy to: SiteGround public_html/api/ojs-journals.php
 */

// ─── Security Headers ───────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: public, max-age=300, s-maxage=300');

// ─── Configuration ──────────────────────────────────────────────────

$CONFIG = [
    'api_key'  => 'dgtpub_ojs_2026_k9x7m4',
    'db_host'  => 'localhost',
    'db_port'  => 3306,
    'db_name'  => 'dbkgvcunttgs97',
    'db_user'  => 'ua9oxq3q2pzvz',
    'db_pass'  => '32FFb#1449LF',
    'db_charset' => 'utf8mb4',
    
    // IP whitelist: Only these IPs can access the API
    // Set to empty array [] to disable IP whitelisting
    'allowed_ips' => [
        '147.93.48.207',  // Hostinger production server (digitopub.com)
    ],

    // Rate limiting
    'rate_limit'     => 60,     // Max requests per window
    'rate_window'    => 60,     // Window in seconds
    'rate_dir'       => __DIR__ . '/../.rate_limit', // Outside public_html
];

// ─── Helper Functions ───────────────────────────────────────────────

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, 
        JSON_PRETTY_PRINT 
        | JSON_UNESCAPED_UNICODE 
        | JSON_HEX_TAG        // Encode < > to prevent XSS in HTML contexts
        | JSON_HEX_AMP        // Encode &
        | JSON_HEX_APOS       // Encode '
        | JSON_HEX_QUOT       // Encode "
    );
    exit;
}

function sanitizeField(?string $value, array $allowedTags = []): ?string {
    if ($value === null) return null;
    // Strip dangerous HTML, optionally keep safe scientific tags
    return strip_tags($value, $allowedTags);
}

// ─── Gate 1: Request Method ─────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// ─── Gate 2: IP Whitelist ───────────────────────────────────────────

$clientIp = $_SERVER['REMOTE_ADDR'];
$allowedIps = $CONFIG['allowed_ips'];

if (!empty($allowedIps) && !in_array($clientIp, $allowedIps, true)) {
    // Log blocked attempt (visible in SiteGround error logs)
    error_log("[OJS-API] Blocked request from unauthorized IP: {$clientIp}");
    jsonResponse(['success' => false, 'error' => 'Forbidden'], 403);
}

// ─── Gate 3: API Key Authentication ─────────────────────────────────

$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['key'] ?? '');

// Timing-safe comparison prevents timing attacks on the API key
if (!hash_equals($CONFIG['api_key'], $providedKey)) {
    jsonResponse(['success' => false, 'error' => 'Unauthorized'], 403);
}

// ─── Gate 4: Rate Limiting ──────────────────────────────────────────

$rateDir = $CONFIG['rate_dir'];
if (!is_dir($rateDir)) {
    @mkdir($rateDir, 0750, true);
}

$rateFile = $rateDir . '/' . md5($clientIp) . '.json';
$now = time();
$rateData = ['count' => 0, 'window_start' => $now];

if (file_exists($rateFile)) {
    $stored = json_decode(file_get_contents($rateFile), true);
    if ($stored && ($now - $stored['window_start']) < $CONFIG['rate_window']) {
        $rateData = $stored;
    }
}

$rateData['count']++;

if ($rateData['count'] > $CONFIG['rate_limit']) {
    header('Retry-After: ' . ($CONFIG['rate_window'] - ($now - $rateData['window_start'])));
    jsonResponse(['success' => false, 'error' => 'Rate limit exceeded'], 429);
}

file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

// ─── Database Query ─────────────────────────────────────────────────

try {
    $dsn = "mysql:host={$CONFIG['db_host']};port={$CONFIG['db_port']};dbname={$CONFIG['db_name']};charset={$CONFIG['db_charset']}";
    
    $pdo = new PDO($dsn, $CONFIG['db_user'], $CONFIG['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 10,
    ]);
    
    // Static query — no user input, no injection possible
    $stmt = $pdo->query("
        SELECT
            j.journal_id,
            j.path,
            j.primary_locale,
            j.enabled,
            js_name.setting_value AS name,
            js_desc.setting_value AS description
        FROM journals j
        LEFT JOIN journal_settings js_name
            ON js_name.journal_id = j.journal_id
            AND js_name.setting_name = 'name'
            AND js_name.locale = j.primary_locale
        LEFT JOIN journal_settings js_desc
            ON js_desc.journal_id = j.journal_id
            AND js_desc.setting_name = 'description'
            AND js_desc.locale = j.primary_locale
        WHERE j.enabled = 1
        ORDER BY j.seq ASC
    ");
    
    $journals = [];
    while ($row = $stmt->fetch()) {
        $journals[] = [
            'journal_id'     => (int) $row['journal_id'],
            'path'           => $row['path'],
            'primary_locale' => $row['primary_locale'],
            'enabled'        => (bool) $row['enabled'],
            // Sanitize text fields — strip all HTML except safe scientific tags
            'name'           => sanitizeField($row['name']),
            'description'    => sanitizeField($row['description'], ['<em>', '<strong>', '<sub>', '<sup>']),
        ];
    }
    
    $pdo = null; // Close connection
    
    jsonResponse([
        'success' => true,
        'data'    => $journals,
        'count'   => count($journals),
    ]);

} catch (PDOException $e) {
    error_log("[OJS-API] Database error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
