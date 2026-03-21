<?php
/**
 * OJS User Provisioning Bridge for Digitopub
 *
 * Target Deployment: submitmanager.com (OJS Instance)
 *
 * INSTRUCTIONS:
 * 1. Upload this script (`ojs-user-bridge.php`) to the ROOT directory of the `submitmanager.com` OJS installation.
 *    (It MUST sit next to OJS's `index.php`, `config.inc.php`, and `sso_login.php`).
 * 2. Set the OJS_API_KEY environment variable on BOTH the OJS server and the Next.js server to the same secret.
 * 3. Ensure the server's firewall allows inbound HTTPS requests from the Next.js API host.
 *
 * Security: This script uses Bearer token authentication. All requests must include:
 *   Authorization: Bearer <OJS_API_KEY>
 *
 * @module scripts/ojs-user-bridge
 */

// --- CONFIGURATION ---
$isDev = getenv('APP_ENV') === 'development';
ini_set('display_errors', $isDev ? '1' : '0');
ini_set('display_startup_errors', $isDev ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

// --- OJS Role ID Constants (from PKP\security\Role) ---
define('ROLE_ID_SITE_ADMIN', 1);
define('ROLE_ID_MANAGER', 16);
define('ROLE_ID_SUB_EDITOR', 17);
define('ROLE_ID_ASSISTANT', 4097);
define('ROLE_ID_REVIEWER', 4096);
define('ROLE_ID_AUTHOR', 65536);
define('ROLE_ID_READER', 1048576);

// Map Digitopub roles to OJS role_ids
$ROLE_MAP = [
    'author'   => ROLE_ID_AUTHOR,
    'reviewer' => ROLE_ID_REVIEWER,
    'editor'   => ROLE_ID_SUB_EDITOR,
    'reader'   => ROLE_ID_READER,
];

// --- REQUEST VALIDATION ---

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Validate Bearer token
$apiKey = 'G5XqDrwkSqLD]$v3dbPvMbP5.$X],GeY';
if (empty($apiKey)) {
    error_log('[OJS-Bridge] FATAL: OJS_API_KEY environment variable is not set.');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server misconfiguration']);
    exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid Authorization header']);
    exit;
}

if (!hash_equals($apiKey, $matches[1])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid API key']);
    exit;
}

// --- PARSE & VALIDATE PAYLOAD ---
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

$email     = trim($payload['email'] ?? '');
$firstName = trim($payload['firstName'] ?? '');
$lastName  = trim($payload['lastName'] ?? '');
$country   = trim($payload['country'] ?? '');
$affiliation = trim($payload['affiliation'] ?? '');
$biography = trim($payload['biography'] ?? '');
$orcid     = trim($payload['orcid'] ?? '');
$password    = $payload['password'] ?? null; // Optional: raw password from registration
$role        = strtolower(trim($payload['primaryRole'] ?? 'author'));
$journalPath = trim($payload['journalPath'] ?? '');

if (empty($email) || empty($firstName) || empty($lastName)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields: email, firstName, lastName']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email address']);
    exit;
}

// --- DATABASE CONNECTION (use OJS config.inc.php) ---
$configFile = dirname(__FILE__) . '/config.inc.php';
if (!file_exists($configFile)) {
    error_log('[OJS-Bridge] FATAL: config.inc.php not found. Script must be in OJS root.');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'OJS configuration not found']);
    exit;
}

// Parse OJS config.inc.php to extract DB credentials
$config = parse_ini_file($configFile, true);
if (!$config || empty($config['database'])) {
    error_log('[OJS-Bridge] FATAL: Failed to parse config.inc.php or [database] section missing.');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'OJS database configuration error']);
    exit;
}

