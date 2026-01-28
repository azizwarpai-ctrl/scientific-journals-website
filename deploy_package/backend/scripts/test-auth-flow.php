<?php

function request($method, $path, $data = [], $token = null) {
    echo "   Requesting: $method $path\n";
    $url = 'http://localhost:8000' . $path;
    $options = [
        'http' => [
            'header'  => "Content-type: application/json\r\n",
            'method'  => $method,
            'ignore_errors' => true
        ]
    ];
    
    if ($data) {
        $options['http']['content'] = json_encode($data);
    }
    
    if ($token) {
        $options['http']['header'] .= "Authorization: Bearer $token\r\n";
    }
    
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    // Debug output
    if ($path === '/api/auth/login' && $method === 'POST') {
        echo "   [DEBUG] Raw Response: " . substr($result, 0, 500) . "...\n";
        echo "   [DEBUG] Headers: " . print_r($http_response_header, true) . "\n";
    }
    
    return json_decode($result, true);
}

echo "1. Testing Health...\n";
$health = request('GET', '/api/health');
print_r($health);

echo "\n2. Testing Login...\n";
$login = request('POST', '/api/auth/login', [
    'email' => 'admin@test.com',
    'password' => 'TestPassword123!'
]);

if (empty($login['data']['tempToken'])) {
    echo "Raw Login Response: " . $result . "\n";
    echo "HTTP Headers: " . print_r($http_response_header, true) . "\n";
    die("Login failed: " . json_encode($login) . "\n");
}

$tempToken = $login['data']['tempToken'];
echo "   Got temp token.\n";

echo "\n3. Reading OTP from file...\n";
// Try backend root first, then workspace root
$otpFile = __DIR__ . '/../temp_otp.txt';
if (!file_exists($otpFile)) {
    $otpFile = __DIR__ . '/../../temp_otp.txt';
}

if (!file_exists($otpFile)) {
    die("OTP file not found at $otpFile. Make sure OTPService logs to file.\n");
}
$otp = trim(file_get_contents($otpFile));
echo "   OTP is: $otp\n";

echo "\n4. Verifying OTP...\n";
$verify = request('POST', '/api/auth/verify-2fa', [
    'tempToken' => $tempToken,
    'otp' => $otp
]);

if (empty($verify['data']['token'])) {
    die("Verification failed: " . json_encode($verify) . "\n");
}

$sessionToken = $verify['data']['token'];
echo "   Got session token!\n";

echo "\n5. Testing Protected Route (Me)...\n";
$me = request('GET', '/api/auth/me', [], $sessionToken);
print_r($me);

if (($me['data']['id'] ?? 0) === 2) { // ID 2 was created for admin@test.com
    echo "\n✅ SUCCESS: Full Auth Flow working!\n";
} else {
    echo "\n❌ FAILED: User details not returned correctly.\n";
}
