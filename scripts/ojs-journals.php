<?php
/**
 * OJS Journals API Proxy
 * 
 * This script runs on SiteGround alongside the OJS database.
 * It connects as localhost (no Remote MySQL needed) and serves
 * journal data as JSON for the DigitoPub Node.js application.
 * 
 * Deploy to: SiteGround public_html/api/ojs-journals.php
 * Endpoint:  https://submitmanager.com/api/ojs-journals.php
 * 
 * Security: Protected by a shared secret token (API_KEY).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: public, max-age=300'); // Cache for 5 minutes

// ─── Configuration ──────────────────────────────────────────────────

$API_KEY     = 'dgtpub_ojs_2026_k9x7m4'; // Change this and match in .env
$DB_HOST     = 'localhost';
$DB_PORT     = 3306;
$DB_NAME     = 'dbkgvcunttgs97';
$DB_USER     = 'ua9oxq3q2pzvz';
$DB_PASSWORD = '32FFb#1449LF';

// ─── Auth Check ─────────────────────────────────────────────────────

$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['key'] ?? '');

if ($providedKey !== $API_KEY) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// ─── Database Connection ────────────────────────────────────────────

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    
    $mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASSWORD, $DB_NAME, $DB_PORT);
    $mysqli->set_charset('utf8mb4');
    
    // Fetch active journals with names and descriptions
    $query = "
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
    ";
    
    $result = $mysqli->query($query);
    $journals = [];
    
    while ($row = $result->fetch_assoc()) {
        $journals[] = [
            'journal_id' => (int) $row['journal_id'],
            'path'       => $row['path'],
            'primary_locale' => $row['primary_locale'],
            'enabled'    => (bool) $row['enabled'],
            'name'       => $row['name'],
            'description'=> $row['description'],
        ];
    }
    
    $mysqli->close();
    
    echo json_encode([
        'success' => true,
        'data'    => $journals,
        'count'   => count($journals),
        'cached_until' => date('c', time() + 300),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database query failed',
    ]);
}
