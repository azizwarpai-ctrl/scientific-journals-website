<#
.SYNOPSIS
    Packages the Scientific Journals Website for production deployment.
    Creates a single unified 'release/digitopub-deploy.zip'.

.DESCRIPTION
    This script performs the following:
    1. Builds a unified 'deploy' directory structure (Frontend at root, Backend in /api).
    2. Cleans previous release artifacts.
    3. Compresses everything into a single deployable Zip file.
#>

$ReleaseDir = "release"
$DeployDir = "deploy"
$FrontendSrc = "out"
$BackendSrc = "backend-out"

# 1. Clean/Create Directories
if (-not (Test-Path $ReleaseDir)) { 
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null 
} else {
    # Clean old artifacts to avoid confusion
    Get-ChildItem -Path $ReleaseDir -Include "*.zip" -Recurse | Remove-Item -Force
}
if (Test-Path $DeployDir) { Remove-Item $DeployDir -Recurse -Force }
New-Item -ItemType Directory -Path $DeployDir | Out-Null
New-Item -ItemType Directory -Path "$DeployDir\api" | Out-Null

Write-Host "Assembling Deployment Package..." -ForegroundColor Cyan

# 2. Setup Frontend (Root)
if (Test-Path $FrontendSrc) {
    Write-Host "  [1/3] Copying Frontend to root..." -ForegroundColor Gray
    Copy-Item -Path "$FrontendSrc\*" -Destination $DeployDir -Recurse -Force
    
    # Ensure Frontend .htaccess
    if (-not (Test-Path "$DeployDir\.htaccess")) {
        Write-Host "        Creating Frontend .htaccess..." -ForegroundColor Gray
        $htaccessContent = @'
Options -Indexes
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Serve .html files for extensionless URLs
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME}.html -f
    RewriteRule ^ %{REQUEST_FILENAME}.html [L]

    # Handle trailing slashes (e.g., /admin/ -> admin.html)
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteCond %{REQUEST_FILENAME}.html -f
    RewriteRule ^(.*)/$ $1.html [L]
</IfModule>
'@
        [System.IO.File]::WriteAllText("$DeployDir\.htaccess", $htaccessContent)
    }
} else {
    Write-Host "  [ERROR] Frontend build 'out' not found!" -ForegroundColor Red
}

# 3. Setup Backend (/api)
if (-not (Test-Path $BackendSrc)) {
    Write-Host "  [INFO] Backend artifact missing. Running build..." -ForegroundColor Yellow
    npm run build:backend
}

if (Test-Path $BackendSrc) {
    Write-Host "  [2/3] Copying Backend to /api..." -ForegroundColor Gray
    Copy-Item -Path "$BackendSrc\*" -Destination "$DeployDir\api" -Recurse -Force
} else {
    Write-Host "  [ERROR] Backend build failed!" -ForegroundColor Red
}

# 4. Final compression
Write-Host "  [3/3] Compressing release (Size: $( "{0:N2} MB" -f ((Get-ChildItem $DeployDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB) ))..." -ForegroundColor Gray
$FinalZip = "$ReleaseDir\digitopub-deploy.zip"
if (Test-Path $FinalZip) { Remove-Item $FinalZip }

# Use pipeline for robust content compression ( avoids wildcards issues )
Get-ChildItem -Path $DeployDir | Compress-Archive -DestinationPath $FinalZip -Force

# Verify Zip Size
$ZipSize = (Get-Item $FinalZip).Length
if ($ZipSize -lt 1MB) {
    Write-Host "  [WARNING] Zip file seems too small ($("{0:N2} KB" -f ($ZipSize / 1KB))). Check contents!" -ForegroundColor Yellow
} else {
    Write-Host "`n[SUCCESS] Deployment Package Ready!" -ForegroundColor Green
    Write-Host "  Structure: $DeployDir" -ForegroundColor Cyan
    Write-Host "  Zip File:  $FinalZip ($("{0:N2} MB" -f ($ZipSize / 1MB)))" -ForegroundColor Cyan
}