$dbConfig = $config['database'];
$dbHost = $dbConfig['host'] ?? 'localhost';
$dbPort = intval($dbConfig['port'] ?? 3306);
$dbName = $dbConfig['name'] ?? '';
$dbUser = $dbConfig['username'] ?? '';
$dbPass = $dbConfig['password'] ?? '';

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    error_log('[OJS-Bridge] DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// --- CHECK FOR EXISTING USER ---
$stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ?');
$stmt->execute([$email]);
$existingUser = $stmt->fetch();

if ($existingUser) {
    // User already exists — return 409 Conflict (idempotent success for the caller)
    http_response_code(409);
    echo json_encode([
        'success' => true,
        'message' => 'User already exists in OJS',
        'user_id' => (int)$existingUser['user_id'],
    ]);
    exit;
}

// --- GENERATE USERNAME ---
// OJS requires a unique username (max 32 chars). Derive from email prefix.
$baseUsername = preg_replace('/[^a-z0-9_]/', '', strtolower(explode('@', $email)[0]));
$baseUsername = substr($baseUsername, 0, 28); // Leave room for suffix
if (empty($baseUsername)) {
    $baseUsername = 'user';
}

$username = $baseUsername;
$suffix = 1;
$stmtCheck = $pdo->prepare('SELECT user_id FROM users WHERE username = ?');
while (true) {
    $stmtCheck->execute([$username]);
    if (!$stmtCheck->fetch()) break;
    $username = $baseUsername . $suffix;
    $suffix++;
    if ($suffix > 999) {
        // Extremely unlikely but prevent infinite loops
        $username = $baseUsername . '_' . bin2hex(random_bytes(3));
        break;
    }
}

// --- GENERATE PASSWORD HASH ---
// OJS 3.4 uses bcrypt (PASSWORD_BCRYPT) via PHP's password_hash()
if (!empty($password)) {
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
} else {
    // Generate a random password — user will authenticate via SSO, not direct OJS login
    $randomPass = bin2hex(random_bytes(16));
    $passwordHash = password_hash($randomPass, PASSWORD_BCRYPT);
}

// --- INSERT USER (TRANSACTION) ---
try {
    $pdo->beginTransaction();

    // 1. Insert into users table
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare('
        INSERT INTO users (username, password, email, country, locales, date_registered, date_validated, disabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ');
    $stmt->execute([
        $username,
        $passwordHash,
        $email,
        $country ?: null,
        '["en"]',  // Default locale
        $now,
        $now,      // Mark as validated (they registered via Digitopub)
    ]);

    $userId = (int)$pdo->lastInsertId();

    // 2. Insert user_settings (localized profile data)
    $locale = 'en';
    $settings = [
        ['givenName', $firstName],
        ['familyName', $lastName],
    ];

    if (!empty($affiliation)) {
        $settings[] = ['affiliation', $affiliation];
    }
    if (!empty($biography)) {
        $settings[] = ['biography', $biography];
    }
    if (!empty($orcid)) {
        // ORCID is stored as a non-localized setting (empty locale)
        $stmtSetting = $pdo->prepare('
            INSERT INTO user_settings (user_id, locale, setting_name, setting_value)
            VALUES (?, \'\', ?, ?)
        ');
        $stmtSetting->execute([$userId, 'orcid', $orcid]);
    }

    $stmtSetting = $pdo->prepare('
        INSERT INTO user_settings (user_id, locale, setting_name, setting_value)
        VALUES (?, ?, ?, ?)
    ');
    foreach ($settings as [$name, $value]) {
        $stmtSetting->execute([$userId, $locale, $name, $value]);
    }

    // 3. Assign role via user_user_groups
    // Look up the target context_id (journal_id)
    $contextId = null;
    if (!empty($journalPath)) {
        $stmtJournal = $pdo->prepare('SELECT journal_id FROM journals WHERE path = ? LIMIT 1');
        $stmtJournal->execute([$journalPath]);
        $journal = $stmtJournal->fetch();
        if ($journal) {
            $contextId = (int)$journal['journal_id'];
        }
    }

    // Fallback to first available journal if journalPath not found or empty
    if (!$contextId) {
        $stmtFirst = $pdo->query('SELECT journal_id FROM journals ORDER BY journal_id ASC LIMIT 1');
        $first = $stmtFirst->fetch();
        if ($first) {
            $contextId = (int)$first['journal_id'];
        } else {
            $contextId = 1; // absolute fallback
        }
    }

    $targetRoleId = $ROLE_MAP[$role] ?? ROLE_ID_AUTHOR;

    $stmtGroups = $pdo->prepare('
        SELECT user_group_id FROM user_groups
        WHERE role_id = ? AND context_id = ? AND is_default = 1
        LIMIT 1
    ');
    $stmtGroups->execute([$targetRoleId, $contextId]);
    $userGroup = $stmtGroups->fetch();

    if (!$userGroup) {
        // Fallback: find any group with this role in this context
        $stmtGroups = $pdo->prepare('
            SELECT user_group_id FROM user_groups WHERE role_id = ? AND context_id = ? LIMIT 1
        ');
        $stmtGroups->execute([$targetRoleId, $contextId]);
        $userGroup = $stmtGroups->fetch();
    }

    if ($userGroup) {
        $stmtAssign = $pdo->prepare('
            INSERT INTO user_user_groups (user_group_id, user_id, date_start)
            VALUES (?, ?, ?)
        ');
        $stmtAssign->execute([(int)$userGroup['user_group_id'], $userId, $now]);
    } else {
        error_log("[OJS-Bridge] WARNING: No user_group found for role_id={$targetRoleId}. User {$email} created without role assignment.");
    }

    // Also assign Reader role by default (so user can browse content)
    if ($targetRoleId !== ROLE_ID_READER) {
        $stmtReader = $pdo->prepare('
            SELECT user_group_id FROM user_groups WHERE role_id = ? AND context_id = ? LIMIT 1
        ');
        $stmtReader->execute([ROLE_ID_READER, $contextId]);
        $readerGroup = $stmtReader->fetch();

        if ($readerGroup) {
            $stmtAssign = $pdo->prepare('
                INSERT INTO user_user_groups (user_group_id, user_id, date_start)
                VALUES (?, ?, ?)
            ');
            $stmtAssign->execute([(int)$readerGroup['user_group_id'], $userId, $now]);
        }
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User provisioned successfully',
        'user_id' => $userId,
        'username' => $username,
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();

    // Handle race condition: if someone inserted the same email between our check and insert
    if ($e->getCode() == '23000' && strpos($e->getMessage(), 'Duplicate entry') !== false) {
        http_response_code(409);
        echo json_encode(['success' => true, 'message' => 'User already exists (race condition resolved)']);
        exit;
    }

    error_log('[OJS-Bridge] Insert failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to provision user']);
    exit;
}
