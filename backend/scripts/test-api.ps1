# API Testing Script
# Run this after starting the PHP server: php -S localhost:8000 -t public

Write-Host "=== Testing PHP Backend API ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method GET
    Write-Host "✅ Health Check: " -NoNewline -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Login
Write-Host "2. Testing Login Endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@test.com"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    Write-Host "✅ Login Response:" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host $response.Content
    
    # Save temp token for next test
    $global:tempToken = $result.data.tempToken
    Write-Host ""
    Write-Host "Temp Token saved for OTP verification" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Login Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}

Write-Host ""

# Test 3: Journals List
Write-Host "3. Testing Journals List..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/journals" -Method GET
    Write-Host "✅ Journals List:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Journals List Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: OTP verification requires the OTP code from email (which isn't configured yet)" -ForegroundColor Yellow
Write-Host "You can manually test with:" -ForegroundColor Yellow
Write-Host '  $otpBody = @{ tempToken = "$tempToken"; otp = "123456" } | ConvertTo-Json' -ForegroundColor Gray
Write-Host '  Invoke-WebRequest -Uri "http://localhost:8000/api/auth/verify-2fa" -Method POST -ContentType "application/json" -Body $otpBody' -ForegroundColor Gray
