<?php
/**
 * OJS API Proxy — Secure Multi-Endpoint Bridge
 *
 * Runs on SiteGround alongside the OJS MySQL database.
 * Connects as localhost (no Remote MySQL needed) and serves
 * OJS data as JSON for the DigitoPub Node.js application.
 *
 * Deploy to: SiteGround public_html/api/api.php
 * Endpoint:  https://submitmanager.com/api/api.php?action=journals
 *
 * Security features:
 *  - API key validated via X-API-KEY header only
 *  - HTTP method restriction (GET only)
 *  - CORS with configurable allowed origins
 *  - File-based rate limiting (shared-hosting compatible)
 *  - PDO prepared statements for all parameterized queries
 *  - Input validation and sanitization
 *  - Whitelisted actions only (no arbitrary queries)
 *  - File-based response caching
 */

// ─── Error Handling ─────────────────────────────────────────────────
// Never expose PHP errors to the client in production
error_reporting(0);
ini_set('display_errors', '0');

// ─── Load Configuration ─────────────────────────────────────────────
$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Server configuration error', 'code' => 'CONFIG_MISSING']);
    exit;
}
$config = require $configPath;

// ─── Security Headers ───────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// ─── CORS Handling ──────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = $config['allowed_origins'] ?? [];

if ($origin && (in_array($origin, $allowedOrigins, true) || in_array('*', $allowedOrigins, true))) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: X-API-KEY, Content-Type');
    header('Access-Control-Max-Age: 86400');
}

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── HTTP Method Restriction ────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET, OPTIONS');
    echo json_encode(['success' => false, 'error' => 'Method not allowed', 'code' => 'METHOD_NOT_ALLOWED']);
    exit;
}

// ─── IP Whitelist ───────────────────────────────────────────────────
$ipWhitelist = $config['ip_whitelist'] ?? [];
if (!empty($ipWhitelist)) {
    $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    // Take the first IP if X-Forwarded-For contains multiple
    $clientIp = trim(explode(',', $clientIp)[0]);
    if (!in_array($clientIp, $ipWhitelist, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied', 'code' => 'IP_BLOCKED']);
        exit;
    }
}

// ─── Authentication ─────────────────────────────────────────────────
$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
$expectedKey = $config['api_key'] ?? '';

if (empty($expectedKey) || !hash_equals($expectedKey, $providedKey)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized', 'code' => 'AUTH_FAILED']);
    exit;
}

// ─── Rate Limiting (file-based, shared-hosting compatible) ──────────
$rateLimitConfig = $config['rate_limit'] ?? ['enabled' => false];
if ($rateLimitConfig['enabled']) {
    $rlDir = $rateLimitConfig['storage_dir'] ?? sys_get_temp_dir() . '/ojs_api_rate_limits';
    if (!is_dir($rlDir)) {
        @mkdir($rlDir, 0700, true);
    }
    $clientIpForRl = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $clientIpForRl = trim(explode(',', $clientIpForRl)[0]);
    $rlFile = $rlDir . '/' . md5($clientIpForRl) . '.json';

    $maxRequests = $rateLimitConfig['max_requests'] ?? 60;
    $window = $rateLimitConfig['window_seconds'] ?? 60;
    $now = time();

    $rlData = ['requests' => [], 'blocked_until' => 0];
    if (file_exists($rlFile)) {
        $raw = @file_get_contents($rlFile);
        if ($raw) {
            $rlData = json_decode($raw, true) ?: $rlData;
        }
    }

    // Check if currently blocked
    if ($rlData['blocked_until'] > $now) {
        http_response_code(429);
        header('Retry-After: ' . ($rlData['blocked_until'] - $now));
        echo json_encode([
            'success' => false,
            'error' => 'Rate limit exceeded. Try again later.',
            'code' => 'RATE_LIMITED',
            'retry_after' => $rlData['blocked_until'] - $now,
        ]);
        exit;
    }

    // Clean old entries
    $rlData['requests'] = array_values(array_filter(
        $rlData['requests'],
        function ($ts) use ($now, $window) { return $ts > ($now - $window); }
    ));

    // Check rate
    if (count($rlData['requests']) >= $maxRequests) {
        $rlData['blocked_until'] = $now + $window;
        @file_put_contents($rlFile, json_encode($rlData), LOCK_EX);
        http_response_code(429);
        header('Retry-After: ' . $window);
        echo json_encode([
            'success' => false,
            'error' => 'Rate limit exceeded. Try again later.',
            'code' => 'RATE_LIMITED',
            'retry_after' => $window,
        ]);
        exit;
    }

    // Record this request
    $rlData['requests'][] = $now;
    @file_put_contents($rlFile, json_encode($rlData), LOCK_EX);
}

// ─── Action Router ──────────────────────────────────────────────────
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

$validActions = ['journals', 'journal', 'submissions', 'submission', 'issues', 'stats', 'health'];

if (empty($action)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing required parameter: action',
        'code' => 'MISSING_ACTION',
        'available_actions' => $validActions,
    ]);
    exit;
}

