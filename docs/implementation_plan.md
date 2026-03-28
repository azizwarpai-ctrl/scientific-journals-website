# 🔍 DigitoPub — Full System Analysis, Verification, Debug & Remediation Plan

> **Date:** 2026-03-28  
> **Branch:** `main` (clean working tree)  
> **Roles:** 🧭 PM · 🏛️ Architect · 🔗 Integration · 🛡️ QA  
> **Agents:** 🏛️ Architect · 🔒 Security · 🔍 UX · 🎨 UI · 🧪 API Tester · 👁️ Code Reviewer · 🌿 Git

---

## 📚 Phase 0 — System Understanding (Complete Mental Model)

### Files Analyzed (34 files, ~4,500 lines)

All specs, rules, CLAUDE.md, README.md, and every critical source file have been read and cross-referenced. See full file list in [previous audit](#).

---

### 1. Current Architecture (AS-IS)

```mermaid
graph TB
    subgraph "digitopub.com (Next.js Gateway)"
        A[Public Pages<br/>Home, About, Journals, Solutions, Help, Contact] --> B[Navbar<br/>Search Input ⚠️ DEAD]
        A --> C[Journal Detail<br/>Submit Manuscript ✅]
        D[Admin Panel<br/>/admin/*] --> E[JWT Auth<br/>getSession]
        F[API Layer<br/>Hono @ /api/*]
        F --> G[/api/journals]
        F --> H[/api/faqs]
        F --> I[/api/solutions]
        F --> J[/api/about]
        F --> K[/api/statistics]
        F --> L[/api/ojs/*]
        L --> M[/ojs/sso/validate]
        L --> N[/ojs/register/register]
        L --> O[/ojs/journals]
    end

    subgraph "submitmanager.com (OJS)"
        P[sso_login.php] --> Q[OJS Session Manager]
        R[ojs-user-bridge.php] --> S[OJS MySQL DB]
        Q --> S
    end

    C -->|"Direct <Link>"| T["OJS /index.php/{path}/submission"]
    N -->|"Bearer POST"| R
    N -->|"HMAC Token"| P
    P -->|"cURL validate"| M
```

### 2. Expected Architecture (SHOULD-BE)

All of the above, PLUS:
- ✅ **Functional search system** (API + UI + results page)
- ✅ **No merge conflicts on main**
- ✅ **Solutions page renders Solutions** (not FAQs)
- ✅ **About page has NO fake data**
- ✅ **Submit-manager social-proof uses real data**
- ✅ **Rate limiting on registration**
- ✅ `/admin/pricing` in ADMIN_ROUTES

### 3. Violations Found

| # | Violation | Severity | Rule Broken |
|---|-----------|----------|-------------|
| V1 | Merge conflicts on `main` | 🔴 CRITICAL | Code hygiene |
| V2 | Search input has no functionality | 🔴 CRITICAL | `search must be functional` (proposed rule) |
| V3 | `social-proof.tsx` hardcodes `450`, `12`, `8.5k+`, `99.9%` | 🟠 HIGH | `no-static-fake-data` |
| V4 | `faq-section.tsx` in submit-manager has hardcoded FAQ array | 🟠 HIGH | `no-static-fake-data` |
| V5 | About page conflict branch has `SAMPLE_FIELD_DISTRIBUTION` | 🟠 HIGH | `no-static-fake-data` |
| V6 | Solutions page conflict branch uses `useGetFaqs()` | 🟠 HIGH | `feature-module-isolation` |
| V7 | `/admin/pricing` not in ADMIN_ROUTES | 🟡 MEDIUM | `admin-redirect-isolation` |
| V8 | No rate limiting on `/api/ojs/register/register` | 🟡 MEDIUM | Security hardening |
| V9 | `solutions/server/route.ts` GET uses `getSession()` unnecessarily | 🟢 LOW | `auth-no-public-gateway-auth` (soft violation — it's for admin filtering, not auth gating) |

---

## 🔍 Phase 1 — Critical Verification + Debug

---

### ✅ Task 1 — VERIFY Previous Fix: Submit Manuscript

> **Previous claim:** «Submit Manuscript issue is FIXED»

#### Re-Analysis — REAL Code Tracing

**File:** [app/journals/[id]/page.tsx](file:///d:/scientific-journals-website/app/journals/%5Bid%5D/page.tsx)

```typescript
// Line 84-86: URL construction
const ojsBaseUrl = process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com"
const ojsDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
const directUrl = journal.ojs_path
  ? `${ojsDomain}/index.php/${journal.ojs_path}/submission`
  : null
```

**Trace Step-by-Step:**

| Step | What Happens | Code Location |
|------|-------------|---------------|
| 1. User views journal detail | `useGetJournal(id)` fetches from `/api/journals/:id` | Line 46 |
| 2. URL is computed | `journal.ojs_path` → `{OJS}/index.php/{path}/submission` | Line 86 |
| 3. Button renders | `<Link href={directUrl}>` — no auth, no conditions | Line 93 |
| 4. User clicks | Browser navigates directly to OJS domain | Native browser nav |
| 5a. If OJS session exists | OJS renders submission wizard for CORRECT journal | OJS routing |
| 5b. If no session | OJS shows login page, then redirects to submission | OJS own behavior |

#### Verdict: Code-Level Fix = **TRUE** ✅

The `directUrl` correctly uses per-journal `ojs_path`. No hardcoded `/dia/en`. No session checks.

#### ⚠️ BUT — Root Cause of Original Bug May Still Reproduce

> [!WARNING]
> **The original bug (`/dia/en` redirect) was likely caused by OJS domain-wide session behavior, NOT by digitopub code.**

**Explanation:**
- OJS maintains a **single session** across ALL journals on `submitmanager.com`
- If a user was previously logged into journal `dia`, and then clicks "Submit Manuscript" for journal `testj`, OJS may route them to `dia` context because the session still holds `dia` as the last active journal
- This is an **OJS-side behavior**, not a digitopub bug
- The digitopub code is correct — it sends the user to the right URL

#### Debug Plan for OJS Session Side-Effect

| What to Log | Where | How |
|-------------|-------|-----|
| The `href` of the Submit button | Browser DevTools → Elements → inspect `<a>` | Right-click → Inspect, verify `href` |
| Network request after click | Browser DevTools → Network | Watch for redirects (301/302) from OJS |
| OJS cookies | Browser DevTools → Application → Cookies | Look for `OJSSID` or session cookies |
| sso_login.php `$redirect` | PHP error_log in `sso_login.php` | Add `error_log("redirect=$redirect")` at line 48 |
| OJS session journal context | OJS DB → `sessions` table | Check `data` column for journal context |

#### How to Isolate

1. **Open incognito** (no OJS cookies) → Click Submit on journal X → If correct = session issue
2. **Log in to journal A on OJS** → Go to digitopub journal B → Click Submit → If lands on A = OJS session leak
3. **Inspect `<a>` href** in DevTools → If correct = digitopub is fine, OJS is overriding

---

### 🚨 Problem 2 — Header Search NOT Working (NEW)

#### Root Cause: **Feature Does Not Exist**

**File:** [components/navbar.tsx](file:///d:/scientific-journals-website/components/navbar.tsx#L14-L57)

```typescript
// Line 14: State exists
const [searchQuery, setSearchQuery] = useState("")

// Lines 51-57: Input renders and captures keystrokes
<Input
  type="search"
  placeholder="Search journals..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

**What's missing — EVERYTHING:**

| Component | Status | Details |
|-----------|--------|---------|
| Search API endpoint (`/api/search`) | ❌ Does not exist | No route in `src/server/app.ts` |
| Search feature module (`src/features/search/`) | ❌ Does not exist | Not in `src/features/` |
| Search hook (`useSearch`) | ❌ Does not exist | No API hook |
| `onSubmit` handler on `<form>` | ❌ Missing | Input is inside a `<div>`, not a `<form>` |
| `onKeyDown` (Enter key) handler | ❌ Missing | No keyboard event |
| Debounced API call | ❌ Missing | No debounce logic |
| Suggestions dropdown | ❌ Missing | No UI for results |
| Results page (`/search`) | ❌ Missing | No `app/search/` directory |
| Routing on submit | ❌ Missing | No `router.push` |

> **👁️ Code Reviewer:** The search input is a **decorative shell** — it captures keystrokes into local state but that state is never consumed by anything. It provides ZERO functionality.

#### Full Search System Design

##### Backend: `GET /api/search?q=...&type=all`

```typescript
// src/features/search/server/route.ts
// Query across: Journals, Solutions, FAQs
// Return: { results: [...], total: number }
// Types: journal | solution | faq
// Uses: Prisma full-text or LIKE queries
// Limit: 20 results per type, 50 total
```

##### Frontend Components

| Component | Purpose |
|-----------|---------|
| `src/features/search/api/use-search.ts` | Debounced TanStack Query hook |
| `src/features/search/components/search-input.tsx` | Enhanced navbar input with dropdown |
| `src/features/search/components/search-results.tsx` | Results list component |
| `app/search/page.tsx` | Full results page at `/search?q=...` |

##### Navbar Integration

```
Input → onChange (debounce 300ms) → API call → Dropdown suggestions
      → onSubmit (Enter) → router.push("/search?q=...")
```

---

## 🔎 All 8 Problems — Complete Inventory

### Problem 1: Submit Manuscript (Verified ✅ at code level)
- **Code fix:** Confirmed correct
- **Remaining risk:** OJS session side-effect (document in debug checklist)

### Problem 2: Search NOT Working (❌ Feature missing)
- **Root cause:** Decorative input, zero backend/frontend logic
- **Fix:** Build complete search system

### Problem 3: Home Page Journals
- **Current state:** Shows 6 journals via `journals.slice(0, 6)` — ✅ Correct
- **Selection logic:** Uses whatever order `useGetJournals()` returns (likely `created_at DESC` from OJS sync)
- **Fix needed:** None — already correct per spec

### Problem 4: About Page
- **4A - Static sections:** ✅ Already CMS-driven via `useGetAboutContent()` (fetches from `/api/about`)
- **4B - Fake stats:** ✅ Already uses `useGetPlatformStatistics()` (real OJS DB data)
- **4C - BLOCKER:** ❌ File has **merge conflict markers** that crash the build. Conflict branch reintroduces `SAMPLE_FIELD_DISTRIBUTION`, `MetricBar`, `RadialProgress` (undefined components with fake data)

### Problem 5: Solutions Page
- **Current state:** ❌ File has **merge conflict markers** — two conflicting implementations
- **HEAD version:** ✅ Correct — fetches from `/api/solutions`, renders Solution cards with icons + features
- **Conflict version:** ❌ Wrong — uses `useGetFaqs()` from solutions module, renders FAQ accordion
- **Backend:** ✅ Solutions API fully implemented (CRUD, admin-protected mutations, public GET)
- **Fix:** Resolve conflicts, keep HEAD version

### Problem 6: Static Marketing Sections
- **Submit-Manager page** (`social-proof.tsx`):
  - Hardcoded: `abstractViews = 450`, `articleCount = 12`, `"8.5k+"`, `"99.9%"`
  - Violates: `no-static-fake-data` rule
- **Submit-Manager FAQ** (`faq-section.tsx`):
  - Hardcoded FAQ array instead of fetching from `/api/faqs`
  - Violates: `no-static-fake-data` + `feature-module-isolation`

### Problem 7: FAQ System
- **Current state:** ✅ Already built and working
- **Model:** `FAQ` in Prisma schema with `question`, `answer`, `category`, `is_published`, `view_count`, `helpful_count`
- **API:** `GET /api/faqs` (paginated, published filter), full CRUD with `requireAdmin`
- **UI Hook:** `useGetFaqs(page, limit)` from `src/features/faq/`
- **Help page:** ✅ Uses `useGetFaqs(1, 50)` for FAQ accordion
- **Fix needed:** Make submit-manager FAQ section use the centralized API instead of hardcoded array

### Problem 8: Help Page UX
- **Current state:** ✅ Well-implemented
- **Dynamic guides:** Uses `useGetHelpContent()` with skeleton loaders
- **FAQ section:** Dynamic from `/api/faqs`
- **Sub-pages:** `/help/submission-service` and `/help/technical-support` both exist with functional forms
- **Fix needed:** None for core functionality. Minor: could add GSAP animations to sub-pages.

---

## 🤖 Phase 4 — Agency-Agent Outputs

### 🏛️ Software Architect

> **Assessment:** Architecture is sound. Identity boundaries are correctly enforced. The feature-module pattern is well-established. The Hono + TanStack Query + Prisma stack is production-grade.
>
> **Issues Found:**
> 1. Merge conflicts on main = deployment blocker
> 2. Search feature is architecturally absent (no route, no module, no hook)
> 3. `solutions/server/route.ts` GET endpoint calls `getSession()` for admin-filtering — acceptable but could use `requireAdmin` middleware pattern for the admin branch instead
>
> **Recommendation:** Add search as a cross-cutting feature module at `src/features/search/` with a unified API endpoint.

### 🔒 Security Engineer

> **Assessment:** SSO is correctly hardened. HMAC + timing-safe + 5-min expiry. No public token generation.
>
> **Issues Found:**
> 1. No rate limiting on `POST /api/ojs/register/register`
> 2. `/admin/pricing` missing from `ADMIN_ROUTES` — accessible without middleware JWT check (though page itself calls `getSession()`, the middleware bypass is a defense-in-depth gap)
> 3. `OjsSsoToken` model exists in Prisma schema but is NOT used by current stateless HMAC implementation — dead table, potential confusion
>
> **Recommendation:** Add rate limiting, fix route config, consider removing unused `OjsSsoToken` model.

### 🎨 UI Designer

> **Assessment:** The design system is cohesive — dark mode, skeletons, GSAP animations, consistent card patterns.
>
> **Issues Found:**
> 1. Search input is a decoration — users will type and nothing happens (broken trust)
> 2. Two pages crash entirely (about, solutions) due to merge conflicts
> 3. Submit-manager social-proof shows fake numbers — undermines credibility
>
> **Recommendation:** Priority 1: fix crashes. Priority 2: make search functional. Priority 3: replace fake numbers.

### 🔍 UX Researcher

> **Assessment:** The information architecture is reasonable. Journals, Help, Solutions, About are logically separated.
>
> **Issues Found:**
> 1. **Search is the #1 user expectation** for a journal platform — its absence is a critical UX gap
> 2. Solutions page identity crisis — spec says "company solutions" but conflict version renders FAQs
> 3. CTA on home page links to `/register` which is a public user registration — good for conversion
>
> **Recommendation:** Implement search with suggestions dropdown for fast discovery. Ensure Solutions ≠ FAQs.

### 🧪 API Tester

> **Test Results (Static Analysis):**
>
> | Endpoint | Method | Status | Notes |
> |----------|--------|--------|-------|
> | `GET /api/journals` | GET | ✅ Working | Paginated, BigInt serialized |
> | `GET /api/faqs` | GET | ✅ Working | With category, pagination |
> | `GET /api/solutions` | GET | ✅ Working | Published filter, ordering |
> | `GET /api/about` | GET | ✅ Working | SystemSetting key-value |
> | `GET /api/statistics` | GET | ✅ Working | Real OJS DB queries |
> | `GET /api/ojs/sso/validate` | GET | ✅ Working | HMAC validation |
> | `POST /api/ojs/register/register` | POST | ✅ Working | But no rate limit |
> | `GET /api/search` | GET | ❌ **MISSING** | Does not exist |
> | `GET /api/help` | GET | ✅ Working | SystemSetting retrieval |
>
> **Build Test:** ❌ FAIL — merge conflicts prevent TypeScript compilation

### 🌿 Git Workflow Master

> **Assessment:** Main branch has merge conflict markers — this should NEVER happen. The `fix/dynamic-content-and-sso` branch was merged incorrectly (merge conflicts were committed instead of resolved).
>
> **Recommendation:** Create `fix/full-system-remediation` branch, resolve all conflicts, implement missing features, and submit clean PR for Coderabbit review.

---

## 🛠️ Phase 5 — Execution Plan

---

### 🔧 Remediation Phase 1: Emergency — Resolve Merge Conflicts

> **Priority:** 🔴 CRITICAL — Blocks ALL other work  
> **Goal:** Make `main` compilable

#### Tasks

| # | Task | File |
|---|------|------|
| 1.1 | Resolve `about/page.tsx` — keep HEAD (CMS-driven, real stats), remove conflict branch (fake data, undefined components) | `app/about/page.tsx` |
| 1.2 | Resolve `solutions/page.tsx` — keep HEAD (Solution cards from `/api/solutions`), remove conflict branch (FAQ-as-solutions) | `app/solutions/page.tsx` |
| 1.3 | Run `npm run build` to verify compilation | — |

#### Risks
- Zero — restoring architecturally correct HEAD version

#### Validation
- `npm run build` passes ✅
- No `<<<<<<`, `=======`, `>>>>>>>` markers in codebase
- About page renders with real stats from API
- Solutions page renders Solution cards

---

### 🔍 Remediation Phase 2: Search System (Full Implementation)

> **Priority:** 🔴 CRITICAL  
> **Goal:** Make search functional end-to-end

#### Tasks

| # | Task | Files |
|---|------|-------|
| 2.1 | Create search feature module structure | `src/features/search/` |
| 2.2 | Build `GET /api/search?q=&type=` endpoint | `src/features/search/server/route.ts` |
| 2.3 | — Query `Journal` (title, field, description) | — |
| 2.4 | — Query `Solution` (title, description) | — |
| 2.5 | — Query `FAQ` (question, answer) | — |
| 2.6 | Register search router in `src/server/app.ts` | `src/server/app.ts` |
| 2.7 | Create search hook with debounce | `src/features/search/api/use-search.ts` |
| 2.8 | Upgrade navbar search input (form + onSubmit + dropdown) | `components/navbar.tsx` |
| 2.9 | Create search results page | `app/search/page.tsx` |
| 2.10 | Add `/search` to `PUBLIC_ROUTES` | `config/routes.ts` |

#### Risks
- MySQL LIKE queries may be slow on large datasets → Add `FULLTEXT` index if needed
- Debounce timing affects UX → Use 300ms

#### Validation
- Type "test" in navbar → dropdown shows results
- Press Enter → navigates to `/search?q=test`
- Results are categorized (Journals, Solutions, FAQs)
- Empty query shows "Type to search..."

---

### 🔐 Remediation Phase 3: Security Hardening

> **Priority:** 🟠 HIGH  
> **Goal:** Close security gaps

#### Tasks

| # | Task | Files |
|---|------|-------|
| 3.1 | Add `/admin/pricing` to ADMIN_ROUTES | `config/routes.ts` |
| 3.2 | Add rate limiting to registration endpoint (5 req/IP/15min) | `src/features/ojs/server/provision-route.ts` |
| 3.3 | Consider removing unused `OjsSsoToken` Prisma model | `prisma/schema.prisma` |

#### Risks
- Rate limiter on shared hosting (no Redis) → Use in-memory Map with IP keys
- Removing OjsSsoToken model requires migration → Defer if risky

#### Validation
- Rapid-fire 6 registration POSTs → 6th returns 429
- Visit `/admin/pricing` without auth → redirected to login

---

### 📊 Remediation Phase 4: Kill Fake Data

> **Priority:** 🟠 HIGH  
> **Goal:** All numbers from real data or "Coming Soon"

#### Tasks

| # | Task | Files |
|---|------|-------|
| 4.1 | Replace hardcoded values in `social-proof.tsx` with `useGetPlatformStatistics()` | `components/submit-manager/social-proof.tsx` |
| 4.2 | Replace hardcoded FAQ array in `faq-section.tsx` with `useGetFaqs()` | `components/submit-manager/faq-section.tsx` |

#### Risks
- If statistics API fails, show "—" or skeleton, not fake numbers

#### Validation
- Social-proof numbers match `/api/statistics` response
- Submit-manager FAQs match `/api/faqs` response

---

### 📝 Remediation Phase 5: SpecKit Updates

> **Priority:** 🟡 MEDIUM  
> **Goal:** Align specs with real implementation

#### Tasks

| # | Task | Files |
|---|------|-------|
| 5.1 | Update `system-overview.md` — add search system, OJS API routes | `.agent/specs/system/system-overview.md` |
| 5.2 | Create `ojs-integration.md` (broader than SSO only) | `.agent/specs/integration/ojs-integration.md` |
| 5.3 | Create `ui-system.md` (unified UI spec) | `.agent/specs/ui/ui-system.md` |
| 5.4 | Update `rules.yaml` — add search, fake-data, and feature-isolation rules | `.agent/rules/rules.yaml` |

#### Risks
- None (docs only)

#### Validation
- Run `speckit-analyze` skill to verify consistency

---

### 🎨 Remediation Phase 6: UX Polish (Optional)

> **Priority:** 🟢 LOW  
> **Goal:** Enhance user experience

#### Tasks

| # | Task | Files |
|---|------|-------|
| 6.1 | Add GSAP animations to help sub-pages | `app/help/submission-service/page.tsx`, `app/help/technical-support/page.tsx` |
| 6.2 | Add keyboard shortcut (Ctrl+K / Cmd+K) for search focus | `components/navbar.tsx` |
| 6.3 | Add search result highlighting (bold matched terms) | `src/features/search/components/` |

---

## 🔁 Phase 6 — Git Workflow

### Branch

```
fix/full-system-remediation
```

### Commit Strategy (Atomic, Coderabbit-Ready)

```bash
git checkout -b fix/full-system-remediation

# Phase 1: Emergency  
git commit -m "fix(about): resolve merge conflicts, keep CMS-driven content, remove fake data"
git commit -m "fix(solutions): resolve merge conflicts, keep Solution cards implementation"

# Phase 2: Search  
git commit -m "feat(search): add search API endpoint with journal/solution/faq queries"
git commit -m "feat(search): add useSearch hook with 300ms debounce"
git commit -m "feat(search): upgrade navbar with functional search + suggestions dropdown"
git commit -m "feat(search): add /search results page with categorized display"

# Phase 3: Security  
git commit -m "fix(routes): add /admin/pricing to ADMIN_ROUTES"
git commit -m "feat(security): add IP-based rate limiting to registration endpoint"

# Phase 4: Fake Data  
git commit -m "fix(submit-manager): replace hardcoded social-proof with real statistics API"
git commit -m "fix(submit-manager): replace hardcoded FAQ with centralized /api/faqs"

# Phase 5: Specs  
git commit -m "docs(specs): update system-overview with search system and OJS routes"
git commit -m "docs(specs): add ojs-integration.md and ui-system.md specs"
git commit -m "docs(rules): add search-functional and no-fake-data rules"

# Verify  
git commit -m "chore: verify production build passes"
```

### PR Template

```
## Summary
Full system remediation based on comprehensive audit.

## Changes
- 🔴 Resolve merge conflicts on about/solutions pages
- 🔴 Implement complete search system (API + UI + results page)
- 🟠 Add rate limiting to registration
- 🟠 Replace all hardcoded fake data with real API data
- 🟡 Update SpecKit specs and rules
- Fix /admin/pricing route protection

## Testing
- [ ] `npm run build` passes
- [ ] Search: type query → see suggestions → Enter → results page
- [ ] About page: renders with real CMS data
- [ ] Solutions page: renders Solution cards (not FAQs)
- [ ] Social-proof: shows real statistics
- [ ] Rate limit: 6th rapid registration returns 429

## Architecture
No architectural changes. Identity boundaries preserved.
SSO flow unchanged. Admin auth unchanged.
```

---

## ✅ Final Deliverables Summary

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Full system analysis (AS-IS vs SHOULD-BE) | ✅ Complete |
| 2 | Verification of previous fix (Submit Manuscript) | ✅ TRUE at code level, OJS session risk documented |
| 3 | Root cause — Submit bug | ✅ Code is correct; OJS domain-wide session may cause cross-journal routing |
| 4 | Root cause — Search not working | ✅ Feature does not exist (decorative input only) |
| 5 | Debug plan | ✅ Detailed for both issues |
| 6 | Full remediation plan (6 phases, ~25 tasks) | ✅ Complete with files, risks, validation |
| 7 | SpecKit updates plan | ✅ 4 files to create/update |
| 8 | Agency-agent outputs | ✅ All 6 agents reported |
| 9 | Execution strategy + Git workflow | ✅ Branch + 13 atomic commits + PR template |

---

## User Review Required

> [!IMPORTANT]
> **3 decisions needed before execution:**

### Decision 1: Merge Conflict Resolution
**Confirm:** Keep HEAD versions for both `about/page.tsx` and `solutions/page.tsx`, discarding the `fix/dynamic-content-and-sso` branch content?
- HEAD about = CMS-driven, real stats ✅
- HEAD solutions = Solution cards from `/api/solutions` ✅

### Decision 2: Search Scope
Should the search system include:
- ✅ Journals (title, field, description)
- ✅ Solutions (title, description)
- ✅ FAQs (question, answer)
- ❓ **Authors** — do you want author search? (would query OJS DB directly)

### Decision 3: Rate Limiting
- **In-memory** (simpler, resets on restart) — good for Hostinger
- **Redis** (persistent) — requires Redis instance
- **Recommendation:** In-memory for now, Redis when needed

### Decision 4: OjsSsoToken Model
The `OjsSsoToken` Prisma model/table is unused (current SSO is stateless HMAC). Should we:
- **Remove it** (requires migration) 
- **Keep it** (no risk, just dead code)
