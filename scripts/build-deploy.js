#!/usr/bin/env node

/**
 * DigitoPub - Production Build & Deployment Tool
 * 
 * This single script replaces both build_backend.ps1 and package_release.ps1
 * with a unified, cross-platform, accurate build process.
 * 
 * Usage:
 *   node build-deploy.js                    # Full build
 *   node build-deploy.js --frontend-only    # Build only frontend
 *   node build-deploy.js --backend-only     # Build only backend
 *   node build-deploy.js --no-zip           # Skip ZIP creation
 *   node build-deploy.js --clean            # Clean all builds
 * 
 * Features:
 *   ✓ Cross-platform (Windows, Mac, Linux)
 *   ✓ Accurate file operations
 *   ✓ Production-optimized builds
 *   ✓ Comprehensive error handling
 *   ✓ Build verification
 *   ✓ Upload instructions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Directories
  ROOT: process.cwd(),
  FRONTEND_OUT: 'out',
  BACKEND_SRC: 'backend',
  BACKEND_OUT: 'backend-out',
  DEPLOY: 'deploy',
  RELEASE: 'release',

  // Build flags
  FRONTEND_ONLY: process.argv.includes('--frontend-only'),
  BACKEND_ONLY: process.argv.includes('--backend-only'),
  NO_ZIP: process.argv.includes('--no-zip'),
  CLEAN_ONLY: process.argv.includes('--clean'),
  VERBOSE: process.argv.includes('--verbose') || process.argv.includes('-v'),

  // Backend exclusions (files/folders to skip)
  BACKEND_EXCLUDE: [
    'tests',
    'phpunit.xml',
    'phpunit.xml.dist',
    '.git',
    '.gitignore',
    'README.md',
    'MIGRATION_README.md',
    'CONTRIBUTING.md',
    'start.sh',
    'temp_otp.txt',
    '.env',
    '.env.local',
    '.env.development'
  ],

  // Backend exclude patterns (regex)
  BACKEND_EXCLUDE_PATTERNS: [
    /^test-.*\.php$/,
    /^test-.*\.sh$/,
    /^inspect-.*\.php$/,
    /^create-test-.*\.php$/,
    /.*\.log$/,
    /.*\.tmp$/,
    /\.DS_Store$/
  ]
};

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(msg, 'bright');
  log('='.repeat(60), 'cyan');
}

function step(num, total, msg) {
  log(`\n[${num}/${total}] ${msg}`, 'cyan');
}

function success(msg) {
  log(`✓ ${msg}`, 'green');
}

function error(msg) {
  log(`✗ ${msg}`, 'red');
}

function warning(msg) {
  log(`⚠ ${msg}`, 'yellow');
}

function info(msg) {
  if (CONFIG.VERBOSE) log(`  ${msg}`, 'dim');
}

function exec(cmd, description) {
  try {
    info(`Running: ${cmd}`);
    const output = execSync(cmd, {
      stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe',
      encoding: 'utf8'
    });
    success(description);
    return output;
  } catch (err) {
    error(`${description} failed`);
    if (!CONFIG.VERBOSE && err.stderr) {
      console.error(err.stderr);
    }
    throw err;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) return 0;

  const walk = (p) => {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
    } else {
      size += stat.size;
    }
  };

  walk(dir);
  return size;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    info(`Created: ${dir}`);
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    info(`Removed: ${dir}`);
  }
}

function shouldExcludeFile(filename) {
  // Check exact matches
  if (CONFIG.BACKEND_EXCLUDE.includes(filename)) return true;

  // Check patterns
  return CONFIG.BACKEND_EXCLUDE_PATTERNS.some(pattern => pattern.test(filename));
}

function copyDir(src, dest, options = {}) {
  const { exclude = false } = options;

  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let copied = 0;
  let skipped = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check exclusions
    if (exclude && shouldExcludeFile(entry.name)) {
      info(`Skipped: ${entry.name}`);
      skipped++;
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, options);
    } else {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }

  if (CONFIG.VERBOSE) {
    info(`Copied ${copied} files, skipped ${skipped} files`);
  }
}

function moveDir(src, dest) {
  if (!fs.existsSync(src)) return;

  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  info(`Moved: ${src} → ${dest}`);
}

function createZip(sourceDir, outputFile) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = archive.pointer();
      resolve(size);
    });

    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') warning(err.message);
      else reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// ============================================================================
// BUILD STEPS
// ============================================================================

async function cleanBuilds() {
  header('STEP 1: Cleaning Previous Builds');

  const dirs = [CONFIG.FRONTEND_OUT, CONFIG.BACKEND_OUT, CONFIG.DEPLOY];

  for (const dir of dirs) {
    removeDir(dir);
  }

  success('All build directories cleaned');
}

async function buildFrontend() {
  if (CONFIG.BACKEND_ONLY) {
    warning('Skipping frontend build (--backend-only)');
    return;
  }

  header('STEP 2: Building Frontend (Next.js Static Export)');

  // Verify Next.js config
  if (!fs.existsSync('next.config.mjs') && !fs.existsSync('next.config.js')) {
    throw new Error('next.config.mjs or next.config.js not found');
  }

  // Check if we're using npm or bun
  const useNpm = fs.existsSync('package-lock.json');
  const useBun = fs.existsSync('bun.lockb');

  let buildCmd = 'npm run build';
  if (useBun) buildCmd = 'bun run build';

  exec(buildCmd, 'Frontend build completed');

  // Verify output
  if (!fs.existsSync(CONFIG.FRONTEND_OUT)) {
    throw new Error(`Frontend build failed: ${CONFIG.FRONTEND_OUT}/ not created`);
  }

  const size = getDirSize(CONFIG.FRONTEND_OUT);
  success(`Frontend built: ${formatBytes(size)}`);
}

async function buildBackend() {
  if (CONFIG.FRONTEND_ONLY) {
    warning('Skipping backend build (--frontend-only)');
    return;
  }

  header('STEP 3: Building Backend (PHP Clean Architecture)');

  // Verify backend exists
  if (!fs.existsSync(CONFIG.BACKEND_SRC)) {
    throw new Error(`Backend directory not found: ${CONFIG.BACKEND_SRC}/`);
  }

  // Clean output
  removeDir(CONFIG.BACKEND_OUT);
  ensureDir(CONFIG.BACKEND_OUT);

  // Copy backend files (with exclusions)
  info('Copying backend source files...');
  copyDir(CONFIG.BACKEND_SRC, CONFIG.BACKEND_OUT, { exclude: true });
  success('Backend files copied');

  // Install production dependencies
  const composerJson = path.join(CONFIG.BACKEND_OUT, 'composer.json');
  if (fs.existsSync(composerJson)) {
    process.chdir(CONFIG.BACKEND_OUT);

    try {
      exec(
        'composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs',
        'Composer dependencies installed'
      );
    } catch (err) {
      warning('Composer install failed, continuing with existing vendor/');
    }

    process.chdir(CONFIG.ROOT);
  } else {
    info('No composer.json found, skipping dependency installation');
  }

  // Restructure for /api deployment
  info('Restructuring for /api deployment...');
  const publicDir = path.join(CONFIG.BACKEND_OUT, 'public');

  if (fs.existsSync(publicDir)) {
    // Move public/* to root
    const publicFiles = fs.readdirSync(publicDir);

    for (const file of publicFiles) {
      const src = path.join(publicDir, file);
      const dest = path.join(CONFIG.BACKEND_OUT, file);

      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }

      fs.renameSync(src, dest);
      info(`Moved: public/${file} → root/${file}`);
    }

    // Remove empty public directory
    fs.rmdirSync(publicDir);
    success('Restructured for /api deployment');
  }

  // Patch index.php paths
  const indexPath = path.join(CONFIG.BACKEND_OUT, 'index.php');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');

    // Fix relative paths for root deployment
    content = content.replace(/'\.\.\/vendor'/g, "'./vendor'");
    content = content.replace(/"\.\.\/vendor"/g, '"./vendor"');
    content = content.replace(/'\.\.\/src'/g, "'./src'");
    content = content.replace(/"\.\.\/src"/g, '"./src"');
    content = content.replace(/__DIR__\s*\.\s*['"]\/\.\.['"]/g, '__DIR__');

    fs.writeFileSync(indexPath, content);
    success('Patched index.php paths');
  }

  // Create .env.example if missing
  const envExample = path.join(CONFIG.BACKEND_OUT, '.env.example');
  if (!fs.existsSync(envExample)) {
    const envTemplate = `# Backend Environment Configuration

# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://digitopub.com

# Database (Main Application)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=digitopu_journals
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password

# Security (Generate 64-character random string)
# Generate with: openssl rand -base64 64 | tr -d '\\n'
JWT_SECRET=your_jwt_secret_64_characters_min

# Email (SMTP)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USERNAME=noreply@digitopub.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_EMAIL=noreply@digitopub.com
SMTP_FROM_NAME=DigitoPub

# OJS Integration (Optional)
OJS_DB_HOST=submitmanger.com
OJS_DB_PORT=3306
OJS_DB_NAME=submitma_ojs
OJS_DB_USER=readonly_user
OJS_DB_PASSWORD=ojs_readonly_password
OJS_BASE_URL=https://submitmanger.com
`;
    fs.writeFileSync(envExample, envTemplate);
    success('Created .env.example');
  }

  const size = getDirSize(CONFIG.BACKEND_OUT);
  success(`Backend built: ${formatBytes(size)}`);
}

async function createDeployPackage() {
  header('STEP 4: Creating Unified Deployment Package');

  // Clean and create deploy directory
  removeDir(CONFIG.DEPLOY);
  ensureDir(CONFIG.DEPLOY);
  ensureDir(path.join(CONFIG.DEPLOY, 'api'));

  // Copy frontend to root
  if (fs.existsSync(CONFIG.FRONTEND_OUT) && !CONFIG.BACKEND_ONLY) {
    info('Copying frontend to deploy root...');
    copyDir(CONFIG.FRONTEND_OUT, CONFIG.DEPLOY);
    success('Frontend copied');

    // Create frontend .htaccess
    const htaccessPath = path.join(CONFIG.DEPLOY, '.htaccess');
    if (!fs.existsSync(htaccessPath)) {
      const htaccess = `# DigitoPub Frontend Routing
Options -Indexes
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # API requests should go to /api
    RewriteRule ^api/ - [L]
    
    # Serve .html files for extensionless URLs
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME}.html -f
    RewriteRule ^(.*)$ $1.html [L]
    
    # Handle directory requests
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteCond %{REQUEST_FILENAME}/index.html -f
    RewriteRule ^(.*)$ $1/index.html [L]
</IfModule>
`;
      fs.writeFileSync(htaccessPath, htaccess);
      success('Created frontend .htaccess');
    }
  } else if (!CONFIG.BACKEND_ONLY) {
    warning('Frontend build not found, skipping');
  }

  // Copy backend to /api
  if (fs.existsSync(CONFIG.BACKEND_OUT) && !CONFIG.FRONTEND_ONLY) {
    info('Copying backend to deploy/api/...');
    copyDir(CONFIG.BACKEND_OUT, path.join(CONFIG.DEPLOY, 'api'));
    success('Backend copied');
  } else if (!CONFIG.FRONTEND_ONLY) {
    warning('Backend build not found, skipping');
  }

  const size = getDirSize(CONFIG.DEPLOY);
  success(`Deployment package created: ${formatBytes(size)}`);
}

async function createZipArchive() {
  if (CONFIG.NO_ZIP) {
    warning('Skipping ZIP creation (--no-zip)');
    return;
  }

  header('STEP 5: Creating ZIP Archive');

  ensureDir(CONFIG.RELEASE);

  const zipName = 'digitopub-deploy.zip';
  const zipPath = path.join(CONFIG.RELEASE, zipName);

  // Remove old zip
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Create zip
  const size = await createZip(CONFIG.DEPLOY, zipPath);
  success(`ZIP created: ${zipName} (${formatBytes(size)})`);
}

async function verifyBuild() {
  header('STEP 6: Build Verification');

  const checks = [];

  // Frontend checks
  if (!CONFIG.BACKEND_ONLY) {
    checks.push(
      { name: 'Frontend index.html', path: path.join(CONFIG.DEPLOY, 'index.html') },
      { name: 'Frontend admin pages', path: path.join(CONFIG.DEPLOY, 'admin') },
      { name: 'Frontend static assets', path: path.join(CONFIG.DEPLOY, '_next', 'static') }
    );
  }

  // Backend checks
  if (!CONFIG.FRONTEND_ONLY) {
    checks.push(
      { name: 'Backend index.php', path: path.join(CONFIG.DEPLOY, 'api', 'index.php') },
      { name: 'Backend source code', path: path.join(CONFIG.DEPLOY, 'api', 'src') },
      { name: 'Backend dependencies', path: path.join(CONFIG.DEPLOY, 'api', 'vendor') },
      { name: 'Backend .htaccess', path: path.join(CONFIG.DEPLOY, 'api', '.htaccess') }
    );
  }

  let passed = 0;
  let failed = 0;

  log('\nVerification Results:');
  for (const check of checks) {
    if (fs.existsSync(check.path)) {
      success(check.name);
      passed++;
    } else {
      error(check.name);
      failed++;
    }
  }

  if (failed > 0) {
    throw new Error(`Build verification failed: ${failed} checks failed`);
  }

  success(`\nAll ${passed} checks passed!`);
}

async function showUploadInstructions() {
  header('UPLOAD INSTRUCTIONS');

  log('\n📦 Your deployment package is ready!', 'green');
  log('\nLocation:', 'bright');
  log(`  📁 Folder: ${CONFIG.DEPLOY}/`);

  const zipPath = path.join(CONFIG.RELEASE, 'digitopub-deploy.zip');
  if (fs.existsSync(zipPath)) {
    const size = fs.statSync(zipPath).size;
    log(`  📦 ZIP: ${zipPath} (${formatBytes(size)})`);
  }

  log('\n🚀 Upload Options:', 'bright');
  log('\nOption 1: Upload ZIP (Recommended)');
  log('  1. Connect to your server via SFTP/SSH');
  log('  2. Upload release/digitopub-deploy.zip to your server');
  log('  3. Extract: unzip digitopub-deploy.zip');
  log('  4. Move contents to public_html/ or web root');

  log('\nOption 2: Upload Folder Directly');
  log('  1. Connect via SFTP (FileZilla, WinSCP, etc.)');
  log('  2. Upload all files from deploy/ folder');
  log('  3. Upload to public_html/ or web root');

  log('\n⚙️  Post-Upload Configuration:', 'bright');
  log('  1. Create backend .env file:');
  log('     cp api/.env.example api/.env');
  log('     nano api/.env  # Edit with your credentials');

  log('\n  2. Generate JWT secret:');
  log('     openssl rand -base64 64 | tr -d \'\\n\'');

  log('\n  3. Set permissions:');
  log('     chmod -R 755 .');
  log('     chmod -R 777 api/storage');
  log('     chmod 600 api/.env');

  log('\n  4. Run database migrations:');
  log('     mysql -u user -p database < api/scripts/001_create_tables.sql');

  log('\n  5. Test deployment:');
  log('     curl https://yourdomain.com/api/health');

  log('\n✅ Your site structure:', 'bright');
  log(`
public_html/
├── index.html              # Homepage
├── admin/                  # Admin interface
├── journals/               # Journals pages
├── _next/static/           # Frontend assets
├── .htaccess              # Frontend routing
└── api/                   # Backend API
    ├── index.php          # Entry point
    ├── .env               # Config (YOU CREATE)
    ├── src/               # PHP code
    ├── vendor/            # Dependencies
    └── storage/           # Logs & uploads
`);

  log('\n📚 Full deployment guide:', 'bright');
  log('  See DEPLOYMENT_GUIDE.md for complete instructions\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    header('🚀 DigitoPub Production Build Tool');

    if (CONFIG.CLEAN_ONLY) {
      await cleanBuilds();
      success('\n✅ Clean completed');
      return;
    }

    const startTime = Date.now();

    // Execute build steps
    await cleanBuilds();
    await buildFrontend();
    await buildBackend();
    await createDeployPackage();
    await createZipArchive();
    await verifyBuild();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    header('✅ BUILD COMPLETED SUCCESSFULLY');
    log(`\nBuild time: ${duration}s`, 'bright');

    await showUploadInstructions();

  } catch (err) {
    header('❌ BUILD FAILED');
    error(`\nError: ${err.message}`);
    if (CONFIG.VERBOSE && err.stack) {
      console.error('\nStack trace:');
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
