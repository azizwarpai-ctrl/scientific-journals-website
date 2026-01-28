# Project Review & Testing Implementation Plan

## Overview

This plan provides a systematic approach to review and verify the integrity of the DigitoPub Scientific Journals platform, ensuring all components function correctly, APIs are properly integrated, and documentation is up-to-date.

## Current Architecture Summary

**Frontend:**
- Next.js 16 with static export (`output: "export"`)
- 28 pages across public, admin, and journal sections
- Query parameter-based routing for dynamic data
- Professional error handling (no fallback data)
- React Query for data fetching

**Backend:**
- PHP 8.2+ with Clean Architecture
- RESTful API with JWT authentication
- Mandatory 2FA (email OTP)
- OJS (Open Journal Systems) integration
- MySQL database

---

## Phase 1: Frontend Structure & Logic Review

### 1.1 Static Export Verification

**Objective:** Ensure all pages build correctly as static HTML

**Tasks:**
- [ ] Run `bun run build` and verify exit code 0
- [ ] Confirm all 30 routes show as `○ (Static)`
- [ ] Check `out/` directory structure
- [ ] Verify no `[id]` dynamic route folders exist
- [ ] Test that `out/` can be served from any static host

**Validation:**
```bash
bun run build
ls -R out/ | grep -E "\[.*\]" # Should return empty
```

### 1.2 Page-by-Page Logic Review

**Public Pages:**
- [ ] `/` - Homepage with featured journals, proper links
- [ ] `/journals` - List view with query param links
- [ ] `/journals/detail?id=X` - Error handling, retry logic
- [ ] `/journals/login?id=X` - Error handling, all 4 role tabs
- [ ] `/about` - Static content loads
- [ ] `/contact` - Form submission to API
- [ ] `/help/*` - All help pages accessible

**Admin Pages:**
- [ ] `/admin/login` - 2FA flow (Step 1 + Step 2)
- [ ] `/admin/dashboard` - Protected route, auth check
- [ ] `/admin/journals` - List + Create modal
- [ ] `/admin/messages` - List + Detail modal
- [ ] `/admin/submissions` - List + Detail modal (from OJS)
- [ ] `/admin/faq` - CRUD operations
- [ ] `/admin/analytics` - Data visualization
- [ ] `/admin/settings` - Profile management

**Critical Checks:**
- All query parameter routing works correctly
- Modals open/close properly (messages, submissions)
- No broken internal links
- Loading states display during API calls
- Error states show with retry buttons

### 1.3 Component Integrity

**Navigation:**
- [ ] `components/navbar.tsx` - All links valid
- [ ] Desktop + mobile menu functionality
- [ ] Auth state reflected in UI

**UI Components:**
- [ ] Dialogs/Modals close on outside click
- [ ] Forms validate inputs
- [ ] Buttons have proper loading states
- [ ] Cards display data correctly

---

## Phase 2: Backend Architecture Review

### 2.1 Clean Architecture Compliance

**Domain Layer:**
- [ ] Review `backend/src/Domain/Entities/` for business logic
- [ ] Check repository interfaces are abstraction-only
- [ ] Verify no infrastructure dependencies

**Application Layer:**
- [ ] Review use cases in `Application/UseCases/`
- [ ] Check OTP service logic (`Application/Services/OTPService.php`)
- [ ] Verify OJS sync service (`Application/Services/OJSSyncService.php`)

**Infrastructure Layer:**
- [ ] Database repositories use PDO prepared statements
- [ ] Email service configured correctly
- [ ] JWT implementation secure (64+ char secret)

**Presentation Layer:**
- [ ] Controllers return proper JSON responses
- [ ] Middleware protects admin routes
- [ ] DTOs validate all inputs

**Validation:**
```bash
cd backend
php scripts/test-db.php
php scripts/test-ojs-connection.php
```

### 2.2 Security Audit

**Authentication:**
- [ ] Passwords hashed with bcrypt
- [ ] JWT secret is strong (check `.env`)
- [ ] HTTP-only cookies set for session tokens
- [ ] OTP expiration enforced (15 min)
- [ ] Old OTPs invalidated after use

