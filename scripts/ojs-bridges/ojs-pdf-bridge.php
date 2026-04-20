<?php
/**
 * OJS PDF Galley Bridge for Digitopub
 *
 * Target Deployment: submitmanager.com (OJS Instance)
 *
 * PURPOSE
 * -------
 * OJS's public galley URLs (/article/download/... and /article/view/...) are
 * often blocked by:
 *   - The OJS payments plugin (returns 403 / login redirect),
 *   - Hotlink / Referer-based WAF rules,
 *   - Session-based "click-through" prompts,
 *   - Plugin overrides that insert interstitial pages.
 * Those blocks produce the "Access permission required" message the Next.js
 * client surfaces. This bridge bypasses all of them by:
 *   1. Authenticating the caller with a shared Bearer token (OJS_API_KEY),
 *   2. Resolving the galley → submission_file → file row directly in the DB,
 *   3. Verifying the submission is PUBLISHED and belongs to the given journal,
 *   4. Streaming the raw file straight from the OJS files_dir on disk.
 *
 * Because the file is read from the local filesystem the OJS server already
 * owns, none of the upstream permission layers can intercept it.
 *
 * INSTALLATION
 * ------------
 * 1. Upload this script as `ojs-pdf-bridge.php` to the ROOT directory of the
 *    `submitmanager.com` OJS installation (next to `index.php`,
 *    `config.inc.php`, `ojs-user-bridge.php`).
 * 2. Ensure the same `OJS_API_KEY` is set on both the Next.js env and either
 *    as an env var on the PHP-FPM / Apache process, or under
 *    `[digitopub] api_key = ...` in `config.inc.php`.
 * 3. Make sure the PHP user has read access to the OJS `files_dir`.
 * 4. Restrict the endpoint to inbound requests from your Next.js server
 *    (WAF allowlist / firewall rule) as defence in depth.
 *
 * REQUEST
 * -------
 *   GET /ojs-pdf-bridge.php?journal=<path>&submissionId=<id>&galleyId=<id>[&fileId=<id>]
 *   Authorization: Bearer <OJS_API_KEY>
 *
 * RESPONSES
 * ---------
 *   200 application/pdf        — file stream
 *   400 application/json       — invalid request
 *   401 application/json       — missing Authorization header
 *   403 application/json       — bad API key / unpublished submission
 *   404 application/json       — galley or file row missing
 *   500 application/json       — server misconfiguration / disk error
 *
 * @module scripts/ojs-pdf-bridge
 */

// ─── Runtime hardening ─────────────────────────────────────────────────────
$isDev = getenv('APP_ENV') === 'development';
ini_set('display_errors', $isDev ? '1' : '0');
ini_set('display_startup_errors', $isDev ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Security Headers
header('X-Robots-Tag: noindex, nofollow');
header('Access-Control-Allow-Origin: *'); // Could be restricted to NEXT_PUBLIC_APP_URL, but auth key protects anyway
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// ─── Rate limiting (IP-keyed, filesystem-backed) ──────────────────────────
//
// The previous implementation used PHP sessions, which are useless for a
// server-to-server endpoint: each Next.js request produces a new cookie, so
// the bucket is always empty, AND it pollutes Set-Cookie on the response.
// Replace with a lightweight per-IP file counter.
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR']
    ?? $_SERVER['HTTP_X_REAL_IP']
    ?? $_SERVER['REMOTE_ADDR']
    ?? 'unknown';
// If X-Forwarded-For has a list, take the first hop.
if (strpos($clientIp, ',') !== false) {
    $clientIp = trim(explode(',', $clientIp)[0]);
}
$rateDir = sys_get_temp_dir() . '/ojs-pdf-bridge-rl';
@mkdir($rateDir, 0700, true);
$rateFile = $rateDir . '/' . hash('sha256', $clientIp);
$rateLimit  = 120; // requests
$rateWindow = 60;  // seconds
$now = time();
$hits = [];
if (is_file($rateFile)) {
    $raw = @file_get_contents($rateFile);
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $hits = array_values(array_filter($decoded, function ($t) use ($now, $rateWindow) {
                return is_int($t) && ($now - $t) < $rateWindow;
            }));
        }
    }
}
if (count($hits) >= $rateLimit) {
    http_response_code(429);
    header('Retry-After: 60');
    header('Content-Type: application/json; charset=utf-8');
    header('X-PDF-Bridge-Error: RATE_LIMIT_EXCEEDED');
    echo json_encode([
        'success' => false,
        'error'   => 'RATE_LIMIT_EXCEEDED',
        'message' => 'Too many requests from this IP. Please try again later.',
        'status'  => 429,
    ]);
    exit;
}
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);

