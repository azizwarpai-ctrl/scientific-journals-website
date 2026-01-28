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
$BackendSrc = "deploy_package"

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
    
    Compress-Archive -Path "$FrontendSrc\*" -DestinationPath $FrontendZip -Force
    Write-Host "✅ Frontend Package Ready: $FrontendZip" -ForegroundColor Green
}
else {
    Write-Host "❌ Frontend build ('out') not found. Run 'bun run build' first." -ForegroundColor Red
}

# --- Package Backend ---
if (Test-Path $BackendSrc) {
    Write-Host "Packaging Backend (API)..." -ForegroundColor Green
    $BackendZip = "$ReleaseDir\backend-api.zip"
    if (Test-Path $BackendZip) { Remove-Item $BackendZip }
    
    # Ensure vendor directory exists in the source
    if (-not (Test-Path "$BackendSrc\backend\vendor")) {
        Write-Host "⚠️  Warning: 'vendor' directory missing in backend package. Ensure 'composer install' was run." -ForegroundColor Yellow
    }

    Compress-Archive -Path "$BackendSrc\*" -DestinationPath $BackendZip -Force
    Write-Host "✅ Backend Package Ready: $BackendZip" -ForegroundColor Green
}
else {
    Write-Host "❌ Backend package ('deploy_package') not found." -ForegroundColor Red
}

Get-ChildItem $ReleaseDir
Write-Host "`n[SUCCESS] Packages are ready to upload!" -ForegroundColor Cyan
