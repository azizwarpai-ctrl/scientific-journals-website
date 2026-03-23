# DigitoPub Constitution

## Core Principles

### I. Library-First Architecture
- Features are organized under `src/features/{feature}/` with clear separation: server, api, hooks, components, schemas, types
- Each feature must be self-contained and independently testable
- Backend API follows Hono RPC pattern with proper validation

### II. API Response Standardization
- All API responses use standardized format: `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- BigInt fields MUST be serialized using `serializeRecord()` or `serializeMany()` before JSON responses
- Pagination responses include: `{ data: [...], pagination: { page, limit, total, totalPages } }`

### III. Authentication & Authorization
- digitopub.com owns admin authentication (JWT-based)
- submitmanager.com (OJS) owns all public user identities
- SSO flow: New users → provision + token → redirect; Returning users → direct OJS access
- Middleware protects admin routes; Auth helpers: `requireAuth`, `requireAdmin`, `requireRole`

### IV. Database Conventions
- Prisma with MySQL; BigInt auto-increment IDs
- All database operations use Prisma client from `lib/db/config.ts`
- Auth uses `jose` library with JWT sessions from `lib/db/auth.ts`

### V. Testing Standards
- Tests in `tests/` directory: unit tests for schemas/utilities, integration tests for API routes
- Run with `bun run test`; Coverage with `bun run test:coverage`
- Vitest with Node environment

## Additional Constraints

### Technology Stack
- Next.js 16, React 19, Prisma, MySQL, Hono, TanStack Query v5
- Styling: Tailwind CSS 4 with Radix UI components
- Path alias: `@/*` maps to project root, `@/src/*` to src directory
- Validation: Zod v4 with `@hono/zod-validator`

### Environment Variables
- Required: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_ORIGINS`
- OJS Integration (optional): `OJS_DATABASE_*`, `OJS_BASE_URL`, `OJS_SYNC_ENABLED`

## Development Workflow

### Code Quality Gates
- Run `bun run lint` and `bun run test` before commits
- All BigInt fields must be serialized in API responses
- Use existing component patterns from `components/ui/`

### Feature Implementation Pattern
1. Define Zod schemas in `features/{feature}/schemas/`
2. Create Hono routes in `features/{feature}/server/route.ts`
3. Add TanStack Query hooks in `features/{feature}/api/`
4. Compose routes in `src/server/app.ts`

**Version**: 1.0.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