// Helper: emit a JSON error and exit. Echoes an X-PDF-Bridge-Error header so
// the Next.js proxy can surface the exact failure reason to operators.
function bridge_json_error($statusCode, $code, $message, array $extra = []) {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-PDF-Bridge-Error: ' . $code);
    }
    $payload = [
        'success' => false,
        'error'   => $code,
        'message' => $message,
        'status'  => $statusCode,
    ];
    if (!empty($extra)) {
        $payload['details'] = $extra;
    }
    echo json_encode($payload);
    exit;
}

// Collect request headers in a case-insensitive, Apache-safe way.
//
// Apache + mod_php frequently strips `Authorization` from `$_SERVER`, leaving
// the bearer invisible unless we fall through to `getallheaders()` or the
// redirected copy. Without this, the bridge always returns 401 AUTH_REQUIRED
// for legitimate callers — which is the exact symptom reported in prod.
function bridge_get_authorization_header() {
    $candidates = [
        $_SERVER['HTTP_AUTHORIZATION'] ?? null,
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
        $_SERVER['HTTP_X_AUTHORIZATION'] ?? null, // some proxies rename it
    ];
    foreach ($candidates as $value) {
        if (!empty($value)) return $value;
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $name => $value) {
                if (strcasecmp($name, 'Authorization') === 0 && !empty($value)) {
                    return $value;
                }
            }
        }
    }
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (is_array($headers)) {
            foreach ($headers as $name => $value) {
                if (strcasecmp($name, 'Authorization') === 0 && !empty($value)) {
                    return $value;
                }
            }
        }
    }
    return '';
}

// ─── Method gate ───────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    bridge_json_error(405, 'METHOD_NOT_ALLOWED', 'Only GET/HEAD is permitted.');
}

// ─── Load OJS config (for DB + files_dir) ─────────────────────────────────
//
// Search order for config.inc.php:
//   1. Same directory as this bridge (default OJS layout).
//   2. Parent directory (when bridge sits in a sibling dir, e.g. /ojs-bridges).
//   3. OJS_CONFIG_PATH env override for non-standard layouts.
$configCandidates = array_filter([
    getenv('OJS_CONFIG_PATH') ?: null,
    dirname(__FILE__) . '/config.inc.php',
    dirname(__FILE__) . '/../config.inc.php',
]);
$configFile = null;
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) {
        $configFile = $candidate;
        break;
    }
}
if ($configFile === null) {
    error_log('[PDF-Bridge] FATAL: config.inc.php not found. Tried: ' . implode(', ', $configCandidates));
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS config.inc.php is missing.');
}
// INI_SCANNER_RAW preserves special chars (`$`, `!`, `"`, `;`, etc.) that
// commonly appear in DB passwords — without it parse_ini_file silently
// truncates the value and DB auth fails with a cryptic "Access denied".
$config = @parse_ini_file($configFile, true, INI_SCANNER_RAW);
if (empty($config) || empty($config['database'])) {
    error_log('[PDF-Bridge] FATAL: Failed to parse ' . $configFile);
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS configuration unavailable.');
}

// Trim wrapping quotes that INI_SCANNER_RAW leaves intact on quoted values.
$stripIniQuotes = function ($value) {
    if (!is_string($value)) return $value;
    $trimmed = trim($value);
    if (strlen($trimmed) >= 2) {
        $first = $trimmed[0];
        $last  = $trimmed[strlen($trimmed) - 1];
        if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
            return substr($trimmed, 1, -1);
        }
    }
    return $trimmed;
};
foreach ($config as $section => $values) {
    if (is_array($values)) {
        foreach ($values as $key => $value) {
            $config[$section][$key] = $stripIniQuotes($value);
        }
    }
}

