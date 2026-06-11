# Dashboard / Tracking — Phase 0 Analysis

> **Initiative**: A — Manager dashboard / tracking: FINISH the existing surface
> **Branch**: `claude/compassionate-bell-ab2fU`
> **Date**: 2026-06-05
> **Phase**: 0 (inventory + gap list; no code emitted)

The brief is to "complete login to the dashboard" and provide a "complete tracking system." Login already works and an `/admin/dashboard` plus `/admin/analytics` surface already render. The job is to identify the **gap**, not rebuild from scratch.

Implementation tasks must not begin until the proposed task list at §3 is approved by the human reviewer.

---

## 1. Inventory

### A-INV-1 — What does `/admin/dashboard` render today?

File: `app/admin/dashboard/page.tsx` (151 lines, server component).

- Auth gate: `getSession()` from `src/lib/db/auth.ts:4-…` — redirects to `/admin/login` when null (`app/admin/dashboard/page.tsx:9-12`). Works correctly.
- Data source: **digitopub Prisma DB only**. Eight `prisma.*.count()` calls run in `Promise.all` at `:18-35`:
  - `prisma.journal.count()`
  - `prisma.submission.count()` (also broken down by `status: under_review | accepted | rejected`)
  - `prisma.review.count({ where: { review_status: 'pending' } })`
  - `prisma.publishedArticle.count()`
  - `prisma.submission.groupBy({ by: ['author_email'] })` → "total authors" (count of distinct rows)
- UI: `statsCards[]` builds 8 cards (`:53-115`); then `recentSubmissions` (`:38-46`) renders the last 5 submissions with status pill.

**What it does NOT render** (relevant to a "tracking system"):

- Zero per-article view/download counts. The UIET-P1 engagement tables (`UserEvent` at `prisma/schema.prisma:400-421`, `MetricsArticleDaily` at `:423-441`, `MetricsArticleMonthly` at `:443-462`, `UserMetrics` at `:464-477`) exist and are written to by `src/lib/event-recorder.ts` from `/api/metrics/events/*` (`src/server/routes/metrics-events.ts`), but the dashboard never reads them.
- Zero per-journal traffic counts.
- Zero OJS-side metrics (`metrics_submission` / `metrics_submission_geo_monthly`) — these are read elsewhere (e.g. `article-detail-service.ts:332-339` reads the per-article totals for the public sidebar), but the admin dashboard does not.

### A-INV-2 — What does `/admin/analytics` render today?

File: `app/admin/analytics/page.tsx` (203 lines).

- Auth gate: same `getSession()` redirect (`:8-11`). Works.
- Data source: **digitopub Prisma DB only**, almost identical to the dashboard:
  - `prisma.journal.count()`, `prisma.submission.count()`, `prisma.submission.count({ where: { status: "accepted" } })`, `prisma.publishedArticle.count()`, `prisma.review.count()` (all in one `Promise.all` at `:28-39`).
  - "Submissions by field" pulls each `Journal.field` + its `_count.submissions` at `:55-67`.
- "Acceptance Rate" = `accepted / total submissions` (`:48`).
- **"Recent Activity"** card at `:174-198` shows three figures that are **fabricated**: each is `Math.floor((<count>) * <fraction>)` with hard-coded fractions (`0.15`, `0.2`, `0.1`). These are placeholders, not real "last 7 days" data. This needs to be replaced.
- "System Health" card at `:153-172` shows three pills hard-coded to "Operational" — no actual health probe. (Tangential to tracking but worth noting.)

**What it does NOT render**:

- Same gaps as A-INV-1: no per-article view/download counts, no time series.
- No OJS-side metrics, no UIET-P1 engagement metrics — even though both data sources are live in the same Prisma client this file already imports.

### A-INV-3 — Is login broken?

**No.** Login is end-to-end functional:

- `app/admin/login/page.tsx:35-50` → `client.auth.login.$post({ json: { email, password } })`.
- `src/features/auth/server/route.ts:27-…` validates with `loginSchema`, calls `verifyPassword`, generates a 6-digit OTP, hashes it, stores in `VerificationCode`. Returns `requiresVerification: true`.
- Client redirects to `/admin/verify-code?email=…` (`app/admin/login/page.tsx:46-49`); the verify page (`app/admin/verify-code/page.tsx`) POSTs the code to `src/features/auth/server/route.ts:97 POST /verify-code`, which calls `createSession(user)` (`src/lib/db/auth-edge.ts:34-56`) — mints the `auth_token` JWT cookie.
- Middleware at `middleware.ts:50-78` verifies the JWT on every `/admin/*` request and redirects unauthenticated visitors back to `/admin/login` with a `redirect=` param. The dashboard page then runs `getSession()` again server-side as a belt-and-suspenders check.
- Logout: `POST /api/auth/logout` (`src/features/auth/server/route.ts:246-…`) clears the cookie; `components/admin-sidebar.tsx:87-95` wires it up.
- `GET /api/auth/me` (`src/features/auth/server/route.ts:257-…`) exists for the client to read the session.

