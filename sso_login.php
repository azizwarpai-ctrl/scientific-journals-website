<?php
/**
 * OJS SSO Receiver Script for Digitopub
 * 
 * INSTRUCTIONS:
 * 1. Upload this file (`sso_login.php`) to the ROOT directory of your SiteGround OJS installation.
 *    (It should sit next to OJS's `index.php` and `config.inc.php`).
 * 2. Update the `DIGITOPUB_BASE_URL` constant below to match your live Next.js app URL.
 * 3. Ensure the server's firewall allows outbound cURL requests to the Next.js API.
 */

// --- CONFIGURATION ---
// The base URL of your Next.js Digitopub application (no trailing slash)
// E.g., 'https://digitopub.com' or 'http://localhost:3000'
define('DIGITOPUB_BASE_URL', 'http://localhost:3000');
// ---------------------

// Basic error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
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

// 4. Update internal metrics
$user->setDateLastLogin(Core::getCurrentDate());
$userDao->updateObject($user);

// 5. Fire post-login hook to alert OJS plugins (optional but recommended for a complete setup)
HookRegistry::call('User::login', array(&$user));

// 6. Complete SSO Redirection gracefully
header("Location: " . $redirect);
exit;
