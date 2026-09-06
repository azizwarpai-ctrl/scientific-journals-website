## ✅ Issue #156 Implementation Complete

### Changes Delivered

**Nav & Route cleanup:**
- Removed `Packages` tab from desktop nav and mobile dropdown in `components/navbar.tsx`
- Deleted `app/packages/` directory — route now returns 404
- Removed `/packages` from `PUBLIC_ROUTES` in `config/routes.ts`
- All `/packages` href references replaced with `/submit-manager#pricing` across all components

**Root-cause fix — "Failed to load pricing" on /submit-manager:**
- The Hono RPC client base URL is `/api`, so billing routes must use `client.billing.plans` not `client.api.billing.plans` (double `/api` caused HTTP 404)
- Fixed in all 8 billing API hooks + `plan-edit-client.tsx`

**`components/submit-manager/pricing-table.tsx` improvements:**
- `features` parsing now supports both `string[]` (DB array) and `Record<string, boolean>` (legacy format)
- Retry button now calls `refetch()` instead of `window.location.reload()`

**Schema & type fixes:**
- Removed `BigInt` transform from `journal_id` in `pricingPlanCreateSchema` (fixes react-hook-form compatibility)
- Added `planFormSchema` + `PlanFormValues` for form-specific type inference
- BigInt conversion moved to route handler where Prisma requires it
- `plan-form.tsx` uses `String()` coercion on serialized Date fields

**API routes (`src/features/billing/server/route.ts`):**
- `GET /api/billing/plans` — public, active-only plans
- `GET /api/billing/plans/:id` — public, single plan
- `GET /api/billing/plans/slug/:slug` — public, by slug
- `GET /api/billing/plans/admin/all` — admin, all including inactive
- `POST/PATCH/DELETE /api/billing/plans/:id` — admin CRUD

### Verification
```
bun run test    -> Test Files 80 passed (80) | Tests 888 passed (888)
tsc --noEmit    -> 0 errors
bun run lint    -> 0 errors (81 warnings, all pre-existing)
```

### Branch
`feat/issue-156-unify-pricing-via-pricing-plan`
