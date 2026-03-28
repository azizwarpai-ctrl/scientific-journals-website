# System Improvement — Dynamic Content & SSO Fixes

## Full System Analysis Report

### Architecture Overview

The system consists of two components:
- **digitopub** (Next.js + Hono API) — UI gateway at `d:\scientific-journals-website`
- **submitmanager** (OJS/PKP) — source of truth for users, auth, roles, submissions

The architecture rules are correctly enforced: digitopub does NOT handle public auth, does NOT store public users, and delegates all public user actions to OJS. Admin auth uses local JWT + OTP, properly separated from OJS public users.

### Current State Assessment

| Area | Status | Notes |
|------|--------|-------|
| Homepage journals | ⚠️ Partial | Slices to 6 client-side, but fetches ALL journals — wasteful |
| About page | ✅ Working | Already dynamic via `useGetAboutContent` + admin CRUD at `/admin/about` |
| Journal card UI | ⚠️ Issue | Dark gradient overlay `from-slate-900/80` creates dark card bottoms in light mode |
| SSO redirect | ⚠️ Critical | `journalPath` comes from query param, but registration wizard doesn't pass it |
| Solutions page | ❌ Wrong | Shows journals as placeholder content instead of solutions/FAQ data |
| Help center | ⚠️ Partial | FAQs are dynamic, but user guides are hardcoded |
| Navbar search | ❌ Broken | Input exists but has no search handler or dropdown |

### Data Flow

- **Journals**: OJS DB → PHP proxy API → Next.js server route → React Query hooks → UI
- **About/FAQ/Solutions**: Prisma DB → Hono API routes → React Query hooks → UI  
- **Metrics**: OJS DB → dedicated metrics route → React Query → UI
- **SSO**: Registration form → Hono provision route → OJS user-bridge → HMAC token → SSO redirect

---

## Proposed Changes

### Issue 1: Homepage — Show Only 6 Featured Journals