**SQL Injection:**
- [ ] All queries use PDO prepared statements
- [ ] No string concatenation in queries

**Input Validation:**
- [ ] All POST endpoints validate via DTOs
- [ ] Email addresses sanitized
- [ ] XSS protection on text fields

**CORS:**
- [ ] CORS headers configured for frontend domain
- [ ] OPTIONS preflight handled

---

## Phase 3: API Integration Verification

### 3.1 Frontend-Backend Connection

**Environment Variables:**
- [ ] `NEXT_PUBLIC_API_URL` set correctly in frontend `.env`
- [ ] Points to PHP backend (e.g., `http://localhost:8000`)

**API Client Testing:**
```typescript
// Test each API module from lib/php-api-client.ts
✓ healthAPI.check()
✓ authAPI.login()
✓ authAPI.verify2FA()
✓ journalsAPI.list()
✓ journalsAPI.get(1)
✓ faqAPI.list()
✓ messagesAPI.create()
✓ ojsAPI.listSubmissions()
```

**Manual API Tests:**
```bash
# Health check
curl http://localhost:8000/api/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# List journals
curl http://localhost:8000/api/journals

# Get journal (should work for frontend)
curl http://localhost:8000/api/journals/show?id=1
```

### 3.2 Data Flow Verification

**Journal Detail Page:**
1. [ ] User visits `/journals/detail?id=1`
2. [ ] `useSearchParams` reads `id`
3. [ ] `journalsAPI.get(1)` called
4. [ ] PHP backend queries database
5. [ ] Response returned with journal data
6. [ ] Page renders journal info
7. [ ] On error: Error UI with retry button

**Admin Authentication:**
1. [ ] User enters email/password
2. [ ] `authAPI.login()` sends credentials
3. [ ] Backend validates, generates OTP
4. [ ] OTP emailed (or logged in dev)
5. [ ] `tempToken` returned to frontend
6. [ ] User enters OTP
7. [ ] `authAPI.verify2FA()` validates
8. [ ] Session JWT set in HTTP-only cookie
9. [ ] Dashboard accessible

**OJS Data Sync:**
1. [ ] Cron job runs `ojs-sync-cron.php`
2. [ ] Connects to OJS database (read-only)
3. [ ] Fetches submissions, reviews, publications
4. [ ] Stores in local `submissions` table
5. [ ] Admin views synced data via `/admin/submissions`

---

## Phase 4: Critical Feature Testing

### 4.1 Authentication Flow

**Test Case 1: Successful 2FA Login**
```
1. Navigate to /admin/login
2. Enter valid email/password
3. Click "Login"
4. Verify OTP sent (check email or backend/storage/last_otp.txt)
5. Enter OTP
6. Verify redirect to /admin/dashboard
7. Verify session persists on refresh
```

**Test Case 2: Invalid Credentials**
```
1. Enter wrong password
2. Verify error message displayed
3. Verify no OTP sent
```

**Test Case 3: Expired OTP**
```
1. Login and receive OTP
2. Wait 15+ minutes
3. Enter OTP
4. Verify error: "OTP expired"
```

### 4.2 Journal Management

**Test Case 1: View Journal Details**
```
1. Navigate to /journals
2. Click "View Journal" on any journal
3. Verify URL is /journals/detail?id=X
4. Verify journal data loads
5. Verify all tabs (Overview, Info, Editorial, etc.) work
```

**Test Case 2: API Failure Handling**
```
1. Stop PHP backend
2. Navigate to /journals/detail?id=1
3. Verify error UI displays
4. Verify "Try Again" button present
5. Restart backend
6. Click "Try Again"
7. Verify data loads
```

### 4.3 Admin Modals

**Test Case 1: Message Details Modal**
```
1. Login as admin
2. Navigate to /admin/messages
3. Click on a message row
4. Verify modal opens with full details
5. Click outside or X to close
6. Verify modal dismisses
```

**Test Case 2: Submission Details Modal**
```
1. Navigate to /admin/submissions
2. Click on a submission
3. Verify modal shows OJS data
4. Verify authors, status, dates display
```

### 4.4 Form Submissions