if (!in_array($action, $validActions, true)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => "Unknown action: {$action}",
        'code' => 'INVALID_ACTION',
        'available_actions' => $validActions,
    ]);
    exit;
}

// ─── Cache Helper ───────────────────────────────────────────────────
$cacheConfig = $config['cache'] ?? ['enabled' => false];

function getCacheKey(string $action, array $params): string {
    return md5($action . ':' . json_encode($params));
}

function getFromCache(string $key, array $cacheConfig): ?string {
    if (!$cacheConfig['enabled']) return null;
    $dir = $cacheConfig['storage_dir'] ?? sys_get_temp_dir() . '/ojs_api_cache';
    $file = $dir . '/' . $key . '.json';
    if (!file_exists($file)) return null;
    $mtime = filemtime($file);
    $ttl = $cacheConfig['ttl_seconds'] ?? 300;
    if ((time() - $mtime) > $ttl) {
        @unlink($file);
        return null;
    }
    return @file_get_contents($file);
}

function setCache(string $key, string $data, array $cacheConfig): void {
    if (!$cacheConfig['enabled']) return;
    $dir = $cacheConfig['storage_dir'] ?? sys_get_temp_dir() . '/ojs_api_cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents($dir . '/' . $key . '.json', $data, LOCK_EX);
}

// ─── Input Validation Helpers ───────────────────────────────────────
function validatePositiveInt(string $paramName): ?int {
    $value = $_GET[$paramName] ?? null;
    if ($value === null) return null;
    $value = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($value === false) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Invalid parameter: {$paramName} must be a positive integer",
            'code' => 'INVALID_PARAM',
        ]);
        exit;
    }
    return (int) $value;
}

function requirePositiveInt(string $paramName): int {
    $value = validatePositiveInt($paramName);
    if ($value === null) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Missing required parameter: {$paramName}",
            'code' => 'MISSING_PARAM',
        ]);
        exit;
    }
    return $value;
}

function validateString(string $paramName, int $maxLength = 100): ?string {
    $value = $_GET[$paramName] ?? null;
    if ($value === null) return null;
    $value = trim($value);
    if (strlen($value) > $maxLength || strlen($value) === 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Invalid parameter: {$paramName}",
            'code' => 'INVALID_PARAM',
        ]);
        exit;
    }
    return $value;
}

// ─── Database Connection (PDO) ──────────────────────────────────────
function getDbConnection(array $dbConfig): PDO {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'] ?? 3306,
        $dbConfig['name'],
        $dbConfig['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4'",
    ]);

    return $pdo;
}

// ─── Response Helpers ───────────────────────────────────────────────
function sendSuccess(array $data, int $count = null, bool $cached = false): void {
    $response = [
        'success' => true,
        'data' => $data,
        'count' => $count ?? count($data),
        'cached' => $cached,
        'timestamp' => gmdate('c'),
    ];
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function sendError(string $message, string $code, int $httpCode = 500): void {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'code' => $code,
    ]);
    exit;
}

