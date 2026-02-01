# DigitoPub - Build & Deployment Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Build Process](#build-process)
3. [Deployment Structure](#deployment-structure)
4. [Upload Instructions](#upload-instructions)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Composer (for backend dependencies)
- Access to web server (SFTP/SSH)
- MySQL 8.0+ database

### One-Command Build

```bash
# Build everything
node scripts/build.js

# Or use npm script
npm run build:all
```

### Build Options

```bash
# Skip frontend build (if already built)
node scripts/build.js --skip-frontend

# Skip backend build (if already built)
node scripts/build.js --skip-backend

# Build without creating ZIP package
node scripts/build.js --no-package
```

---

## Build Process

### What Happens During Build

#### 1. Clean Previous Builds
- Removes `/out` (frontend build)
- Removes `/backend-build` (backend build)
- Removes `/deploy` (deployment folder)

#### 2. Build Frontend (Next.js Static Export)
- Runs: `npm run build`
- Output: `/out/` directory
- Contains: HTML, CSS, JavaScript, images
- Size: ~5-15 MB (depending on assets)

**What's in Frontend Build:**
```
out/
├── index.html              # Homepage
├── 404.html               # Error page
├── about.html             # About page
├── admin/
│   ├── login.html         # Admin login
│   ├── dashboard.html     # Dashboard
│   └── journals.html      # Journal management
├── journals/
│   ├── index.html         # Journals list
│   └── detail.html        # Journal detail
├── _next/static/          # Static assets (JS/CSS)
│   ├── chunks/
│   └── css/
└── images/                # Static images
```

#### 3. Build Backend (PHP)
- Copies backend source code
- Excludes development files (tests, docs)
- Runs: `composer install --no-dev --optimize-autoloader`
- Restructures for `/api` deployment
- Patches file paths in `index.php`
- Output: `/backend-build/` directory
- Size: ~2-5 MB (without vendor) or ~15-30 MB (with vendor)

**What's in Backend Build:**
```
backend-build/
├── index.php              # Entry point (patched paths)
├── .htaccess             # Apache routing
├── src/                  # Application code
│   ├── Application/      # Use cases & services
│   ├── Domain/           # Entities & interfaces
│   ├── Infrastructure/   # Database & email
│   └── Presentation/     # Controllers & middleware
├── vendor/               # PHP dependencies (production only)
├── scripts/              # Cron jobs & utilities
│   ├── 001_create_tables.sql
│   ├── 002_insert_sample_data.sql
│   └── ojs-sync-cron.php
├── storage/              # Logs & uploads (empty)
└── .env.example          # Environment template
```

#### 4. Create Deployment Package
- Creates `/deploy/` directory
- Copies frontend to root
- Copies backend to `/api/` subdirectory
- Creates `.htaccess` files
- Total size: ~20-50 MB

**Final Deployment Structure:**
```
deploy/
├── index.html            # Frontend homepage
├── admin/                # Frontend admin pages
├── journals/             # Frontend journal pages
├── _next/static/         # Frontend assets
├── images/               # Frontend images
├── .htaccess            # Frontend routing
└── api/                 # Backend application
    ├── index.php        # Backend entry
    ├── src/             # PHP code
    ├── vendor/          # Dependencies
    ├── scripts/         # Database scripts
    ├── .htaccess       # API routing
    └── .env.example    # Config template
```

#### 5. Create ZIP Archive
- Creates `/release/digitopub-deploy.zip`
- Contains entire `/deploy/` folder
- Ready for upload to server

#### 6. Verify Build
- ✓ Frontend index.html exists
- ✓ Frontend admin pages exist
- ✓ Frontend static assets exist
- ✓ Backend index.php exists
- ✓ Backend source code exists
- ✓ Backend dependencies exist
- ✓ Backend .htaccess exists

---

## Deployment Structure

### Production Server Layout

```
public_html/              # Your web root
├── index.html           # Frontend homepage (static)
├── admin/               # Frontend admin pages (static)
│   ├── login.html       
│   ├── dashboard.html   
│   └── journals.html    
├── journals/            # Frontend journal pages (static)
│   ├── index.html       
│   └── detail.html      
├── _next/               # Next.js static assets
│   └── static/
├── images/              # Static images
├── .htaccess           # Frontend routing rules
└── api/                # Backend PHP application
    ├── index.php       # Backend entry point
    ├── .htaccess      # API routing rules
    ├── .env           # Backend config (YOU CREATE THIS)
    ├── src/           # PHP application code
    ├── vendor/        # PHP dependencies
    ├── scripts/       # Database scripts
    └── storage/       # Logs & uploads
        └── logs/
```

### URL Mapping

| URL | Serves | Type |
|-----|--------|------|
| `https://digitopub.com/` | `index.html` | Static HTML |
| `https://digitopub.com/admin/login` | `admin/login.html` | Static HTML |
| `https://digitopub.com/journals` | `journals/index.html` | Static HTML |
| `https://digitopub.com/api/health` | `api/index.php` → HealthController | Dynamic PHP |
| `https://digitopub.com/api/auth/login` | `api/index.php` → AuthController | Dynamic PHP |
| `https://digitopub.com/api/journals` | `api/index.php` → JournalController | Dynamic PHP |

---

## Upload Instructions

### Option 1: Upload ZIP (Recommended)

#### Step 1: Build Project
```bash
node scripts/build.js
```

#### Step 2: Download ZIP
- Locate: `/release/digitopub-deploy.zip`
- Size: ~20-50 MB

#### Step 3: Upload to Server
Using **SFTP** (FileZilla, WinSCP, Cyberduck):
1. Connect to your server
2. Navigate to `public_html/` (or your web root)
3. Upload `digitopub-deploy.zip`

#### Step 4: Extract on Server
Using **SSH**:
```bash
# Connect to server
ssh username@digitopub.com

# Navigate to web root
cd public_html/

# Extract ZIP
unzip digitopub-deploy.zip

# Remove ZIP file
rm digitopub-deploy.zip

# Set permissions
chmod -R 755 .
chmod -R 777 api/storage
```

Using **cPanel File Manager**:
1. Go to cPanel → File Manager
2. Navigate to `public_html/`
3. Upload ZIP
4. Right-click → Extract

---

### Option 2: Upload Folder Directly

#### Step 1: Build Project
```bash
node scripts/build.js
```

#### Step 2: Upload via SFTP
Using **FileZilla** or similar:
1. Connect to server
2. Navigate to `public_html/` (remote)
3. Navigate to `/deploy/` (local)
4. Select all files/folders in `/deploy/`
5. Drag to `public_html/`
6. Wait for upload (5-15 minutes depending on connection)

---

### Option 3: Upload via SSH/SCP

#### Step 1: Build Project
```bash
node scripts/build.js
```

#### Step 2: Upload via SCP
```bash
# Upload entire deploy folder
scp -r deploy/* username@digitopub.com:~/public_html/

# Or upload ZIP and extract
scp release/digitopub-deploy.zip username@digitopub.com:~/
ssh username@digitopub.com
cd public_html/
unzip ~/digitopub-deploy.zip
```

---

## Post-Deployment Configuration

### Step 1: Create Backend .env File

```bash
# Connect to server
ssh username@digitopub.com

# Navigate to API directory
cd public_html/api/

# Copy example to .env
cp .env.example .env

# Edit .env
nano .env
```

**Required Configuration:**

```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://digitopub.com

# Database (Main Application)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=digitopu_journals
DB_USERNAME=digitopu_user
DB_PASSWORD=your_secure_password_here

# Security (IMPORTANT: Generate 64-character random string)
JWT_SECRET=generate_random_64_character_string_here_use_openssl_rand

# Email (SMTP)
SMTP_HOST=smtp.yourmailserver.com
SMTP_PORT=587
SMTP_USERNAME=your_email@digitopub.com
SMTP_PASSWORD=your_email_password
SMTP_FROM_EMAIL=noreply@digitopub.com
SMTP_FROM_NAME=DigitoPub

# OJS Integration (Optional - if using OJS sync)
OJS_DB_HOST=submitmanger.com
OJS_DB_PORT=3306
OJS_DB_NAME=submitma_ojs
OJS_DB_USER=readonly_user
OJS_DB_PASSWORD=ojs_readonly_password
OJS_BASE_URL=https://submitmanger.com
```

**Generate JWT Secret:**
```bash
# On server
openssl rand -base64 64 | tr -d '\n' && echo
```

**Secure .env file:**
```bash
chmod 600 .env
```

---

### Step 2: Create MySQL Database

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE digitopu_journals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'digitopu_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON digitopu_journals.* TO 'digitopu_user'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Exit
EXIT;
```

---

### Step 3: Run Database Migrations

```bash
# Navigate to scripts directory
cd ~/public_html/api/scripts/

# Run table creation
mysql -u digitopu_user -p digitopu_journals < 001_create_tables.sql

# Run sample data (optional)
mysql -u digitopu_user -p digitopu_journals < 002_insert_sample_data.sql
```

**Expected output:**
- Tables created: `admin_users`, `journals`, `submissions`, `messages`, `faq_solutions`, `verification_tokens`

---

### Step 4: Set Permissions

```bash
# Navigate to web root
cd ~/public_html/

# Set directory permissions
find . -type d -exec chmod 755 {} \;

# Set file permissions
find . -type f -exec chmod 644 {} \;

# Make storage writable
chmod -R 777 api/storage

# Protect .env
chmod 600 api/.env
```

---

### Step 5: Configure Apache (if needed)

#### Enable mod_rewrite
```bash
# Check if enabled
apache2ctl -M | grep rewrite

# If not enabled
sudo a2enmod rewrite
sudo systemctl restart apache2
```

#### Allow .htaccess Override

Edit Apache config (usually `/etc/apache2/sites-available/000-default.conf`):

```apache
<VirtualHost *:80>
    ServerName digitopub.com
    DocumentRoot /var/www/html/public_html
    
    <Directory /var/www/html/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

Restart Apache:
```bash
sudo systemctl restart apache2
```

---

### Step 6: Test Deployment

#### Test Frontend
```bash
# Homepage
curl https://digitopub.com/ -I

# Expected: 200 OK
```

#### Test Backend API
```bash
# Health check
curl https://digitopub.com/api/health

# Expected: {"status":"ok","timestamp":1234567890}
```

#### Test Database Connection
```bash
cd ~/public_html/api/
php scripts/test-db.php

# Expected:
# ✅ Database connection: SUCCESS
# ✅ Connected to database: digitopu_journals
# ✅ Table 'admin_users' exists
```

#### Test Full Login Flow
1. Visit: `https://digitopub.com/admin/login`
2. Try to login (will fail without admin user - expected)
3. Check browser console - should show API calls to `/api/auth/login`

---

### Step 7: Create Admin User

```bash
cd ~/public_html/api/
php scripts/create-admin.php

# Enter:
# Email: admin@digitopub.com
# Full Name: Admin User
# Password: YourSecurePassword123!
```

**Or manually in MySQL:**
```sql
INSERT INTO admin_users (email, full_name, role, password_hash, created_at, updated_at)
VALUES (
  'admin@digitopub.com',
  'Admin User',
  'admin',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- Password: password
  NOW(),
  NOW()
);
```

---

### Step 8: Configure HTTPS (Recommended)

#### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-apache

# Generate certificate
sudo certbot --apache -d digitopub.com -d www.digitopub.com

# Auto-renewal
sudo certbot renew --dry-run
```

#### Update .env
```env
APP_URL=https://digitopub.com
```

#### Update Frontend .env.production (rebuild required)
```env
NEXT_PUBLIC_API_URL=https://digitopub.com
```

---

### Step 9: Set Up OJS Sync (Optional)

#### Create Read-Only MySQL User
```sql
-- On OJS database server
CREATE USER 'ojs_readonly'@'digitopub_server_ip' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON submitma_ojs.* TO 'ojs_readonly'@'digitopub_server_ip';
FLUSH PRIVILEGES;
```

#### Test OJS Connection
```bash
cd ~/public_html/api/
php scripts/test-ojs-connection.php

# Expected:
# ✅ OJS database connection: SUCCESS
# ✅ Connected to database: submitma_ojs
# ✅ OJS 'submissions' table found
```

#### Set Up Cron Job
```bash
# Edit crontab
crontab -e

# Add line (sync every 15 minutes)
*/15 * * * * cd ~/public_html/api && php scripts/ojs-sync-cron.php >> ~/logs/ojs-sync.log 2>&1
```

---

## Troubleshooting

### Issue: "500 Internal Server Error" on API

**Check Apache error log:**
```bash
tail -f /var/log/apache2/error.log
```

**Common causes:**
1. `.htaccess` not working → Enable mod_rewrite
2. PHP version < 8.2 → Upgrade PHP
3. Missing vendor folder → Run composer install in api/
4. Wrong file permissions → `chmod -R 755 api/`

---

### Issue: "404 Not Found" on Frontend Pages

**Check .htaccess:**
```bash
cat ~/public_html/.htaccess
```

**Ensure mod_rewrite enabled:**
```bash
apache2ctl -M | grep rewrite
```

**Verify file exists:**
```bash
ls -la ~/public_html/admin/login.html
```

---

### Issue: "Database Connection Failed"

**Test connection:**
```bash
cd ~/public_html/api/
php scripts/test-db.php
```

**Check .env:**
```bash
cat .env | grep DB_
```

**Test MySQL:**
```bash
mysql -u digitopu_user -p digitopu_journals -e "SHOW TABLES;"
```

---

### Issue: "JWT Token Invalid"

**Regenerate JWT secret:**
```bash
openssl rand -base64 64 | tr -d '\n'
```

**Update .env:**
```env
JWT_SECRET=new_generated_secret_here
```

**Clear browser cookies and try login again**

---

### Issue: "Composer Dependencies Missing"

```bash
cd ~/public_html/api/

# Install dependencies
composer install --no-dev --optimize-autoloader

# Fix autoload
composer dump-autoload
```

---

### Issue: "Cannot Write to Storage"

```bash
# Fix permissions
cd ~/public_html/api/
chmod -R 777 storage/
chown -R www-data:www-data storage/  # Ubuntu/Debian
# or
chown -R apache:apache storage/      # CentOS/RHEL
```

---

## Build Script Package.json Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "build:backend": "node scripts/build.js --skip-frontend",
    "build:all": "node scripts/build.js",
    "deploy:prep": "node scripts/build.js",
    "deploy:check": "cd deploy && ls -lah"
  }
}
```

---

## Security Checklist

- [ ] HTTPS enabled (Let's Encrypt)
- [ ] JWT_SECRET is random 64+ characters
- [ ] .env file has 600 permissions
- [ ] Database user has strong password
- [ ] OJS user is read-only
- [ ] APP_DEBUG=false in production
- [ ] mod_security enabled (if available)
- [ ] Regular backups configured
- [ ] Storage directory has correct permissions
- [ ] Admin password is strong (12+ chars)

---

## Backup Strategy

### Database Backup
```bash
# Daily backup
mysqldump -u digitopu_user -p digitopu_journals > backup_$(date +%Y%m%d).sql

# Automated (add to crontab)
0 2 * * * mysqldump -u digitopu_user -p'password' digitopu_journals > ~/backups/db_$(date +\%Y\%m\%d).sql
```

### Files Backup
```bash
# Backup storage folder
tar -czf storage_backup_$(date +%Y%m%d).tar.gz api/storage/

# Backup .env
cp api/.env api/.env.backup_$(date +%Y%m%d)
```

---

## Support

For issues:
1. Check error logs: `tail -f api/storage/logs/error.log`
2. Check Apache logs: `tail -f /var/log/apache2/error.log`
3. Test API health: `curl https://digitopub.com/api/health`
4. Verify database: `php api/scripts/test-db.php`

---

**Last Updated:** 2026-02-01  
**Version:** 1.0.0