// ─── Bearer auth ──────────────────────────────────────────────────────────
$apiKey = getenv('OJS_API_KEY')
    ?: ($_ENV['OJS_API_KEY'] ?? ($config['digitopub']['api_key'] ?? ''));
if (empty($apiKey)) {
    error_log('[PDF-Bridge] FATAL: OJS_API_KEY is not set (env or [digitopub] api_key).');
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS_API_KEY is not configured.');
}

$authHeader = bridge_get_authorization_header();
if (empty($authHeader)) {
    error_log('[PDF-Bridge] AUTH_REQUIRED: no Authorization header seen (Apache may be stripping it — check .htaccess).');
    bridge_json_error(401, 'AUTH_REQUIRED', 'Missing Authorization header. If you are sure the client sent one, Apache may be stripping it — see deployment .htaccess.');
}
if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    bridge_json_error(401, 'AUTH_REQUIRED', 'Authorization header is not a Bearer token.');
}
if (!hash_equals($apiKey, trim($matches[1]))) {
    error_log('[PDF-Bridge] INVALID_KEY: Bearer token mismatch.');
    bridge_json_error(403, 'INVALID_KEY', 'Invalid API key.');
}

// ─── Diagnostic mode (Bearer-gated) ───────────────────────────────────────
//
// `?debug=1` returns the step-by-step resolution without streaming the file.
// Only reachable after the Bearer check succeeds, so it never leaks details
// to unauthenticated callers. Lets operators pinpoint which step fails
// (journal lookup, submission status, galley join, file on disk).
$debugMode = isset($_GET['debug']) && $_GET['debug'] === '1';
$debugTrace = [];

// ─── Parameter validation ─────────────────────────────────────────────────
$journalPath  = isset($_GET['journal'])      ? trim($_GET['journal'])      : '';
$submissionId = isset($_GET['submissionId']) ? trim($_GET['submissionId']) : '';
$galleyId     = isset($_GET['galleyId'])     ? trim($_GET['galleyId'])     : '';
$fileId       = isset($_GET['fileId'])       ? trim($_GET['fileId'])       : '';

if (!preg_match('/^[A-Za-z0-9._-]+$/', $journalPath)
 || !ctype_digit($submissionId)
 || !ctype_digit($galleyId)
 || ($fileId !== '' && !ctype_digit($fileId))) {
    bridge_json_error(400, 'BAD_REQUEST', 'Missing or invalid parameters.');
}

$submissionId = (int)$submissionId;
$galleyId     = (int)$galleyId;
$fileIdHint   = $fileId !== '' ? (int)$fileId : null;

