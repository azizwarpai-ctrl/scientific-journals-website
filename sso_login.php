<?php
/**
 * OJS SSO Receiver Script for Digitopub
 * 
 * Target Deployment: submitmanager.com (OJS Instance)
 * 
 * INSTRUCTIONS:
 * 1. Upload this finalized script (`sso_login.php`) to the ROOT directory of the `submitmanager.com` OJS installation.
 *    (It MUST sit next to OJS's `index.php` and `config.inc.php`).
 * 2. Ensure DIGITOPUB_BASE_URL (the Next.js main API) is configured correctly in the server environment.
 * 3. Ensure the server's firewall allows outbound HTTPS cURL requests back to the Next.js API for token validation.
 */

// --- CONFIGURATION ---
$envBaseUrl = getenv('DIGITOPUB_BASE_URL') ?: ($_ENV['DIGITOPUB_BASE_URL'] ?? 'http://localhost:3000');
$parsedUrl = parse_url($envBaseUrl);
$host = $parsedUrl['host'] ?? '';
$isLocalhost = in_array($host, ['localhost', '127.0.0.1', '::1']);

if (!$isLocalhost && ($parsedUrl['scheme'] ?? '') !== 'https') {
    die("Error: DIGITOPUB_BASE_URL must use HTTPS in non-development environments to secure SSO tokens.");
}
define('DIGITOPUB_BASE_URL', rtrim($envBaseUrl, '/'));
// ---------------------

// Basic error reporting
$isDev = getenv('APP_ENV') === 'development' || $isLocalhost;
ini_set('display_errors', $isDev ? '1' : '0');
ini_set('display_startup_errors', $isDev ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Bootstrap OJS framework securely
$bootstrapFile = dirname(__FILE__) . '/lib/pkp/includes/bootstrap.inc.php';
if (!file_exists($bootstrapFile)) {
    die("Error: OJS bootstrap file not found. Ensure this script is in the OJS root directory.");
}
require($bootstrapFile);

// Parse input
$token = $_GET['token'] ?? null;
$redirect = $_GET['redirect'] ?? '/index.php/index/submission/wizard';

// Validate $redirect to prevent open redirects
// Only allow relative paths starting with a single slash, filtering for safe characters (including query fragments for OJS)
if (!is_string($redirect) || !preg_match('/^\/[a-zA-Z0-9\._\-\/\?\=\&\%\#]+$/', $redirect) || strpos($redirect, '//') === 0) {
    $redirect = '/index.php/index/submission/wizard';
}

if (!$token) {
    die("Error: Missing SSO token.");
}

// 1. Validate the token with Digitopub API via an internal cURL request
$validateUrl = DIGITOPUB_BASE_URL . '/api/ojs/sso/validate?token=' . urlencode($token);

$ch = curl_init($validateUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
// For production, ensure SSL verification is ENABLED. You can disable it strictly for local testing if needed.
// curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    error_log("SSO Validation Failed. HTTP Code: $httpCode. cURL Error: $curlError");
    die("Error: Failed to validate SSO token. Check server error logs.");
}

$data = json_decode($response, true);
if (!$data || empty($data['valid']) || empty($data['email'])) {
    die("Error: Invalid, consumed, or expired SSO token.");
}

$email = $data['email'];

// 2. Fetch the corresponding user from the OJS Database using the PKP DAO framework
$userDao = DAORegistry::getDAO('UserDAO');
$user = $userDao->getByEmail($email);

if (!$user) {
    // Next.js should have auto-provisioned the user via direct MySQL before issuing the redirect.
    // If the user isn't found here, there is a data synchronization failure.
    die("Error: Authorized user account not found in the OJS database. Please contact support.");
}

// 3. Authenticate the User within the OJS Session Manager
$request = Application::get()->getRequest();
$sessionManager = SessionManager::getManager();

// Acquire a unique lock per installation to prevent race conditions during session destruction/re-initialization
// Unique suffix is a hash of the current directory to avoid collisions in multi-tenant shared temp folders
$lockFile = sys_get_temp_dir() . '/ojs_sso_session_' . substr(md5(__DIR__), 0, 10) . '.lock';
$lockHandle = fopen($lockFile, 'w');
if ($lockHandle) {
    flock($lockHandle, LOCK_EX);
}

$session = $sessionManager->getUserSession();

// If another user is currently logged in, cleanly destroy their session first
if ($session->getUserId() && $session->getUserId() !== $user->getId()) {
    $sessionManager->destroy();
    // Re-initialize a blank session
    $session = $sessionManager->getUserSession();
}

// Bind the targeted OJS user ID to the live Cookie session
$session->setUserId($user->getId());
$session->setSessionVar('username', $user->getUsername());

if ($lockHandle) {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
}

// 4. Update internal metrics
try {
    $user->setDateLastLogin(Core::getCurrentDate());
    $userDao->updateObject($user);
} catch (Exception $e) {
    error_log("OJS SSO: Failed to update user last login: " . $e->getMessage());
    // Optionally destroy the session if we consider this failure critical for partial logins
    // $sessionManager->destroy();
    // die("Error: Failed to safely update user session. Please try again.");
}

// 5. Fire post-login hook to alert OJS plugins (optional but recommended for a complete setup)
HookRegistry::call('User::login', array(&$user));

// 6. Complete SSO Redirection gracefully
header("Location: " . $redirect);
exit;