The brief's phrase "complete login to the dashboard" almost certainly means "finish the dashboard experience that the login lands on" — i.e. the surface, not the auth itself. The auth flow has no defect we can find.

The only minor smell: `app/admin/login/page.tsx:42` casts an error via `(data as any).error`. Quality nit, not a defect. Recommend addressing as part of a polish task, not as the main thrust.

### A-INV-4 — What is concretely missing for "complete tracking"?

Cross-referenced inventory of every data source already wired up vs every surface that consumes it:

| Data already captured | Where (in this repo) | Used by admin UI? |
|---|---|---|
| Submissions / reviews / journals counts | Prisma `submissions`, `reviews`, `journals` | ✅ dashboard + analytics |
| Per-article views / downloads (OJS-historical) | OJS `metrics_submission` joined in `article-detail-service.ts:332-339` | ❌ public sidebar only, never aggregated for admin |
| Per-article views / downloads (digitopub-new, UIET-P1) | `MetricsArticleMonthly` aggregated in `article-detail-service.ts:362-379`; raw `UserEvent` log; daily/monthly roll-ups via `scripts/aggregate-daily-metrics.ts` / `scripts/aggregate-monthly-metrics.ts` | ❌ admin never reads either table |
| Per-user (ORCID) stats | `UserMetrics` + `/api/account/stats` (`src/server/routes/account.ts`) | ❌ public `/account/stats` only |
| Geo metrics | OJS `metrics_submission_geo_monthly` (cited in `metrics-router` at `src/features/metrics/server/route.ts:67-69`) | ❌ admin never reads |
| Citation exports | `UserEvent` with `event_type='citation_export'` | ❌ never aggregated for admin |
| Audio play events (future, Initiative B) | Would land in `UserEvent` | n/a — Initiative B not built |

**The gap, in concrete terms**, is the admin-side read path. Every piece of tracking data we need is already being captured. Nothing is being shown to the manager.

Secondary gaps (smaller):

- "Recent Activity" in `analytics/page.tsx:174-198` is fabricated and should be replaced with real numbers from `UserEvent` (last 7 days `count where created_at > now() - 7d`).
- "System Health" card at `analytics/page.tsx:153-172` is hard-coded — replace with real probes (DB ping, `ojsHealthCheck()` from `src/features/ojs/server/ojs-client.ts:201-220` already exists for OJS).
- `dashboard/page.tsx`'s "Total Authors" uses `prisma.submission.groupBy({ by: ['author_email'] })` and returns `.length` — this is O(distinct emails) memory and was flagged before. Not urgent, but worth a note.

---

## 2. Proposed task list (NOT to be implemented until approved)

One row = one small PR. No widening. Recommended order top-down.

| id | title | depends-on | status | scope sketch |
|---|---|---|---|---|
| A0 | This analysis doc | — | in-review | Approve the gap list and the priorities below. No code. |
| A1 | New admin route `/admin/tracking` (or extend `/admin/analytics`) with **per-article** views / downloads / citations | A0, decision on placement | todo | Server-rendered page that joins `Submission`/`PublishedArticle` (for the title) with `MetricsArticleMonthly` (digitopub) + OJS `metrics_submission` (where available, via `ojsQuery`) for an admin-only top-N listing. Filterable by journal + date range. Real numbers, not the `Math.floor(* 0.15)` placeholders. |
| A2 | Per-journal traffic roll-up card on the dashboard | A1 | todo | A small "Top 5 journals by views (last 30 days)" card on `/admin/dashboard`, sourced from the same query path as A1. |
| A3 | Replace fabricated "Recent Activity" with real `UserEvent` aggregates | A0 | todo | Pure swap-out at `app/admin/analytics/page.tsx:174-198`. Pulls counts from `UserEvent` `WHERE created_at >= now() - INTERVAL 7 DAY` grouped by `event_type`. |
| A4 | Replace hard-coded "System Health" with real probes | A0 | todo | DB probe (`prisma.$queryRaw\`SELECT 1\``), OJS probe (`ojsHealthCheck()` already exists), storage probe (Initiative B will add `src/lib/storage.ts` — if absent, skip the row). |
| A5 | Audio-play tracking surface (cross-initiative) | Initiative B B3 done | todo | If/when Initiative B adds a `play` event, add an audio column to the A1 table. New row, not widening A1. |
| A6 | Login flow polish (optional) | A0 | todo | Drop the `as any` at `app/admin/login/page.tsx:42`; tighten the `LoginResponse` type. Trivially small. |

