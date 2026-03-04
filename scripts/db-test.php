<?php
/**
 * OJS Database Connection Test
 * 
 * Upload this file to your SiteGround public_html directory,
 * access via browser, then DELETE IT immediately after testing.
 * 
 * URL: https://your-domain.com/db-test.php
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

// ─── Credentials ────────────────────────────────────────────────────────
// IMPORTANT: Delete this file from the server after testing!
$DB_HOST     = 'localhost';  // 'localhost' when running ON SiteGround itself
$DB_PORT     = 3306;
$DB_NAME     = 'dbkgvcunttgs97';
$DB_USER     = 'ua9oxq3q2pzvz';
$DB_PASSWORD = '32FFb#1449LF';
$DB_CHARSET  = 'utf8mb4';
$TIMEOUT_SEC = 10;

// ─── Result template ────────────────────────────────────────────────────

$result = [
    'timestamp'   => date('c'),
    'host_used'   => $DB_HOST,
    'connection'  => false,
    'auth'        => false,
    'db_selected' => false,
    'query'       => false,
    'error'       => null,
    'error_code'  => null,
    'db_version'  => null,
    'server_ip'   => $_SERVER['SERVER_ADDR'] ?? 'unknown',
    'php_version' => phpversion(),
];

// ─── Connection Test ────────────────────────────────────────────────────

try {
    // Initialize MySQLi with timeout
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    
    $mysqli = mysqli_init();
    $mysqli->options(MYSQLI_OPT_CONNECT_TIMEOUT, $TIMEOUT_SEC);
    
    // Attempt connection
    $connected = @$mysqli->real_connect(
        $DB_HOST,
        $DB_USER,
        $DB_PASSWORD,
        $DB_NAME,
        $DB_PORT
    );
    
    if (!$connected) {
        throw new Exception($mysqli->connect_error, $mysqli->connect_errno);
    }
    
    $result['connection'] = true;
    $result['auth'] = true;
    $result['db_selected'] = true;
    
    // Set charset
    $mysqli->set_charset($DB_CHARSET);
    
    // Test basic query
    $test = $mysqli->query('SELECT 1 AS test');
    if ($test && $test->fetch_assoc()['test'] == 1) {
        $result['query'] = true;
    }
    
    // Get version
    $version = $mysqli->query('SELECT VERSION() AS version');
    if ($version) {
        $result['db_version'] = $version->fetch_assoc()['version'];
    }
    
    // Test OJS tables
    $tables = $mysqli->query("SHOW TABLES LIKE 'journals'");
    $result['ojs_tables_exist'] = ($tables && $tables->num_rows > 0);
    
    if ($result['ojs_tables_exist']) {
        $count = $mysqli->query('SELECT COUNT(*) AS cnt FROM journals');
        $result['journals_count'] = (int)$count->fetch_assoc()['cnt'];
    }
    
    $mysqli->close();
    
} catch (Exception $e) {
    $code = $e->getCode();
    $msg  = $e->getMessage();
    
    $result['error_code'] = $code;
    
    // Classify the error without exposing credentials
    switch (true) {
        case $code === 1045:
            $result['error'] = 'Access denied — wrong credentials or IP not whitelisted';
            $result['auth'] = false;
            break;
        case $code === 1049:
            $result['error'] = 'Unknown database — check database name';
            $result['connection'] = true;
            $result['auth'] = true;
            break;
        case $code === 2002:
            $result['error'] = 'Connection refused — MySQL not running or wrong host/port';
            break;
        case $code === 2006:
            $result['error'] = 'Server gone — connection lost during handshake';
            break;
        case stripos($msg, 'timed out') !== false:
            $result['error'] = 'Connection timed out — port blocked or host unreachable';
            break;
        default:
            // Sanitize: remove credentials from error message
            $sanitized = str_replace([$DB_PASSWORD, $DB_USER], ['****', '****'], $msg);
            $result['error'] = $sanitized;
    }
}

// ─── Output ─────────────────────────────────────────────────────────────

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
