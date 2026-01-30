<#
.SYNOPSIS
    Packages the Scientific Journals Website for production deployment.
    Creates 'release/frontend.zip' and 'release/backend.zip'.

.DESCRIPTION
    This script performs the following:
    1. Checks for build artifacts ('out' directory and 'deploy_package').
    2. Suggests running build commands if artifacts are missing.
    3. Compresses the frontend static export to 'release/frontend-dist.zip'.
    4. Compresses the backend deployment package to 'release/backend-api.zip'.
#>

$ReleaseDir = "release"
$FrontendSrc = "out"
$BackendSrc = "backend-out"

# Ensure Release Directory Exists
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
    Write-Host "Created release directory: $ReleaseDir" -ForegroundColor Cyan
}

# --- Package Frontend ---
if (Test-Path $FrontendSrc) {
    Write-Host "Packaging Frontend..." -ForegroundColor Green
    $FrontendZip = "$ReleaseDir\frontend-dist.zip"
    if (Test-Path $FrontendZip) { Remove-Item $FrontendZip }
    
    # Ensure .htaccess exists in out (Frontend)
    if (-not (Test-Path "$FrontendSrc\.htaccess")) {
        Write-Host "Creating .htaccess for Frontend..." -ForegroundColor Gray
        Set-Content -Path "$FrontendSrc\.htaccess" -Value "Options -Indexes`nErrorDocument 404 /404.html`n<IfModule mod_rewrite.c>`nRewriteEngine On`nRewriteBase /`nRewriteCond %{REQUEST_FILENAME} !-d`nRewriteCond %{REQUEST_FILENAME}.html -f`nRewriteRule ^ %{REQUEST_FILENAME}.html [L]`nRewriteCond %{REQUEST_FILENAME} -d`nRewriteCond %{REQUEST_FILENAME}.html -f`nRewriteRule ^(.*)/$ `$1.html [L]`n</IfModule>" -NoNewline
    }

    Compress-Archive -Path "$FrontendSrc\*" -DestinationPath $FrontendZip -Force
    Write-Host " [SUCCESS] Frontend Package Ready: $FrontendZip" -ForegroundColor Green
}
else {
    Write-Host " [ERROR] Frontend build ('out') not found. Run 'bun run build' first." -ForegroundColor Red
}

# --- Package Backend ---
if (-not (Test-Path $BackendSrc)) {
    Write-Host "Backend artifact not found. Building now..." -ForegroundColor Yellow
    npm run build:backend
}

if (Test-Path $BackendSrc) {
    Write-Host "Packaging Backend (API)..." -ForegroundColor Green
    $BackendZip = "$ReleaseDir\backend-api.zip"
    if (Test-Path $BackendZip) { Remove-Item $BackendZip }
    
    Compress-Archive -Path "$BackendSrc\*" -DestinationPath $BackendZip -Force
    Write-Host " [SUCCESS] Backend Package Ready: $BackendZip" -ForegroundColor Green
}
else {
    Write-Host " [ERROR] Backend build failed or not found." -ForegroundColor Red
}

Get-ChildItem $ReleaseDir
Write-Host "`n[SUCCESS] Packages are ready to upload!" -ForegroundColor Cyan
