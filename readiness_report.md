# Phase 1: Pre-Modification Analysis & Readiness Report

## 1. Structured Architectural Assessment

### Overall Project Structure & Module Boundaries
- **Frontend Architecture:** Utilizes Next.js App Router (`app/`). The application relies heavily on React Server Components (RSCs) and client components, organized into logical domains (`app/admin/`, `app/login/`, `app/journals/`).
- **Feature-Based Modularity:** Features are organized under `src/features/<feature>` (e.g., `auth`, `journals`, `messages`, `ojs`, `solutions`). This encapsulates both backend routes (`server/route.ts`), frontend logic (`api/hooks`), and Zod schemas into cohesive business domains.
- **Backend API & Global Routing:** Powered by **Hono**. The global router (`src/server/app.ts`) acts as the base application mounted under Next.js App Router's `app/api/[[...route]]/route.ts`. 
- **Frontend-Backend Interaction:** React Query combined with Hono RPC (`hc` client typed with `AppType`) handles typed requests in some components (`useLogin` in `app/login/page.tsx`), providing strong end-to-end typed contracts. 
- **Database & State:** Prisma is used as the ORM (`prisma/schema.prisma`). Identifiers use `BigInt`, requiring serialization layers to prevent JSON parsing errors.

### Authentication & Authorization Flow
- **Session Strategy:** Uses stateless JWTs signed via `jose` stored in HttpOnly cookies (`auth_token`). Handled by Next.js `cookies()` inside `lib/db/auth.ts`.
- **Global Middleware Security:** Next.js `middleware.ts` intercepts requests. If the route matches `isAdminRoute` and the token is missing or invalid, it redirects to `/admin/login`.
- **Hono Middleware:** The backend applies custom Hono guards (`requireAuth`, `requireAdmin`, `requireRole`) that parse the active session out of Next.js cookies to secure API endpoints.
- **Role Management System:** The DB (`AdminUser`) handles generic roles (`admin`, `superadmin`). The application enforces these constraints cleanly during backend fetch operations.

### Dashboard Rendering Logic
- Located in `app/admin/dashboard/page.tsx`. It acts as a Server Component, bypassing Hono APIs and querying DB aggregates directly via `prisma.journal.count()`, `prisma.submission.count()`, etc.
- Retrieves the current session via `getSession()` and gracefully protects the page.

### Login System Implementation
- Diverged state: 
  - `app/login/page.tsx` utilizes React Query's `mutate` passing to the typed `useLogin()` Hono hook.
  - `app/admin/login/page.tsx` relies on a raw `fetch("/api/auth/login")` without relying on the Hono RPC client.

---

## 2. Identified Potential Root Causes (Weakness Mapping)

### Login Flow Fragmentation
- **Root Cause:** Having two discrete login components (`app/login` vs `app/admin/login`) with different submission strategies (React Query/RPC vs. raw `fetch`) creates inconsistencies in user experience, state management, and error handling.
- **Weakness:** Admin login manually parses generic JSON errors instead of relying on the structured Zod-validated Hono client, causing potential silently caught errors or inconsistent UI states.

### Dashboard Direct DB Coupling
- **Root Cause:** `app/admin/dashboard/page.tsx` fetches metrics directly via `prisma`. 
- **Weakness:** While performant in Next.js Server Components, it breaks the bounds of the feature-based architecture (`src/features/dashboard` is missing; all logic is localized to the route). It also lacks testability and decoupling from the DB layer.

### BigInt Serialization Risks
- **Root Cause:** Prisma identifiers (e.g., `id`, `journal_id`) are typed as `BigInt`.
- **Weakness:** Native `JSON.stringify` does not support `BigInt`. Although a serializer might exist, direct extraction or unhandled Prisma records passed directly to Client Components will trigger application-crashing unhandled RSC serialization errors.

---

## 3. Compliance Check Against Governance Rules
- **No Internationalization (i18n):** Checked & Verified. No translation logic or dependencies exist in Dashboard or Login.
- **Strict Naming Convention:** Checked & Verified. Kebab-case naming rules are respected (`auth-middleware.ts`, `auth-schema.ts`, `route.ts`).
- **Lazy Initialization / DB / External layers:** Checked & Verified. `jose` JWT checking occurs cleanly inside Next.js Middleware. Prisma instantiation utilizes global `prisma.config.ts` properly.

---

## 4. Risk Analysis

| Area | Impacted Component | Risk Level | Details |
|------|--------------------|------------|---------|
| **Login Flow Sync** | `app/admin/login` & `app/login` | **Medium** | Maintaining two divergent strategies causes double the maintenance and breaks typed RPC contracts on the admin side. |
| **BigInt Serializations** | `app/admin/dashboard` & APIs | **High** | Accidental direct transfer of generic Prisma data to Client Components risks breaking the Dashboard during hydration. |
| **Dashboard Metrics** | `app/admin/dashboard/page.tsx` | **Low** | Bypasses feature-based routing, slowing down iteration if dashboard data needs to be consumed via external APIs later. |

---

## 5. Proposed Future Fix Roadmap (Read-Only Blueprint)

This blueprint proposes fixes **without modifying any existing files or introducing new features/dependencies**:

**Phase A: Standardize Authentication Contracts**
1. Refactor `app/admin/login/page.tsx` to consume the Hono RPC client (`useLogin()` from `src/features/auth`) instead of utilizing raw Javascript `fetch()`.
2. Standardize error state boundaries across both login pages using Hono's typed Zod validator errors.

**Phase B: Dashboard Architecture Alignment**
1. Extract the heavy Prisma aggregations in `app/admin/dashboard/page.tsx` into a typed Hono RPC backend endpoint (e.g., `src/features/dashboard/server/route.ts`).
2. Utilize `react-query` to fetch the dashboard metrics cleanly via the RPC client, centralizing the metric calculations and aligning the dashboard with the global feature-based structure.

**Phase C: BigInt Safety Layers**
1. Audit all Server-to-Client component boundaries in `admin/dashboard` to enforce the conversion of Prisma `BigInt` into strings.
2. Ensure `serialize.ts` is explicitly wrapping all raw Prisma responses output by the server components before presentation layer consumption.

**Dependencies Impacted:** None. Fixes rely solely on standardizing internal structures (Hono, React Query, Prisma).