Out of scope here: any change to the **auth** code paths themselves — they are not broken (see A-INV-3).

---

## 3. Open Questions (must be closed before A1)

1. **A-D1**: Does the manager want a **new** `/admin/tracking` page, or should this content live inside the existing `/admin/analytics`? Adding a new sidebar entry (`components/admin-sidebar.tsx:23-80`) is a one-line change either way; the choice is purely UX.
2. **A-D2**: For the per-article table in A1, what is the canonical title shown? Options:
   - Read it from OJS via `article-detail-service.ts` (slow, one query per row).
   - Read it from Prisma `PublishedArticle` (only present for digitopub-published articles, may not cover OJS-only articles).
   - Batch-join via a single `ojsQuery` keyed by `(journal_id, submission_id)` pairs (fastest, recommended).
3. **A-D3**: Time window. Default to "last 30 days" with a 7d / 30d / 90d / all-time selector? Or simpler all-time only for v1?
4. **A-D4**: Cross-initiative — should A1 wait for Initiative B's audio-play event to land first, or ship view+download+citation only and add audio as A5? Recommend **ship A1 first**; add audio as A5 (independent PR, no widening).

---

## 4. Cross-initiative note

The brief recommends Initiative B first, A second. That ordering is supported by this analysis: A1's table is more useful once an `audio_plays` column joins it, and waiting on Initiative B avoids reshaping A1 twice. A3 / A4 do not depend on B and can ship in parallel with B if reviewer wants quicker wins.

---

## 5. Task board

| id | title | owner | depends-on | status | acceptance criteria |
| -- | -- | -- | -- | -- | -- |
| A0 | This analysis doc | [repo] | — | in-review | A-INV-1..A-INV-4 facts verified; A-D1..A-D4 closed by the reviewer. No code emitted. |
| A1 | Per-article tracking page (real view/download/citation counts) | [repo] | A0 + A-D1..A-D3 | todo | New (or extended) admin page reads `MetricsArticleMonthly` + OJS `metrics_submission` for per-article counts; filterable by journal + window. Adds a `Tracking` entry to `components/admin-sidebar.tsx:23-80` if A-D1 chooses a new page. Tests: route renders for an admin session, redirects for unauth; data join correctness on a seeded fixture. |
| A2 | Top journals card on dashboard | [repo] | A1 | todo | Adds one card to `app/admin/dashboard/page.tsx`; re-uses the A1 query path. |
| A3 | Real "Recent Activity" numbers | [repo] | A0 | in-review | **Done in this PR**. `Math.floor(* fraction)` lines at `app/admin/analytics/page.tsx:208/212/216` replaced with real 7-day windowed counts from `Submission.submission_date`, `Review.review_date`, `PublishedArticle.publication_date` plus `UserEvent` view/download counts (the last two collapse to a "—" empty state when no events have ever been recorded). Data sourced via the new `GET /api/admin-analytics/summary` `requireAdmin` route, consumed by `useAdminAnalyticsSummary` (TanStack Query). Regression guard: `tests/unit/admin-metrics-fabrication-guard.test.ts` fails the suite if `Math.floor((…)* 0.x)` is reintroduced in `app/admin/{analytics,dashboard}/page.tsx`. |
| A4 | Real "System Health" probes | [repo] | A0 | in-review | **Done in this PR (with one honest deletion)**. `prisma.$queryRaw\`SELECT 1\`` ping for "Database"; existing `ojsHealthCheck()` for "OJS integration". Hard-coded "Storage Status" and "API Status" rows **removed** — no real probe exists for either, and per the brief we do not assert a status we don't measure. Same regression guard catches re-introduction of the literal `>Operational<`. |
| A5 | Add audio plays to A1 table | [repo] | A1 + B3 done | todo | One new column in the A1 query / table; only meaningful once Initiative B has emitted any `play` event. |
| A6 | Login `as any` polish (optional) | [repo] | A0 | todo | Drop the cast at `app/admin/login/page.tsx:42`; tighten `LoginResponse`. |

Status values: `todo` · `ready` · `in-progress` · `in-review` · `blocked-on-ops` · `done`.
