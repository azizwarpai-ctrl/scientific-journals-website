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

// Helper: emit a JSON error and exit.
function bridge_json_error($statusCode, $code, $message) {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-PDF-Bridge-Error: ' . $code);
    }
    echo json_encode([
        'success' => false,
        'error'   => $code,
        'message' => $message,
        'status'  => $statusCode,
    ]);
    exit;
}

// ─── Method gate ───────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    bridge_json_error(405, 'METHOD_NOT_ALLOWED', 'Only GET/HEAD is permitted.');
}

// ─── Load OJS config (for DB + files_dir) ─────────────────────────────────
$configFile = dirname(__FILE__) . '/config.inc.php';
if (!file_exists($configFile)) {
    error_log('[PDF-Bridge] FATAL: config.inc.php not found at ' . $configFile);
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS config.inc.php is missing.');
}
$config = parse_ini_file($configFile, true);
if (empty($config) || empty($config['database'])) {
    error_log('[PDF-Bridge] FATAL: Failed to parse config.inc.php.');
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS configuration unavailable.');
}

// ─── Bearer auth ──────────────────────────────────────────────────────────
$apiKey = getenv('OJS_API_KEY')
    ?: ($_ENV['OJS_API_KEY'] ?? ($config['digitopub']['api_key'] ?? ''));
if (empty($apiKey)) {
    error_log('[PDF-Bridge] FATAL: OJS_API_KEY is not set.');
    bridge_json_error(500, 'SERVER_MISCONFIGURED', 'OJS_API_KEY is not configured.');
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? '';
if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    bridge_json_error(401, 'AUTH_REQUIRED', 'Missing or invalid Authorization header.');
}
if (!hash_equals($apiKey, trim($matches[1]))) {
    bridge_json_error(403, 'INVALID_KEY', 'Invalid API key.');
}

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
$stmt = $pdo->prepare('SELECT journal_id FROM journals WHERE path = ? LIMIT 1');
$stmt->execute([$journalPath]);
$journalRow = $stmt->fetch();
if (!$journalRow) {
    bridge_json_error(404, 'JOURNAL_NOT_FOUND', 'Unknown journal path.');
}
$journalId = (int)$journalRow['journal_id'];

// ─── Verify submission belongs to journal AND is published ───────────────
//
// OJS statuses: 1=QUEUED, 3=PUBLISHED, 4=DECLINED, 5=SCHEDULED. We only serve
// status=3 to match what the public site exposes — protects in-review files.
$stmt = $pdo->prepare(
    'SELECT submission_id, status, context_id
     FROM submissions
     WHERE submission_id = ? AND context_id = ?
     LIMIT 1'
);
$stmt->execute([$submissionId, $journalId]);
$submission = $stmt->fetch();
if (!$submission) {
    bridge_json_error(404, 'SUBMISSION_NOT_FOUND', 'Submission not found for this journal.');
}
if ((int)$submission['status'] !== 3) {
    bridge_json_error(403, 'UNPUBLISHED', 'Submission is not published.');
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
    bridge_json_error(404, 'GALLEY_NOT_FOUND', 'Galley row not found.');
}
if ((int)$row['pub_submission_id'] !== $submissionId
 && (int)$row['sf_submission_id'] !== $submissionId) {
    bridge_json_error(403, 'SUBMISSION_MISMATCH', 'Galley does not belong to this submission.');
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
    bridge_json_error(403, 'FILE_MISMATCH', 'fileId does not match the galley\'s file.');
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
if ($resolved === false || strpos($resolved, $filesDirReal) !== 0) {
    error_log('[PDF-Bridge] Path traversal blocked. Candidate=' . $candidate);
    bridge_json_error(404, 'FILE_NOT_FOUND', 'File does not exist on disk.');
}
if (!is_file($resolved) || !is_readable($resolved)) {
    bridge_json_error(404, 'FILE_NOT_FOUND', 'File is missing or unreadable.');
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