**Test Case 1: Contact Form**
```
1. Navigate to /contact
2. Fill out all fields
3. Submit form
4. Verify API call to /api/messages
5. Verify success message
6. Verify message appears in /admin/messages
```

**Test Case 2: FAQ Creation**
```
1. Login as admin
2. Navigate to /admin/faq
3. Click "Create FAQ"
4. Fill in question/answer
5. Submit
6. Verify appears in FAQ list
```

---

## Phase 5: OJS Integration Testing

### 5.1 Connection Verification

**Tasks:**
- [ ] Run `php backend/scripts/test-ojs-connection.php`
- [ ] Verify connection to submitmanger.com database
- [ ] Check read-only user permissions
- [ ] Confirm OJS tables accessible

### 5.2 Data Sync Testing

**Manual Sync:**
```bash
cd backend
php scripts/ojs-sync-cron.php
```

**Verification:**
- [ ] Check MySQL `submissions` table has data
- [ ] Verify timestamps updated
- [ ] Confirm data matches OJS source
- [ ] Check for sync errors in logs

**Frontend Display:**
- [ ] Login to admin
- [ ] Navigate to `/admin/submissions`
- [ ] Verify synced submissions displayed
- [ ] Click on a submission
- [ ] Verify all fields populated

### 5.3 Automated Sync Setup

**Cron Configuration (Linux):**
```bash
*/15 * * * * php /path/to/backend/scripts/ojs-sync-cron.php >> /var/log/ojs-sync.log 2>&1
```

**Windows Task Scheduler:**
- Program: `php.exe`
- Arguments: `C:\path\to\backend\scripts\ojs-sync-cron.php`
- Trigger: Every 15 minutes

**Verification:**
- [ ] Wait 15 minutes
- [ ] Check sync log file
- [ ] Verify new data appears

---

## Phase 6: Security & Sensitive Details

### 6.1 Environment Security

**Frontend `.env` Check:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000  # Dev
# or
NEXT_PUBLIC_API_URL=https://api.yourdomain.com  # Prod
```

**Backend `.env` Check:**
```env
# Strong JWT secret (64+ chars)
JWT_SECRET=<random-64-char-string>

# Production settings
APP_ENV=production
APP_DEBUG=false

# Database credentials secured
DB_PASSWORD=<strong-password>

# OJS credentials
OJS_DB_PASSWORD=<readonly-password>

