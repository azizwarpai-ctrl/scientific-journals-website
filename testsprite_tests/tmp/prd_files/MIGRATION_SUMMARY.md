# Database Migration Summary: Supabase → PostgreSQL

## ✅ Completed Tasks

### 1. Database Connection & Auth Layer
- ✅ Created `lib/db/config.ts` - PostgreSQL connection pooling with `pg` library
- ✅ Created `lib/db/auth.ts` - JWT-based session management using `jose`
- ✅ Created `lib/db/users.ts` - User CRUD operations with bcrypt password hashing
- ✅ Created `config/routes.ts` - Centralized route configuration (public/admin/API)
- ✅ Updated `proxy.ts` - Integrated route-based authentication middleware
- ✅ Updated `package.json` - Added `pg`, `jose`, `bcryptjs` dependencies

### 2. API Routes (Authentication)
- ✅ Created `/api/auth/login` - Login endpoint with password verification
- ✅ Created `/api/auth/register` - Registration endpoint with password hashing
- ✅ Created `/api/auth/logout` - Logout endpoint clearing JWT session
- ✅ Created `/api/auth/me` - Get current user endpoint

### 3. Admin Pages Updated
- ✅ `/admin/login` - Uses fetch API instead of Supabase auth
- ✅ `/admin/register` - Uses fetch API instead of Supabase auth
- ✅ `/admin/dashboard` - Uses PostgreSQL queries for stats and submissions
- ✅ `components/admin-header.tsx` - Fetches user from `/api/auth/me`
- ✅ `components/admin-sidebar.tsx` - Logout via `/api/auth/logout`

## 🔄 Remaining Files to Update

### Admin Pages (Server Components - High Priority)
1. `/app/admin/journals/page.tsx` - List journals
2. `/app/admin/journals/new/page.tsx` - Create journal (client component)
3. `/app/admin/submissions/page.tsx` - List submissions with filters
4. `/app/admin/submissions/[id]/page.tsx` - Submission details
5. `/app/admin/reviews/page.tsx` - List reviews
6. `/app/admin/messages/page.tsx` - List messages
7. `/app/admin/messages/[id]/page.tsx` - Message details
8. `/app/admin/faq/page.tsx` - List FAQ
9. `/app/admin/faq/new/page.tsx` - Create FAQ (client component)
10. `/app/admin/authors/page.tsx` - List authors
11. `/app/admin/analytics/page.tsx` - Analytics dashboard
12. `/app/admin/settings/page.tsx` - Admin settings

### Public Pages (Client Components - Lower Priority)
13. `/app/help/submission-service/page.tsx` - Message submission form
14. `/app/help/technical-support/page.tsx` - Support form

## 🗄️ Database Schema Status
- ✅ All tables exist in PostgreSQL (via Supabase)
- ✅ RLS policies are in place
- ⚠️ Need to add `password_hash` column to `admin_users` table

## 🔧 Required SQL Migrations
Run this SQL to add password support:

```sql
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

## 🎯 Migration Strategy

### For Server Components (Admin Pages):
1. Replace `import { createClient } from "@/lib/supabase/server"`
2. Use `import { query } from "@/lib/db/config"` and `import { getSession } from "@/lib/db/auth"`
3. Replace `supabase.from().select()` with SQL queries
4. Update authentication checks to use `getSession()` instead of `supabase.auth.getUser()`

### For Client Components (Forms):
1. Replace `import { createClient } from "@/lib/supabase/client"`
2. Use `fetch()` API calls to backend endpoints
3. Create API routes as needed for data mutations

## 📝 Key Changes Made

1. **Authentication**: JWT sessions (HTTP-only cookies) instead of Supabase Auth
2. **Database Access**: Direct PostgreSQL queries with `pg` instead of Supabase client
3. **Password Storage**: bcrypt hashing instead of Supabase Auth
4. **Session Management**: `jose` library for JWT signing/verification
5. **Route Protection**: Centralized in `proxy.ts` using `routes.ts` configuration

## 🚀 Benefits

- ✅ No vendor lock-in (direct PostgreSQL access)
- ✅ Better performance (no extra API layer)
- ✅ Full SQL control (complex queries, transactions)
- ✅ Simplified authentication (JWT sessions)
- ✅ Centralized route management (403 errors fixed)
- ✅ Cleaner separation of concerns

## ⚠️ Important Notes

- The `@supabase/ssr` package can be removed once all files are updated
- The `lib/supabase` directory can be deleted after migration
- Environment variables from Supabase (POSTGRES_URL, etc.) are still used
- RLS policies remain active (queries still respect user context)
