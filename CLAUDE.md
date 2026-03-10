# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitoPub is a scientific journal publishing platform built with Next.js 16, React 19, Prisma, and MySQL. It integrates with Open Journal Systems (OJS) for read-only data synchronization.

## Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production (runs prisma generate first)
bun run start        # Start production server
bun run lint         # Run ESLint
bun run test         # Run Vitest tests
bun run test:watch   # Run tests in watch mode
bun run test:coverage # Run tests with coverage
bunx prisma generate # Generate Prisma client
bunx prisma studio   # Open Prisma Studio GUI
bun run ojs:sync     # Sync data from OJS database
```

## Architecture

### Backend API (Hono RPC Pattern)

The API uses Hono framework with RPC-style endpoints. The main app is defined in `src/server/app.ts` and mounted at `/api/[[...route]]/route.ts`.

- **Route definitions**: Each feature has a `server/route.ts` file defining Hono routes
- **Validation**: Uses `@hono/zod-validator` for request validation with Zod schemas
- **Client**: Use `client` from `src/lib/rpc.ts` for type-safe API calls from frontend

### Feature Structure

Features are organized under `src/features/{feature}/`:
```
src/features/{feature}/
├── server/route.ts    # Hono route definitions
├── server.ts          # Re-exports router
├── schemas/           # Zod validation schemas
├── types/             # TypeScript type definitions
├── api/               # TanStack Query hooks for data fetching
├── hooks/             # React hooks
└── components/        # Feature-specific React components
```

### Database (Prisma + MySQL)

- Schema: `prisma/schema.prisma` - MySQL with BigInt auto-increment IDs
- Client: `lib/db/config.ts` - Uses PrismaMariaDb adapter
- **Important**: All BigInt fields must be serialized using `serializeRecord()` or `serializeMany()` from `src/lib/serialize.ts` before returning JSON responses

### Authentication

- JWT-based auth using `jose` library
- Middleware in `middleware.ts` protects admin routes
- Route definitions in `config/routes.ts` (PUBLIC_ROUTES, ADMIN_ROUTES)
- Auth middleware helpers in `src/lib/auth-middleware.ts`:
  - `requireAuth` - Requires valid session
  - `requireAdmin` - Requires admin or superadmin role
  - `requireRole(...roles)` - Requires specific roles

### OJS Integration

Read-only integration with Open Journal Systems database:
- Client: `src/features/ojs/server/ojs-client.ts`
- Configured via `OJS_DATABASE_*` environment variables
- Uses separate MySQL connection pool with retry logic

### Frontend Patterns

- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS 4 with Radix UI components in `components/ui/`
- **Theme**: `next-themes` with ThemeProvider in root layout
- **Path aliases**: `@/*` maps to project root, `@/src/*` to src directory

## Key Conventions

1. **BigInt Serialization**: Always use `serializeRecord()` or `serializeMany()` when returning Prisma records - BigInt cannot be JSON-serialized directly.

2. **API Response Format**:
   ```typescript
   // Success
   { success: true, data: ..., message?: "..." }
   // Paginated
   { success: true, data: [...], pagination: { page, limit, total, totalPages } }
   // Error
   { success: false, error: "..." }
   ```

3. **Feature Route Pattern**:
   ```typescript
   // server/route.ts
   const app = new Hono()
   app.get("/", async (c) => { ... })
   app.post("/", requireAdmin, zValidator("json", schema), async (c) => { ... })
   export { app as featureRouter }
   ```

4. **Pagination**: Use `parsePagination(c)` and `paginatedResponse()` from `src/lib/pagination.ts`

5. **Database IDs**: All IDs are BigInt. When accepting ID params, convert with `BigInt(id)`.

## Environment Variables

Required:
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- `JWT_SECRET`

Optional (OJS integration):
- `OJS_DATABASE_HOST`, `OJS_DATABASE_NAME`, `OJS_DATABASE_USER`, `OJS_DATABASE_PASSWORD`

## Testing

Tests are in `tests/` directory:
- `tests/unit/` - Unit tests for schemas and utilities
- `tests/integration/` - Integration tests for API routes

Run with `bun run test`. Tests use Vitest with Node environment.