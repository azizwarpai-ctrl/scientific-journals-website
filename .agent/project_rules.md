# DigitoPub Scientific Journals Platform - Project Rules

## Project Overview

**DigitoPub** is a comprehensive digital publishing platform for academic and scientific journals. The platform features a modern Next.js frontend statically exported and a PHP backend following Clean Architecture principles.

### Key Technologies
- **Frontend**: Next.js 16 (App Router) with static export (`output: "export"`)
- **Backend**: PHP 8.2+ (Clean Architecture)
- **Database**: MySQL 8.0 (Docker)
- **Authentication**: JWT-based with mandatory Two-Factor Authentication (2FA)
- **Integration**: Syncs with Open Journal Systems (OJS) - read-only

---

## Architecture Principles

### Frontend Structure
- **App Router**: All routes in `app/` directory
- **Static Export**: Built with `bun run build` to `out/` directory
- **API Client**: All backend communication via `lib/php-api-client.ts`
- **State Management**: React Query (`@tanstack/react-query`) for server state
- **UI Components**: Radix UI primitives with Tailwind CSS

### Backend Structure (Clean Architecture)
```
Domain Layer → Entities, Repository Interfaces
Application Layer → Use Cases, Services (OTP, Sync)
Infrastructure Layer → PDO Repositories, Email, OJS
Presentation Layer → Controllers, Middleware, DTOs
```

---

## Authentication Rules

### 2FA Flow (MANDATORY)
1. **Step 1**: User submits email/password → Receives `tempToken` (15min validity)
2. **Step 2**: System sends 6-digit OTP via email
3. **Step 3**: User submits `tempToken` + OTP → Receives session JWT (7 days)
4. **Step 4**: JWT stored in HTTP-only cookie (backend) or client-side (frontend static)

### Protected Routes
- **All `/admin/*` routes** except `/admin/login` and `/admin/register` require authentication
- **Authentication Check**: Use `useCurrentUser()` hook from `lib/client/hooks/useAuth.ts`
- **Redirect Logic**: Unauthenticated users → `/admin/login`

### Session Management
- **Token Storage**: Due to static export, tokens managed client-side (sessionStorage/localStorage)
- **Token Validation**: Backend validates JWT on each protected API call
- **Logout**: Clear client tokens + call `/api/auth/logout`

---

## Development Rules

### Frontend Development
1. **Component Location**: 
   - UI primitives → `components/ui/`
   - Feature components → `components/`
   - Admin-specific → `components/admin-*`
2. **Styling**: 
   - Use Tailwind CSS classes
   - Follow existing design tokens in `globals.css`
   - Dark mode support via `ThemeProvider`
3. **API Calls**:
   - Use hooks from `lib/client/hooks/useAuth.ts`
   - Use React Query for all API interactions
   - Handle errors gracefully with user feedback

### Backend Development
1. **Clean Architecture**: Respect layer boundaries
2. **Security**: 
   - All admin endpoints protected by `AuthMiddleware`
   - Input validated via DTOs
   - Passwords hashed with bcrypt
3. **Database**: 
   - Use PDO prepared statements (SQL injection prevention)
   - Migrations in `scripts/` directory

### Code Style
- **TypeScript**: Strict mode enabled
- **Naming**: 
  - Components: PascalCase (`AdminHeader`)
  - Hooks: camelCase with `use` prefix (`useCurrentUser`)
  - Files: kebab-case (`admin-layout-wrapper.tsx`)

---

## Testing Rules

### Frontend Testing
- Manual browser testing for UI changes
- Test authentication flows end-to-end
- Verify static export builds successfully

### Backend Testing
```bash
# Test database connection
php backend/scripts/test-db.php

# Test all API endpoints
php backend/scripts/test-all-endpoints.php

# Test auth flow
php backend/scripts/test-auth-flow.php
```

---

## Deployment Rules

### Frontend Build
```bash
bun run build  # Outputs to out/
```
- Verify no runtime errors in static pages
- Check all images are optimized (`unoptimized: true` in config)

### Backend Build
```bash
npm run build:backend  # Runs PowerShell script
```
- Outputs production-ready backend to `backend-out/`
- Excludes dev dependencies and tests

### Static Export Restrictions
- **No Dynamic Routes with `generateStaticParams`** - Use client-side routing
- **No Server Components** - Mark all components as `"use client"` if they use hooks
- **No Middleware** - Auth protection must be client-side

---

## OJS Integration Rules

### Read-Only Sync
- **Never write to OJS database**
- **Sync Schedule**: Every 15 minutes via cron
- **Sync Script**: `backend/scripts/ojs-sync-cron.php`
- **What Syncs**: Submission metadata, review status, published articles
- **What Doesn't**: Files, user passwords

### OJS Configuration
```env
OJS_DB_HOST=submitmanger.com
OJS_DB_NAME=ojs_database
OJS_DB_USER=readonly_user
OJS_BASE_URL=https://submitmanger.com
```

---

## File Structure Rules

### Do Not Modify
- `node_modules/`, `vendor/`
- `.next/`, `out/`, `backend-out/` (build outputs)
- `docker-compose.yml` (database config)

### Version Control
- Track: Source files, configs, docs
- Ignore: Build outputs, dependencies, `.env`

---

## Error Handling Rules

### Frontend
- **API Errors**: Display user-friendly messages via toast/alert
- **Auth Errors**: 
  - `401 Unauthorized` → Redirect to `/admin/login`
  - `403 Forbidden` → Show "Access Denied" message
- **Network Errors**: Retry with exponential backoff (React Query)

### Backend
- **Production**: Generic error messages (don't leak stack traces)
- **Development**: Detailed errors for debugging
- **Logging**: Write to `backend/storage/logs/`

---

## Security Rules

### CRITICAL: Never Commit
- `.env` files with real credentials
- JWT secrets
- Database passwords
- SMTP credentials

### Production Checklist
- [ ] JWT secret is 64+ characters
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Error messages sanitized

---

## Documentation Rules

- **Update README**: When adding major features
- **API Changes**: Document in `doc/API_INTEGRATION.md`
- **Architecture Changes**: Update backend `README.md`

---

## Common Commands

```bash
# Development
bun dev                    # Start Next.js dev server
npm run backend:dev        # Start PHP server
docker-compose up -d       # Start MySQL

# Production
bun run build              # Build frontend
npm run build:backend      # Build backend
npm run backend:sync       # Run OJS sync

# Testing
npm run backend:test       # Test backend connections
```

---

## Critical Notes

1. **Static Export Limitation**: Admin authentication MUST be handled client-side since Next.js middleware doesn't work with `output: "export"`
2. **2FA is Mandatory**: All admin users must complete 2FA - no bypass
3. **OJS is Read-Only**: Never attempt write operations to OJS database
4. **PHP 8.2+ Required**: Backend uses modern PHP features (enums, readonly properties)