# SMTP configured for OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=<app-password>
```

### 6.2 Sensitive Data Protection

**Checklist:**
- [ ] `.env` files in `.gitignore`
- [ ] No hardcoded credentials in code
- [ ] OTP codes never logged in production
- [ ] Password reset tokens secured
- [ ] Admin panel requires authentication
- [ ] OJS connection is read-only

### 6.3 Production Hardening

**Tasks:**
- [ ] Set `APP_DEBUG=false` in production
- [ ] Enable HTTPS enforcement
- [ ] Configure security headers
- [ ] Implement rate limiting
- [ ] Set up error monitoring
- [ ] Configure backups for database

---

## Phase 7: Build & Deployment Verification

### 7.1 Frontend Build

```bash
cd /path/to/scientific-journals-website
bun run build
```

**Success Criteria:**
- Exit code 0
- All 30 routes static
- `out/` directory created
- No build errors

### 7.2 Backend Deployment

**Shared Hosting:**
```bash
# Upload to server
scp -r backend/* user@server:/path/to/public_html/api/

# Install dependencies (on server)
cd /path/to/public_html/api
composer install --no-dev --optimize-autoloader

# Set permissions
chmod -R 755 storage/
```

**Test Deployment:**
```bash
curl https://yourdomain.com/api/health
```

### 7.3 Frontend Deployment

**Options:**
1. **Static Host (Vercel, Netlify):**
   - Upload `out/` directory
   - Set `NEXT_PUBLIC_API_URL` env var

2. **Apache/Nginx:**
   - Copy `out/*` to document root
   - Configure clean URLs

**Verification:**
- [ ] All pages accessible
- [ ] API calls reach backend
- [ ] CORS allows cross-origin requests
- [ ] Assets load correctly

---

## Phase 8: Documentation Updates

### 8.1 Update Frontend README.md

**Sections to Update:**

1. **Quick Start:**
   - [ ] Add static export instructions
   - [ ] Update backend connection setup
   
2. **Architecture:**
   - [ ] Document query parameter routing
   - [ ] Explain admin modals pattern
   - [ ] Add error handling approach

3. **Deployment:**
   - [ ] Static hosting instructions
   - [ ] Environment variable configuration
   - [ ] CORS setup

4. **API Integration:**
   - [ ] Link to `lib/php-api-client.ts` documentation
   - [ ] Explain API client usage
   - [ ] Add troubleshooting for API errors

**New Sections:**
```markdown
## Static Export Architecture

This application uses Next.js static export with query parameters for dynamic content:

- `/journals/detail?id=1` instead of `/journals/[id]`
- Admin modals instead of separate detail pages
- Runtime data fetching from PHP backend API

## Error Handling

No fallback data is used. All API failures display:
- Clear error messages
- Retry functionality
- Navigation alternatives
```

### 8.2 Update Backend README.md

**Sections to Update:**

1. **Installation:**
   - [ ] Verify all commands are accurate
   - [ ] Test with fresh installation

2. **API Endpoints:**
   - [ ] Document all current endpoints
   - [ ] Add request/response examples
   - [ ] Include error codes

3. **OJS Integration:**
   - [ ] Update sync instructions
   - [ ] Add troubleshooting section
   - [ ] Document data mapping

4. **Security:**
   - [ ] Complete security checklist
   - [ ] Add production hardening steps
   - [ ] Document authentication flow diagram

**New Sections:**
```markdown
## Frontend Integration

The PHP backend serves a Next.js static frontend via RESTful API:

### CORS Configuration
Ensure `public/index.php` allows frontend domain:
```php
header('Access-Control-Allow-Origin: https://yourdomain.com');
header('Access-Control-Allow-Credentials: true');
```

### API Response Format
All endpoints return:
```json
{
  "success": true,
  "data": {...},
  "meta": {"timestamp": "2024-01-27T19:00:00Z"}
}
```
```

### 8.3 Create API Integration Guide

**New File: `docs/API_INTEGRATION.md`**

```markdown
# API Integration Guide

## Overview
Complete guide to integrating the Next.js frontend with PHP backend.

## Authentication Flow
[Detailed diagram and explanation]

## API Client Usage
[Code examples for each module]

## Error Handling
[Best practices and examples]

## Testing
[How to test API integration]
```

---

## Phase 9: Final Verification Checklist

### Frontend
- [ ] Build succeeds (`bun run build`)
- [ ] All pages render without errors
- [ ] Links navigate correctly
- [ ] Forms submit successfully
- [ ] Error states display properly
- [ ] Loading states show during API calls

### Backend
- [ ] Health check passes
- [ ] Database connection works
- [ ] Authentication flow complete
- [ ] OJS sync functional
- [ ] All endpoints tested
- [ ] Security checklist complete

### Integration
- [ ] Frontend calls backend successfully
- [ ] CORS configured correctly
- [ ] Cookies set for authentication
- [ ] Error responses handled
- [ ] Data flows correctly

### Documentation
- [ ] README.md updated
- [ ] backend/README.md updated
- [ ] API guide created
- [ ] Deployment instructions verified
- [ ] Troubleshooting section complete

---

## Testing Schedule

### Week 1: Structure & Logic
- Days 1-2: Frontend page review
- Days 3-4: Backend architecture review
- Day 5: Component integrity tests

### Week 2: Integration & Features
- Days 1-2: API integration verification
- Days 3-4: Critical feature testing
- Day 5: OJS integration testing

### Week 3: Security & Deployment
- Days 1-2: Security audit
- Days 3-4: Build & deployment verification
- Day 5: Documentation updates

---

## Success Criteria

✅ All tests pass without errors  
✅ Build completes successfully  
✅ API integration verified end-to-end  
✅ Security checklist 100% complete  
✅ Documentation accurate and up-to-date  
✅ Production deployment tested  
✅ No critical bugs or blockers  

---

## Notes

- Run tests in development environment first
- Document all issues in issue tracker
- Update plan as project evolves
- Keep stakeholders informed of progress