// ─── Database connection ──────────────────────────────────────────────────
$dbConfig = $config['database'];
try {
    $dsn = 'mysql:host=' . ($dbConfig['host'] ?? 'localhost')
         . ';port=' . intval($dbConfig['port'] ?? 3306)
         . ';dbname=' . ($dbConfig['name'] ?? '')
         . ';charset=utf8mb4';
    $pdo = new PDO(
        $dsn,
        $dbConfig['username'] ?? '',
        $dbConfig['password'] ?? '',
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    error_log('[PDF-Bridge] DB connection failed: ' . $e->getMessage());
    bridge_json_error(500, 'DB_ERROR', 'Database connection failed.');
}

// ─── Resolve journal context ──────────────────────────────────────────────
$stmt = $pdo->prepare('SELECT journal_id, enabled FROM journals WHERE path = ? LIMIT 1');
$stmt->execute([$journalPath]);
$journalRow = $stmt->fetch();
if (!$journalRow) {
    bridge_json_error(404, 'JOURNAL_NOT_FOUND', 'Unknown journal path.');
}
$journalId = (int)$journalRow['journal_id'];
$debugTrace['journal'] = [
    'path'       => $journalPath,
    'journal_id' => $journalId,
    'enabled'    => (int)($journalRow['enabled'] ?? 0),
];

// ─── Verify submission belongs to journal AND is published ───────────────
//
// OJS statuses: 1=QUEUED, 3=PUBLISHED, 4=DECLINED, 5=SCHEDULED. We only serve
// status=3 (published) by default. This matches the public surface shown on
// digitopub.com, and matches OJS's own gate for /article/view/… when the
// journal is enabled. If you need to serve scheduled or queued submissions
// (e.g. pre-publication review on a staging mirror), set the env var
// `OJS_PDF_BRIDGE_ALLOW_STATUSES=3,5` (comma-separated OJS status codes).
$allowedStatusesRaw = getenv('OJS_PDF_BRIDGE_ALLOW_STATUSES');
$allowedStatuses = [3];
if (!empty($allowedStatusesRaw)) {
    $parsed = array_values(array_filter(array_map('intval', explode(',', $allowedStatusesRaw))));
    if (!empty($parsed)) {
        $allowedStatuses = $parsed;
    }
}

$stmt = $pdo->prepare(
    'SELECT submission_id, status, context_id
     FROM submissions
     WHERE submission_id = ? AND context_id = ?
     LIMIT 1'
);
$stmt->execute([$submissionId, $journalId]);
$submission = $stmt->fetch();
if (!$submission) {
    bridge_json_error(404, 'SUBMISSION_NOT_FOUND', 'Submission not found for this journal.', [
        'journalId'    => $journalId,
        'submissionId' => $submissionId,
    ]);
}
$submissionStatus = (int)$submission['status'];
$debugTrace['submission'] = [
    'submission_id'    => $submissionId,
    'status'           => $submissionStatus,
    'allowed_statuses' => $allowedStatuses,
];
if (!in_array($submissionStatus, $allowedStatuses, true)) {
    bridge_json_error(403, 'UNPUBLISHED', 'Submission is not in an allowed status.', [
        'status'           => $submissionStatus,
        'allowed_statuses' => $allowedStatuses,
    ]);
}

// ─── Resolve galley → submission_file → file ──────────────────────────────
//
// publication_galleys.submission_file_id → submission_files.file_id →
// files.{path, mimetype}. We also cross-check that the galley's publication
// belongs to the requested submission.
$stmt = $pdo->prepare(
    'SELECT pg.galley_id,
            pg.submission_file_id,
            pg.publication_id,
            pub.submission_id AS pub_submission_id,
            sf.submission_file_id AS sf_id,
            sf.file_id AS sf_file_id,
            sf.submission_id AS sf_submission_id,
            f.file_id,
            f.path,
            f.mimetype
     FROM publication_galleys pg
     LEFT JOIN publications pub ON pub.publication_id = pg.publication_id
     LEFT JOIN submission_files sf ON sf.submission_file_id = pg.submission_file_id
     LEFT JOIN files f ON f.file_id = sf.file_id
     WHERE pg.galley_id = ?
     LIMIT 1'
);
$stmt->execute([$galleyId]);
$row = $stmt->fetch();
if (!$row) {
    bridge_json_error(404, 'GALLEY_NOT_FOUND', 'Galley row not found.', [
        'galleyId' => $galleyId,
    ]);
}
$debugTrace['galley'] = [
    'galley_id'          => (int)$row['galley_id'],
    'submission_file_id' => (int)($row['submission_file_id'] ?? 0),
    'publication_id'     => (int)($row['publication_id'] ?? 0),
    'pub_submission_id'  => (int)($row['pub_submission_id'] ?? 0),
    'sf_submission_id'   => (int)($row['sf_submission_id'] ?? 0),
    'file_id'            => (int)($row['file_id'] ?? 0),
];
if ((int)$row['pub_submission_id'] !== $submissionId
 && (int)$row['sf_submission_id'] !== $submissionId) {
    bridge_json_error(403, 'SUBMISSION_MISMATCH', 'Galley does not belong to this submission.', [
        'requested_submission' => $submissionId,
        'pub_submission_id'    => (int)($row['pub_submission_id'] ?? 0),
        'sf_submission_id'     => (int)($row['sf_submission_id'] ?? 0),
    ]);
}

$filePathRel = $row['path'] ?? null;
$mimeType    = $row['mimetype'] ?? 'application/pdf';
if (empty($filePathRel)) {
    // The galley may not have a bound submission_file yet (e.g. remote URL galley).
    bridge_json_error(404, 'FILE_NOT_FOUND', 'Galley has no associated file on disk.');
}

// If caller provided a fileId hint, confirm it matches the resolved file row.
// This prevents a client from probing arbitrary galley/file combinations.
if ($fileIdHint !== null && (int)$row['file_id'] !== $fileIdHint) {
    bridge_json_error(403, 'FILE_MISMATCH', 'fileId does not match the galley\'s file.', [
        'fileId_hint'    => $fileIdHint,
        'resolved_file'  => (int)$row['file_id'],
    ]);
}

// ─── Resolve files_dir and safely join ────────────────────────────────────
$filesDir = $config['files']['files_dir'] ?? '';
if (empty($filesDir)) {
    error_log('[PDF-Bridge] FATAL: files_dir not set in config.inc.php.');
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS files_dir is not configured.');
}

$filesDirReal = realpath($filesDir);
if ($filesDirReal === false) {
    error_log('[PDF-Bridge] FATAL: files_dir does not exist: ' . $filesDir);
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS files_dir is unreadable.');
}

// Paths in `files.path` are stored relative to files_dir. Normalize and
// verify the resolved path stays inside files_dir to block path traversal.
$candidate = rtrim($filesDirReal, '/\\') . DIRECTORY_SEPARATOR . ltrim($filePathRel, '/\\');
$resolved  = realpath($candidate);
$debugTrace['file'] = [
    'relative_path' => $filePathRel,
    'candidate'     => $candidate,
    'resolved'      => $resolved ?: null,
    'files_dir'     => $filesDirReal,
    'readable'      => $resolved ? is_readable($resolved) : false,
];
if ($resolved === false || strpos($resolved, $filesDirReal) !== 0) {
    error_log('[PDF-Bridge] Path traversal blocked or file missing. Candidate=' . $candidate);
    bridge_json_error(404, 'FILE_NOT_FOUND', 'File does not exist on disk.', [
        'candidate' => $candidate,
    ]);
}
if (!is_file($resolved) || !is_readable($resolved)) {
    bridge_json_error(404, 'FILE_NOT_FOUND', 'File is missing or unreadable.', [
        'resolved' => $resolved,
    ]);
}

// If debug mode is on, return the trace instead of the file. Placed here so
// operators get full resolution detail; all error paths above already include
// `details` via bridge_json_error's $extra arg.
if ($debugMode) {
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode([
        'success' => true,
        'debug'   => true,
        'trace'   => $debugTrace,
    ], JSON_PRETTY_PRINT);
    exit;
}

// ─── Sanity-check the content looks like a PDF ────────────────────────────
//
// Journals sometimes upload mislabeled files; without this, we could stream
// arbitrary content as application/pdf. Allow by magic bytes OR by mimetype.
$fh = @fopen($resolved, 'rb');
if (!$fh) {
    bridge_json_error(500, 'DISK_ERROR', 'Could not open file for reading.');
}
$head = fread($fh, 4);
$isPdfMagic = $head === '%PDF';
$isPdfMime  = stripos((string)$mimeType, 'pdf') !== false
           || stripos((string)$mimeType, 'octet-stream') !== false;
if (!$isPdfMagic && !$isPdfMime) {
    fclose($fh);
    bridge_json_error(415, 'UNSUPPORTED_MEDIA_TYPE', 'File is not a PDF.');
}
rewind($fh);

// ─── Stream the PDF back ──────────────────────────────────────────────────
// $clientIp was resolved during the rate-limit step at the top of the script.
error_log("[PDF-Bridge] SUCCESS: Serving journal={$journalPath} subId={$submissionId} file={$resolved} ip={$clientIp}");

$filename = 'article-' . $submissionId . '.pdf';
$size     = filesize($resolved);

// Flush any accidental output buffers before streaming binary.
while (ob_get_level() > 0) { ob_end_clean(); }

http_response_code(200);
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $filename . '"');
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
if ($size !== false) {
    header('Content-Length: ' . $size);
}

if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    fclose($fh);
    exit;
}

fpassthru($fh);
fclose($fh);
exit;
