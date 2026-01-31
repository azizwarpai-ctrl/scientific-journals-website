<#
.SYNOPSIS
    Builds the PHP Backend for Production (Similar to 'bun run build').
    Outputs to 'backend-out'.

.DESCRIPTION
    1. Cleans/Creates 'backend-out' directory.
    2. Copies source code, public, and config files.
    3. Excludes tests, git artifacts, and dev-only documentation.
    4. Installs/Prunes Composer dependencies for production (no-dev).
    5. Sets default production environment variables file.
#>

$Source = "backend"
$Dest = "backend-out"
$Exclude = @(
    "tests",
    "phpunit.xml",
    "*.lock", # We might want lock file, actually. keeping it.
    ".git",
    ".gitignore",
    "*.md", # Exclude all markdown files from the runtime
    "start.sh",
    "scripts/test*",
    "scripts/create-test*",
    "storage/logs/*.log"
)

Write-Host " Building Backend for Production..." -ForegroundColor Cyan

# 1. Clean Output Directory
if (Test-Path $Dest) {
    Remove-Item -Path $Dest -Recurse -Force
}
New-Item -ItemType Directory -Path $Dest | Out-Null

# 2. Copy Files (Robust Copy with Exclusions)
Write-Host " Copying source files..." -ForegroundColor Gray
# We use robocopy for speed and exclusion handling if possible, but Copy-Item is safer for pure PS envs without complex args.
# Using Copy-Item recursively, then cleaning up is easier to maintain.

Copy-Item -Path "$Source\*" -Destination $Dest -Recurse -Force

# 3. Cleanup Excluded Items
Write-Host " Cleaning dev artifacts..." -ForegroundColor Gray
foreach ($Item in $Exclude) {
    # Handle wildcard removals
    if ($Item -like "*/*") {
        # recursive search/remove ?? Simple approach:
        # Just specific known paths for now or simple recursions
    }
    
    $PathToRemove = "$Dest\$Item"
    
    # Try removing exact matches
    if (Test-Path $PathToRemove) {
        Remove-Item -Path $PathToRemove -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Try removing via Get-ChildItem for wildcards
    Get-ChildItem -Path $Dest -Include $Item -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove specific scripts folder contents if needed
# (e.g., we want to keep migrations but delete tests)
Get-ChildItem -Path "$Dest\scripts" -Filter "test-*" -Recurse | Remove-Item -Force
Get-ChildItem -Path "$Dest\scripts" -Filter "create-test-*" -Recurse | Remove-Item -Force

# 4. Optimize Dependencies (Composer)
if (Get-Command "composer" -ErrorAction SilentlyContinue) {
    Write-Host " Optimizing dependencies (composer install --no-dev)..." -ForegroundColor Cyan
    Push-Location $Dest
    try {
        # We delete vendor first to ensure a clean install, 
        # OR we rely on composer to prune. Pruning is faster.
        # But if the user copied a 'vendor' from dev, it has dev packages.
        # 'composer install --no-dev' should remove them.
        cmd /c "composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs"
    }
    catch {
        Write-Host " (!) Composer optimization failed. Using copied vendor folder as-is." -ForegroundColor Yellow
    }
    Pop-Location
}
else {
    Write-Host " (!) Composer not found. Using pre-existing 'vendor' folder (may include dev dependencies)." -ForegroundColor Yellow
}

# 5. Final Touch: Environment
if (Test-Path "$Dest\.env") {
    Remove-Item "$Dest\.env" -ErrorAction SilentlyContinue
}
if (Test-Path "$Source\.env.example") {
    Copy-Item "$Source\.env.example" "$Dest\.env.example" -Force
}
elseif (Test-Path ".env.example") {
    Copy-Item ".env.example" "$Dest\.env.example" -Force
}

# -------------------------------------------------------------
# 5.5 RESTRUCTURE FOR PRODUCTION DEPLOYMENT (/api root)
# -------------------------------------------------------------
Write-Host " Restructuring for API deployment (moving public/* to root)..." -ForegroundColor Cyan

# Move public contents to root
if (Test-Path "$Dest\public") {
    Get-ChildItem -Path "$Dest\public" | Move-Item -Destination $Dest -Force
    Remove-Item "$Dest\public" -Force
}

# Patch index.php to fix paths (remove /../)
$IndexFile = "$Dest\index.php"
if (Test-Path $IndexFile) {
    $Content = Get-Content $IndexFile -Raw
    $Content = $Content -replace "/\.\./vendor", "/vendor"
    $Content = $Content -replace "/\.\./src", "/src"
    $Content = $Content -replace "__DIR__ \. '/\.\.'", "__DIR__" 
    Set-Content -Path $IndexFile -Value $Content -NoNewline
    Write-Host " Patched index.php paths." -ForegroundColor Gray
}
# -------------------------------------------------------------

# 6. Create production-ready .htaccess if missing (we already made one in public/, ensuring it's there)
# (It was copied in step 2)

Write-Host " [SUCCESS] Backend Build Complete!" -ForegroundColor Green
Write-Host " Output: .\$Dest" -ForegroundColor Cyan