Currently [app/page.tsx](file:///d:/scientific-journals-website/app/page.tsx) calls `useGetJournals()` which fetches ALL journals, then slices to 6 client-side on line 136: `journals.slice(0, 6)`. This is correct behavior-wise but wastes bandwidth.

#### [MODIFY] [page.tsx](file:///d:/scientific-journals-website/app/page.tsx)

No functional change needed — the homepage already shows only 6 journals. The `journals.slice(0, 6)` at [line 136](file:///d:/scientific-journals-website/app/page.tsx#L136) is correct.

**Optional optimization**: Add a `limit=6` query param to the journals API to avoid fetching all journals. This is a minor optimization that can be deferred.

> [!NOTE]
> The homepage already correctly shows only 6 journals. The "View All" button links to `/journals` which shows the full list. **No code change required for this issue.**

---

### Issue 2: About Page — Dynamic Data

The about page is **already dynamic**. It uses:
- `useGetAboutContent()` from `src/features/about` for CMS text content
- `useGetPlatformStatistics()` from `src/features/statistics` for live OJS metrics
- Admin CRUD exists at `/admin/about` via [page.tsx](file:///d:/scientific-journals-website/app/admin/about/page.tsx)

The only static elements remaining are:
- **Core Values section** (line 316-341) — hardcoded array of 4 values
- **Quality Metrics** (line 177-186) — simulated via `setTimeout`, not from API
- **Field Distribution** (line 226-231) — `SAMPLE_FIELD_DISTRIBUTION` hardcoded array

#### [MODIFY] [page.tsx](file:///d:/scientific-journals-website/app/about/page.tsx)

- Remove the `SAMPLE_FIELD_DISTRIBUTION` hardcoded array, label it clearly as "(Illustrative data)" — already labeled on line 394
- Remove `qualityMetrics` fake setTimeout simulation and replace with a clear "Coming Soon" indicator

> [!NOTE]
> The about page is already 80% dynamic. The remaining static elements (core values, quality metrics) are intentionally placeholder. **Minimal change: remove fake timer simulation.**

---

### Issue 3: Journal Card UI — Dark Background Fix

The issue is in [journal-card.tsx](file:///d:/scientific-journals-website/src/features/journals/components/journal-card.tsx#L52-L57). The image container has:
```
"after:bg-gradient-to-t after:from-slate-900/80 after:via-slate-900/20 after:to-transparent"
```

This creates a dark gradient overlay that looks wrong in light mode when there's no cover image (falls back to `bg-slate-50`/`bg-slate-100`).

#### [MODIFY] [journal-card.tsx](file:///d:/scientific-journals-website/src/features/journals/components/journal-card.tsx)

- Make the gradient overlay theme-aware:
  - Light mode: `from-white/80 via-white/20` 
  - Dark mode: keep `from-slate-900/80 via-slate-900/20`
- The no-image fallback also needs updating: `bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900` — this is already theme-aware, so the fix is specifically the `after:` gradient overlay.

---

### Issue 4: Submit Manuscript — SSO Redirect Fix (CRITICAL)

#### Current Flow Analysis

1. **Journal Detail Page** ([app/journals/[id]/page.tsx](file:///d:/scientific-journals-website/app/journals/%5Bid%5D/page.tsx#L84-L86)) correctly builds `directUrl`:
   ```typescript
   const directUrl = journal.ojs_path ? `${ojsDomain}/index.php/${journal.ojs_path}/submission` : null
   ```
   This links directly to OJS — ✅ correct for **returning users**.

2. **Registration Flow** ([provision-route.ts](file:///d:/scientific-journals-website/src/features/ojs/server/provision-route.ts#L57-L59)):
   ```typescript
   const journalPath = c.req.query("journalPath") || ""
   const afterLoginPath = journalPath ? `/index.php/${journalPath}/submission` : "/index.php/index/login"
   ```
   This is ✅ correct **if `journalPath` is provided** — but we need to verify the registration wizard actually passes it.

#### Root Cause Investigation Needed

The registration wizard at [register/page.tsx](file:///d:/scientific-journals-website/app/register/page.tsx) does NOT appear to accept or pass a `journalPath` query parameter. A user who clicks "Submit Manuscript" on a journal, gets routed to `/register`, and after registration completes, the provision route receives no `journalPath` → user lands on generic OJS login instead of the specific journal's submission page.

#### [MODIFY] [registration-wizard.tsx](file:///d:/scientific-journals-website/src/features/journals/components/register/journal-registration-wizard.tsx) (or equivalent auth registration)

- Extract `journalPath` from URL search params (e.g., `/register?journalPath=xyz`)
- Pass it to the provision API call as a query parameter
- Ensure the full SSO chain preserves the journal path

#### [MODIFY] [journal-card.tsx](file:///d:/scientific-journals-website/src/features/journals/components/journal-card.tsx) or journal detail page

- When linking to the "Submit Manuscript" → registration flow, include `?journalPath={ojs_path}` in the register URL

> [!IMPORTANT]
> This fix must be verified end-to-end: Journal Detail → Register → Provision → SSO → OJS submission page for the correct journal.

---

### Issue 5: Solutions Page — Make Fully Dynamic

The solutions page at [app/solutions/page.tsx](file:///d:/scientific-journals-website/app/solutions/page.tsx) currently shows **journals as placeholder content** — it calls `useGetJournals()` and displays 6 journal cards. This is incorrect — it should show actual solution/service offerings.

The backend is already prepared:
- `FAQ` model in Prisma (mapped to `faq_solutions` table)
- Full CRUD API at `src/features/solutions/server/route.ts`  
- Admin CRUD at `/admin/faq` with create/edit pages
- `useGetSolutions` hook exists in `src/features/solutions`

#### [MODIFY] [page.tsx](file:///d:/scientific-journals-website/app/solutions/page.tsx)

Complete rewrite:
- Replace `useGetJournals` with `useGetSolutions` (or `useGetFaqs`)
- Display solution/FAQ items grouped by category
- Use accordion or card layout matching the site's design system
- Keep the gradient hero section, update copy to match solutions context
- Handle loading/error/empty states properly

---

### Issue 6: Help Center — Dynamic User Guides

The help page at [app/help/page.tsx](file:///d:/scientific-journals-website/app/help/page.tsx) has:
- ✅ Dynamic FAQs via `useGetFaqs()` (lines 12, 15, 93-116)
- ❌ Hardcoded "Guide for Authors" and "Guide for Reviewers" sections (lines 122-163)

These guides should be stored in the database and managed via the admin dashboard.

#### Approach: Use `SystemSetting` Model

The `SystemSetting` model already exists in Prisma and can store structured JSON content. We can use setting keys like `help_guide_authors` and `help_guide_reviewers`.

#### [NEW] [use-get-help-guides.ts](file:///d:/scientific-journals-website/src/features/solutions/api/use-get-help-guides.ts)

New React Query hook to fetch help guide content from `SystemSetting` entries.

#### [MODIFY] [page.tsx](file:///d:/scientific-journals-website/app/help/page.tsx)

- Replace hardcoded guide content with dynamic data from the new hook
- Add skeleton loading states

#### Admin Dashboard

The admin dashboard already has `/admin/settings` — we'll need to verify settings CRUD exists for these keys, or add specific entries during seed.

---

### Issue 7: Header Search — Implement Real Search

The navbar at [components/navbar.tsx](file:///d:/scientific-journals-website/components/navbar.tsx) has a search input (lines 49-57) that stores `searchQuery` in local state but never uses it.

#### [NEW] [use-search.ts](file:///d:/scientific-journals-website/src/features/journals/api/use-search.ts)

New hook using React Query with debounce to search journals by title/field.

#### [MODIFY] [navbar.tsx](file:///d:/scientific-journals-website/components/navbar.tsx)

- Wire search input to the new hook with debounce (300ms)
- Add a dropdown results panel showing matching journals
- Show loading spinner during search
- Click result → navigate to journal detail page
- Keyboard navigation support (Escape to close)
- Empty state messaging

#### Server-Side Search API

The journal list API already supports fetching all journals. We can either:
1. Add a `search` query param to the existing journals route (preferred — server-side filtering)
2. Client-side filtering of the cached journal list (simpler, works for small catalogs)

Given the catalog is likely small (<100 journals), **client-side filtering with the cached query data** is the pragmatic choice.

---

## User Review Required

> [!IMPORTANT]  
> **Issue 4 (SSO Redirect)**: The registration wizard needs investigation. I need to read the `RegistrationWizard` component to confirm whether it currently passes `journalPath`. If it does, the fix is smaller. If not, we need to thread it through.

> [!WARNING]
> **Issue 5 (Solutions Page)**: The current page shows journals — is this intentional? The FAQ/solutions backend already exists. Should the solutions page display service offerings, FAQ categories, or something entirely different? I'll proceed with FAQ/solutions data unless you specify otherwise.

> [!IMPORTANT]
> **Issue 6 (Help Guides)**: Making user guides dynamic requires deciding on a schema. I propose using `SystemSetting` with JSON values (each guide = array of `{title, content}` sections). Alternative: create a new `HelpGuide` Prisma model. Which approach do you prefer?

---

## Verification Plan

### Automated Tests

1. **Existing unit tests** — run to ensure no regressions:
   ```bash
   cd d:\scientific-journals-website && npx vitest run
   ```

2. **Build verification** — ensure all changes compile:
   ```bash
   cd d:\scientific-journals-website && npm run build
   ```

### Browser Testing

For each issue, verify via the browser tool:

| Issue | Test Steps |
|-------|-----------|
| #1 Homepage | Open `/` → verify exactly 6 journal cards → click "View All" → `/journals` shows all |
| #3 Card UI | Open `/journals` → inspect cards in light mode → no black gradient visible |
| #4 SSO | Open journal detail → click "Submit Manuscript" → verify URL contains correct `journalPath` |
| #5 Solutions | Open `/solutions` → verify FAQ/solutions data appears (not journals) |
| #6 Help | Open `/help` → verify guides section loads |
| #7 Search | Type in navbar search → verify dropdown shows matching journals → click result navigates correctly |

### Manual Verification (User)

- **Issue 4**: End-to-end SSO flow requires a live OJS instance — please verify on staging:
  1. Go to journal detail page
  2. Click "Submit Manuscript" (as a new user)  
  3. Complete registration
  4. Confirm you land on the correct journal's submission page on submitmanager.com

- **Issue 2**: Verify about page content can be edited from `/admin/about` and changes reflect on `/about`
