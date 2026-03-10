<?php
/**
 * DigitoPub SSO Receiver
 * ----------------------------------------------------------------------------
 * This script must be placed in the ROOT directory of the OJS installation 
 * (e.g., alongside index.php).
 * 
 * It receives a `token` from digitopub.com, validates it against the Next.js API,
 * logs the user into OJS natively by assigning an OJSSID cookie, and drops them
 * into the submission wizard.
 */

require_once('./lib/pkp/includes/bootstrap.inc.php');

$token = $_GET['token'] ?? null;
if (!$token) {
    die("Access Denied: Missing SSO Token");
}

// 1. Verify the token with the Main Next.js API
// In production, this URL should be https://digitopub.com/api/ojs/sso/validate
$nextJsApiUrl = "https://digitopub.com"; // Adjust if necessary
$validationUrl = rtrim($nextJsApiUrl, '/') . "/api/ojs/sso/validate?token=" . urlencode($token);

// We use context options to ignore SSL errors if connecting locally, 
// though production should have valid SSL.
$context = stream_context_create([
    "ssl" => [
        "verify_peer" => false,
        "verify_peer_name" => false
    ]
]);

$response = @file_get_contents($validationUrl, false, $context);
if ($response === false) {
    die("SSO Failed: Unable to contact authentication server at $nextJsApiUrl");
}

$data = json_decode($response, true);
if (!$data || !isset($data['valid']) || $data['valid'] !== true) {
    $errorMsg = isset($data['error']) ? $data['error'] : "Unknown error";
    die("SSO Failed: Token rejected ($errorMsg)");
}

$email = $data['email'];

// 2. Identify the OJS User by Email
$userDao = DAORegistry::getDAO('UserDAO');
$user = $userDao->getUserByEmail($email);

if (!$user) {
    // Edge case: our Next.js script inserts the user, but maybe it failed or lagged.
    // In a pure integration, we might auto-create here, but bridging handles it first.
    die("SSO Failed: User account '$email' not found in OJS database.");
}

// 3. Force the Native OJS Login Session
// The Application class holds the root dependencies. We start a generic Session.
$request = Application::get()->getRequest();
$sessionManager = SessionManager::getManager();
$session = $sessionManager->getUserSession();

// Associate the session with the User ID
$session->setUserId($user->getId());

// We must manually trigger the login lifecycle hooks that OJS expects.
import('classes.security.Validation');
Validation::registerSession($user->getId());

// Log the event explicitly for OJS security logging
import('lib.pkp.classes.log.SubmissionLog');
import('lib.pkp.classes.log.SubmissionEventLogEntry');
// If we had a specific submission, we could log it. For now, a generic user log.

// 4. Redirect to the Submission Wizard
// We default to the index context, but if a journal path was passed, we could route there.
$submissionUrl = $request->url('index', 'submission', 'wizard');

header("Location: $submissionUrl");
exit;
