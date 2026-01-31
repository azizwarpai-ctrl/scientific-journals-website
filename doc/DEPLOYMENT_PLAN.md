# Comprehensive Project Review & Deployment Plan for DigitoPub

This plan provides a systematic approach to review, verify, and deploy the DigitoPub Scientific Journals Platform to SiteGround hosting. The project consists of a Next.js static frontend and a PHP Clean Architecture backend with OJS integration.

## Executive Summary

- **Frontend**: Next.js 16 Static Export (`output: "export"`)
- **Backend**: PHP 8.2+ Clean Architecture API
- **Database**: MySQL 8.0
- **Hosting**: SiteGround (Apache/PHP/MySQL)

---

## Phase 1: Project Understanding & Architecture Analysis

### 1.1 Current Architecture Overview

**Frontend (Next.js 16):**
- Static export (output: "export") - generates HTML/CSS/JS files
- No Node.js runtime required after build
- Query parameter-based routing (e.g., `/journals/detail?id=1`)
- API communication via `lib/php-api-client.ts`
- React Query for data fetching

**Backend (PHP 8.2+):**
- Clean Architecture pattern
- RESTful API with JWT authentication
- Mandatory 2FA (email OTP)
- MySQL database
- OJS (Open Journal Systems) read-only integration

### 1.2 System Requirements Verification (SiteGround)
- ✅ PHP 8.2+ (SiteGround supports PHP 8.1+)
- ✅ MySQL database (SiteGround provides MySQL)
- ✅ Static file hosting (HTML/CSS/JS)
- ✅ Apache with mod_rewrite
- ✅ Composer support (available via SSH)
- ⚠️ No Node.js runtime (not needed - using static export)

---

## Phase 2: Complete Project Review Checklist

### 2.1 Frontend Code Review

**Build System Verification:**
```bash
# Test static export build
bun run build

# Expected output:
# - Exit code: 0
# - All routes marked as ○ (Static)
# - Output directory: ./out/
```

**Critical Files to Verify:**
- `next.config.mjs`: Confirm `output: "export"` setting
- `.env.production`: Verify `NEXT_PUBLIC_API_URL=https://digitopub.com/api`
- `lib/php-api-client.ts`: Check API base URL configuration

### 2.2 Backend Code Review

**Database Schema Review:**
```bash
# Run from backend directory (if script exists)
php scripts/inspect-db.php
```
**Expected Tables:**
- `admin_users` (Authentication)
- `journals` (Metadata)
- `submissions` (OJS synced data)
- `messages` (Contact form)
- `faq_solutions` (Help content)
- `verification_tokens` (2FA OTP)

### 2.3 API Integration Verification

**Endpoint Testing Matrix:**

| Endpoint | Method | Auth | Expected Response |
|----------|--------|------|-------------------|
| `/api/health` | GET | No | `{"status":"ok"}` |
| `/api/auth/login` | POST | No | `{"tempToken":"..."}` |
| `/api/auth/verify-2fa` | POST | No | `{"token":"..."}` |
| `/api/auth/me` | GET | Yes | User object |
| `/api/journals` | GET | No | Journals array |

---

## Phase 3: Build Process Verification

### 3.1 Frontend Build
```bash
# Clean build
rm -rf .next out
# Build static export
bun run build
# Verify output
ls -la out/
```
**Expected:** `out/` directory containing `index.html`, `_next/`, `admin/`, etc.

### 3.2 Backend Build
```bash
# Build backend for production
npm run build:backend
# Verify output
ls -la backend-out/
```
**Expected:** `backend-out/` directory containing `index.php`, `vendor/`, `src/`, `.htaccess`.

---

## Phase 4: Deployment Strategy for SiteGround

### 4.1 Pre-Deployment Preparation

1.  **Database Configuration**:
    - Create MySQL database: `digitopu_journals`
    - Create user: `digitopu_admin`
2.  **Email Configuration**:
    - Use SiteGround SMTP or Gmail App Password.
3.  **Generate Credentials**:
    ```bash
    # JWT Secret (64 chars)
    openssl rand -base64 48
    ```

### 4.2 Deployment Steps

**Step 1: Database Deployment**
Import schema and initial data via phpMyAdmin or SSH:
```sql
source scripts/001_create_tables.sql;
source scripts/002_insert_sample_data.sql;
```

**Step 2: Backend Deployment**
1.  Upload `backend-out/` contents to `public_html/api/`.
2.  Create `.env` file in `public_html/api/` with production values:
    ```env
    APP_ENV=production
    APP_URL=https://digitopub.com
    DB_HOST=localhost
    DB_DATABASE=digitopu_journals
    DB_USERNAME=digitopu_admin
    DB_PASSWORD=[PASSWORD]
    JWT_SECRET=[SECRET]
    ```

**Step 3: Frontend Deployment**
1.  Upload `out/` contents to `public_html/`.
2.  Ensure `.htaccess` is present in `public_html/` for URL rewriting.

**Step 4: OJS Sync Cron Job**
Add to SiteGround Cron Jobs:
```
*/15 * * * * /usr/local/bin/php /home/digitopu/public_html/api/scripts/ojs-sync-cron.php >> /home/digitopu/logs/ojs-sync.log 2>&1
```

---

## Phase 5: Post-Deployment Verification

### 5.1 Sanity Checks
- Visit `https://digitopub.com` -> Should load Homepage.
- Visit `https://digitopub.com/api/health` -> Should return `ok`.
- Visit `https://digitopub.com/admin` -> Should redirect to login.

### 5.2 2FA Flow Test
1.  Log in with admin credentials.
2.  Receive OTP via email.
3.  Enter OTP.
4.  Verify access to Dashboard.

---

## Phase 6: Monitoring & Maintenance

- **Logs**: Monitor `storage/logs/app.log` in the API directory.
- **Backups**: Enable daily backups in SiteGround.
- **Updates**:
    - **Frontend**: Rebuild locally -> Upload `out/` to `public_html/`.
    - **Backend**: Rebuild locally -> Upload `backend-out/` to `public_html/api/`.