// ─── Route Handlers ─────────────────────────────────────────────────
try {
    $pdo = getDbConnection($config['db']);
} catch (PDOException $e) {
    // Health check should still work even if DB is down
    if ($action === 'health') {
        echo json_encode([
            'success' => true,
            'data' => [
                'status' => 'error',
                'database' => false,
                'error' => 'Database connection failed',
                'php_version' => PHP_VERSION,
            ],
            'count' => 1,
            'cached' => false,
            'timestamp' => gmdate('c'),
        ]);
        exit;
    }
    sendError('Database connection failed', 'DB_ERROR');
}

switch ($action) {

    // ── GET ?action=health ──────────────────────────────────────────
    case 'health':
        try {
            $stmt = $pdo->query('SELECT 1');
            echo json_encode([
                'success' => true,
                'data' => [
                    'status' => 'ok',
                    'database' => true,
                    'php_version' => PHP_VERSION,
                    'server_time' => gmdate('c'),
                ],
                'count' => 1,
                'cached' => false,
                'timestamp' => gmdate('c'),
            ]);
        } catch (PDOException $e) {
            sendError('Health check failed', 'HEALTH_ERROR', 503);
        }
        break;

    // ── GET ?action=journals ────────────────────────────────────────
    case 'journals':
        $cacheKey = getCacheKey('journals', []);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT
                j.journal_id,
                j.path,
                j.primary_locale,
                j.enabled,
                j.seq,
                js_name.setting_value AS name,
                js_desc.setting_value AS description,
                js_abbrev.setting_value AS abbreviation,
                js_thumb.setting_value AS thumbnail
            FROM journals j
            LEFT JOIN journal_settings js_name
                ON js_name.journal_id = j.journal_id
                AND js_name.setting_name = 'name'
                AND js_name.locale = j.primary_locale
            LEFT JOIN journal_settings js_desc
                ON js_desc.journal_id = j.journal_id
                AND js_desc.setting_name = 'description'
                AND js_desc.locale = j.primary_locale
            LEFT JOIN journal_settings js_abbrev
                ON js_abbrev.journal_id = j.journal_id
                AND js_abbrev.setting_name = 'acronym'
                AND js_abbrev.locale = j.primary_locale
            LEFT JOIN journal_settings js_thumb
                ON js_thumb.journal_id = j.journal_id
                AND js_thumb.setting_name = 'journalThumbnail'
                AND js_thumb.locale = j.primary_locale
            WHERE j.enabled = 1
            ORDER BY j.seq ASC
        ");
        $stmt->execute();
        $journals = [];

        while ($row = $stmt->fetch()) {
            $journals[] = [
                'journal_id'     => (int) $row['journal_id'],
                'path'           => $row['path'],
                'primary_locale' => $row['primary_locale'],
                'enabled'        => (bool) $row['enabled'],
                'name'           => $row['name'],
                'description'    => $row['description'],
                'abbreviation'   => $row['abbreviation'],
                'thumbnail'      => $row['thumbnail'],
            ];
        }

        $response = json_encode([
            'success' => true,
            'data' => $journals,
            'count' => count($journals),
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    // ── GET ?action=journal&id={journal_id} ─────────────────────────
    case 'journal':
        $journalId = requirePositiveInt('id');

        $cacheKey = getCacheKey('journal', ['id' => $journalId]);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        // Fetch journal base info
        $stmt = $pdo->prepare("
            SELECT journal_id, path, primary_locale, enabled, seq, current_issue_id
            FROM journals
            WHERE journal_id = :id AND enabled = 1
        ");
        $stmt->execute([':id' => $journalId]);
        $journal = $stmt->fetch();

        if (!$journal) {
            sendError('Journal not found', 'NOT_FOUND', 404);
        }

        // Fetch all settings for this journal in its primary locale
        $stmt = $pdo->prepare("
            SELECT setting_name, setting_value
            FROM journal_settings
            WHERE journal_id = :id
              AND (locale = :locale OR locale = '')
        ");
        $stmt->execute([':id' => $journalId, ':locale' => $journal['primary_locale']]);
        $settings = [];
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_name']] = $row['setting_value'];
        }

        // Fetch sections for this journal
        $stmt = $pdo->prepare("
            SELECT s.section_id, s.seq,
                   ss_title.setting_value AS title,
                   ss_policy.setting_value AS policy
            FROM sections s
            LEFT JOIN section_settings ss_title
                ON ss_title.section_id = s.section_id
                AND ss_title.setting_name = 'title'
                AND ss_title.locale = :locale
            LEFT JOIN section_settings ss_policy
                ON ss_policy.section_id = s.section_id
                AND ss_policy.setting_name = 'policy'
                AND ss_policy.locale = :locale2
            WHERE s.journal_id = :id AND s.is_inactive = 0
            ORDER BY s.seq ASC
        ");
        $stmt->execute([':id' => $journalId, ':locale' => $journal['primary_locale'], ':locale2' => $journal['primary_locale']]);
        $sections = $stmt->fetchAll();

        // Safe setting extraction (only expose non-sensitive settings)
        $safeSettings = [
            'name', 'acronym', 'description', 'about',
            'authorGuidelines', 'contactEmail', 'contactName',
            'contactPhone', 'mailingAddress', 'onlineIssn', 'printIssn',
            'publisherInstitution', 'supportEmail', 'supportName',
            'journalThumbnail', 'homepageImage', 'pageHeaderLogoImage',
        ];
        $filteredSettings = [];
        foreach ($safeSettings as $key) {
            if (isset($settings[$key])) {
                $filteredSettings[$key] = $settings[$key];
            }
        }

        $result = [
            'journal_id'       => (int) $journal['journal_id'],
            'path'             => $journal['path'],
            'primary_locale'   => $journal['primary_locale'],
            'enabled'          => (bool) $journal['enabled'],
            'current_issue_id' => $journal['current_issue_id'] ? (int) $journal['current_issue_id'] : null,
            'settings'         => $filteredSettings,
            'sections'         => array_map(function ($s) {
                return [
                    'section_id' => (int) $s['section_id'],
                    'title'      => $s['title'],
                    'policy'     => $s['policy'],
                ];
            }, $sections),
        ];

        $response = json_encode([
            'success' => true,
            'data' => $result,
            'count' => 1,
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    // ── GET ?action=submissions&journal_id={id}&status={status}&limit={n}&offset={n} ──
    case 'submissions':
        $journalId = requirePositiveInt('journal_id');
        $limit = validatePositiveInt('limit') ?? 20;
        $offset = validatePositiveInt('offset') ?? 0;
        $offset = max(0, $offset - 1); // Convert 1-based to 0-based if provided
        if ($limit > 100) $limit = 100; // Cap at 100

        $statusFilter = validateString('status', 20);
        $validStatuses = ['queued', 'published', 'declined', 'all'];
        if ($statusFilter !== null && !in_array($statusFilter, $validStatuses, true)) {
            sendError("Invalid status. Allowed: " . implode(', ', $validStatuses), 'INVALID_PARAM', 400);
        }

        $cacheKey = getCacheKey('submissions', [
            'journal_id' => $journalId,
            'status' => $statusFilter,
            'limit' => $limit,
            'offset' => $offset,
        ]);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        // Map status string to OJS status codes
        // OJS status: 1 = STATUS_QUEUED, 3 = STATUS_PUBLISHED, 4 = STATUS_DECLINED
        $statusCondition = '';
        $params = [':journal_id' => $journalId, ':limit' => $limit, ':offset' => $offset];

        if ($statusFilter && $statusFilter !== 'all') {
            $statusMap = ['queued' => 1, 'published' => 3, 'declined' => 4];
            $statusCondition = 'AND s.status = :status';
            $params[':status'] = $statusMap[$statusFilter];
        }

        $sql = "
            SELECT
                s.submission_id,
                s.context_id,
                s.date_submitted,
                s.date_last_activity,
                s.last_modified,
                s.stage_id,
                s.status,
                s.locale,
                s.submission_progress,
                p.publication_id,
                p.date_published,
                p.version AS publication_version,
                p.status AS publication_status,
                ps_title.setting_value AS title,
                ps_abstract.setting_value AS abstract
            FROM submissions s
            LEFT JOIN publications p 
                ON p.publication_id = s.current_publication_id
            LEFT JOIN publication_settings ps_title
                ON ps_title.publication_id = p.publication_id
                AND ps_title.setting_name = 'title'
                AND ps_title.locale = COALESCE(s.locale, 'en')
            LEFT JOIN publication_settings ps_abstract
                ON ps_abstract.publication_id = p.publication_id
                AND ps_abstract.setting_name = 'abstract'
                AND ps_abstract.locale = COALESCE(s.locale, 'en')
            WHERE s.context_id = :journal_id
            {$statusCondition}
            ORDER BY s.date_last_activity DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        $submissions = [];

        while ($row = $stmt->fetch()) {
            $submissions[] = [
                'submission_id'      => (int) $row['submission_id'],
                'journal_id'         => (int) $row['context_id'],
                'date_submitted'     => $row['date_submitted'],
                'date_last_activity' => $row['date_last_activity'],
                'stage_id'           => (int) $row['stage_id'],
                'status'             => (int) $row['status'],
                'locale'             => $row['locale'],
                'submission_progress'=> $row['submission_progress'],
                'title'              => $row['title'],
                'abstract'           => $row['abstract'],
                'publication_id'     => $row['publication_id'] ? (int) $row['publication_id'] : null,
                'date_published'     => $row['date_published'],
            ];
        }

        // Get total count
        $countSql = "
            SELECT COUNT(*) as total
            FROM submissions s
            WHERE s.context_id = :journal_id
            {$statusCondition}
        ";
        $countParams = [':journal_id' => $journalId];
        if (isset($params[':status'])) {
            $countParams[':status'] = $params[':status'];
        }
        $countStmt = $pdo->prepare($countSql);
        foreach ($countParams as $key => $val) {
            $countStmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $response = json_encode([
            'success' => true,
            'data' => $submissions,
            'count' => count($submissions),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    // ── GET ?action=submission&id={submission_id} ───────────────────
    case 'submission':
        $submissionId = requirePositiveInt('id');

        $cacheKey = getCacheKey('submission', ['id' => $submissionId]);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        // Fetch submission
        $stmt = $pdo->prepare("
            SELECT s.*, p.publication_id, p.date_published, p.section_id,
                   p.version AS pub_version, p.status AS pub_status, p.doi_id,
                   p.issue_id
            FROM submissions s
            LEFT JOIN publications p ON p.publication_id = s.current_publication_id
            WHERE s.submission_id = :id
        ");
        $stmt->execute([':id' => $submissionId]);
        $sub = $stmt->fetch();

        if (!$sub) {
            sendError('Submission not found', 'NOT_FOUND', 404);
        }

        // Fetch publication title and abstract
        $pubSettings = [];
        if ($sub['publication_id']) {
            $stmt = $pdo->prepare("
                SELECT setting_name, setting_value, locale
                FROM publication_settings
                WHERE publication_id = :pub_id
                  AND setting_name IN ('title', 'abstract', 'keywords', 'copyrightHolder', 'copyrightYear')
            ");
            $stmt->execute([':pub_id' => $sub['publication_id']]);
            while ($row = $stmt->fetch()) {
                $pubSettings[$row['setting_name']][$row['locale'] ?: 'default'] = $row['setting_value'];
            }
        }

        // Fetch authors
        $authors = [];
        if ($sub['publication_id']) {
            $stmt = $pdo->prepare("
                SELECT a.author_id, a.email, a.seq,
                       as_given.setting_value AS given_name,
                       as_family.setting_value AS family_name,
                       as_affil.setting_value AS affiliation
                FROM authors a
                LEFT JOIN author_settings as_given
                    ON as_given.author_id = a.author_id
                    AND as_given.setting_name = 'givenName'
                    AND as_given.locale = COALESCE(:locale, 'en')
                LEFT JOIN author_settings as_family
                    ON as_family.author_id = a.author_id
                    AND as_family.setting_name = 'familyName'
                    AND as_family.locale = COALESCE(:locale2, 'en')
                LEFT JOIN author_settings as_affil
                    ON as_affil.author_id = a.author_id
                    AND as_affil.setting_name = 'affiliation'
                    AND as_affil.locale = COALESCE(:locale3, 'en')
                WHERE a.publication_id = :pub_id
                ORDER BY a.seq ASC
            ");
            $stmt->execute([
                ':pub_id' => $sub['publication_id'],
                ':locale' => $sub['locale'] ?: 'en',
                ':locale2' => $sub['locale'] ?: 'en',
                ':locale3' => $sub['locale'] ?: 'en',
            ]);
            while ($row = $stmt->fetch()) {
                $authors[] = [
                    'author_id'   => (int) $row['author_id'],
                    'given_name'  => $row['given_name'],
                    'family_name' => $row['family_name'],
                    'email'       => $row['email'],
                    'affiliation' => $row['affiliation'],
                    'seq'         => (float) $row['seq'],
                ];
            }
        }

        // Fetch review assignments
        $stmt = $pdo->prepare("
            SELECT review_id, reviewer_id, recommendation, 
                   date_assigned, date_completed, date_due,
                   declined, cancelled, round, stage_id, review_method
            FROM review_assignments
            WHERE submission_id = :id
            ORDER BY round ASC, date_assigned ASC
        ");
        $stmt->execute([':id' => $submissionId]);
        $reviews = [];
        while ($row = $stmt->fetch()) {
            $reviews[] = [
                'review_id'      => (int) $row['review_id'],
                'reviewer_id'    => (int) $row['reviewer_id'],
                'recommendation' => $row['recommendation'] !== null ? (int) $row['recommendation'] : null,
                'date_assigned'  => $row['date_assigned'],
                'date_completed' => $row['date_completed'],
                'date_due'       => $row['date_due'],
                'declined'       => (bool) $row['declined'],
                'cancelled'      => (bool) $row['cancelled'],
                'round'          => (int) $row['round'],
                'stage_id'       => (int) $row['stage_id'],
                'review_method'  => (int) $row['review_method'],
            ];
        }

        // Fetch editorial decisions
        $stmt = $pdo->prepare("
            SELECT edit_decision_id, editor_id, decision, date_decided, round, stage_id
            FROM edit_decisions
            WHERE submission_id = :id
            ORDER BY date_decided ASC
        ");
        $stmt->execute([':id' => $submissionId]);
        $decisions = $stmt->fetchAll();

        $locale = $sub['locale'] ?: 'en';
        $result = [
            'submission_id'      => (int) $sub['submission_id'],
            'journal_id'         => (int) $sub['context_id'],
            'date_submitted'     => $sub['date_submitted'],
            'date_last_activity' => $sub['date_last_activity'],
            'stage_id'           => (int) $sub['stage_id'],
            'status'             => (int) $sub['status'],
            'locale'             => $locale,
            'submission_progress'=> $sub['submission_progress'],
            'title'              => $pubSettings['title'][$locale] ?? $pubSettings['title']['default'] ?? null,
            'abstract'           => $pubSettings['abstract'][$locale] ?? $pubSettings['abstract']['default'] ?? null,
            'publication' => $sub['publication_id'] ? [
                'publication_id' => (int) $sub['publication_id'],
                'date_published' => $sub['date_published'],
                'version'        => $sub['pub_version'] ? (int) $sub['pub_version'] : null,
                'status'         => (int) $sub['pub_status'],
                'issue_id'       => $sub['issue_id'] ? (int) $sub['issue_id'] : null,
            ] : null,
            'authors' => $authors,
            'reviews' => $reviews,
            'decisions' => array_map(function ($d) {
                return [
                    'decision_id'  => (int) $d['edit_decision_id'],
                    'editor_id'    => (int) $d['editor_id'],
                    'decision'     => (int) $d['decision'],
                    'date_decided' => $d['date_decided'],
                    'round'        => $d['round'] !== null ? (int) $d['round'] : null,
                    'stage_id'     => $d['stage_id'] !== null ? (int) $d['stage_id'] : null,
                ];
            }, $decisions),
        ];

        $response = json_encode([
            'success' => true,
            'data' => $result,
            'count' => 1,
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    // ── GET ?action=issues&journal_id={id} ──────────────────────────
    case 'issues':
        $journalId = requirePositiveInt('journal_id');
        $limit = validatePositiveInt('limit') ?? 20;
        if ($limit > 100) $limit = 100;
        $offset = validatePositiveInt('offset') ?? 0;
        if ($offset > 0) $offset--;

        $cacheKey = getCacheKey('issues', ['journal_id' => $journalId, 'limit' => $limit, 'offset' => $offset]);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT i.issue_id, i.volume, i.number, i.year,
                   i.published, i.date_published, i.access_status,
                   i.show_volume, i.show_number, i.show_year, i.show_title,
                   is_title.setting_value AS title,
                   is_desc.setting_value AS description
            FROM issues i
            LEFT JOIN issue_settings is_title
                ON is_title.issue_id = i.issue_id
                AND is_title.setting_name = 'title'
                AND is_title.locale = (SELECT primary_locale FROM journals WHERE journal_id = :journal_id_locale LIMIT 1)
            LEFT JOIN issue_settings is_desc
                ON is_desc.issue_id = i.issue_id
                AND is_desc.setting_name = 'description'
                AND is_desc.locale = (SELECT primary_locale FROM journals WHERE journal_id = :journal_id_locale2 LIMIT 1)
            WHERE i.journal_id = :journal_id
              AND i.published = 1
            ORDER BY i.date_published DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':journal_id', $journalId, PDO::PARAM_INT);
        $stmt->bindValue(':journal_id_locale', $journalId, PDO::PARAM_INT);
        $stmt->bindValue(':journal_id_locale2', $journalId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $issues = [];
        while ($row = $stmt->fetch()) {
            $issues[] = [
                'issue_id'       => (int) $row['issue_id'],
                'volume'         => $row['volume'] !== null ? (int) $row['volume'] : null,
                'number'         => $row['number'],
                'year'           => $row['year'] !== null ? (int) $row['year'] : null,
                'published'      => (bool) $row['published'],
                'date_published' => $row['date_published'],
                'access_status'  => (int) $row['access_status'],
                'title'          => $row['title'],
                'description'    => $row['description'],
            ];
        }

        $response = json_encode([
            'success' => true,
            'data' => $issues,
            'count' => count($issues),
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    // ── GET ?action=stats ───────────────────────────────────────────
    case 'stats':
        $cacheKey = getCacheKey('stats', []);
        $cached = getFromCache($cacheKey, $cacheConfig);
        if ($cached !== null) {
            echo $cached;
            exit;
        }

        // Active journals count
        $journalCount = (int) $pdo->query("SELECT COUNT(*) FROM journals WHERE enabled = 1")->fetchColumn();

        // Submissions counts by status
        $submissionStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS published,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS queued,
                SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) AS declined
            FROM submissions
        ");
        $submissionStats = $submissionStmt->fetch();

        // Total registered users
        $userCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE disabled = 0")->fetchColumn();

        // Total published issues
        $issueCount = (int) $pdo->query("SELECT COUNT(*) FROM issues WHERE published = 1")->fetchColumn();

        // Distinct authors
        $authorCount = (int) $pdo->query("SELECT COUNT(DISTINCT email) FROM authors")->fetchColumn();

        // Distinct user countries
        $countryCount = (int) $pdo->query("SELECT COUNT(DISTINCT country) FROM users WHERE country IS NOT NULL AND country != ''")->fetchColumn();

        $stats = [
            'active_journals'        => $journalCount,
            'total_submissions'      => (int) $submissionStats['total'],
            'published_submissions'  => (int) $submissionStats['published'],
            'queued_submissions'     => (int) $submissionStats['queued'],
            'declined_submissions'   => (int) $submissionStats['declined'],
            'published_issues'       => $issueCount,
            'registered_users'       => $userCount,
            'distinct_authors'       => $authorCount,
            'countries_represented'  => $countryCount,
        ];

        $response = json_encode([
            'success' => true,
            'data' => $stats,
            'count' => 1,
            'cached' => false,
            'timestamp' => gmdate('c'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        setCache($cacheKey, $response, $cacheConfig);
        echo $response;
        break;

    default:
        sendError("Unknown action: {$action}", 'INVALID_ACTION', 400);
        break;
}
