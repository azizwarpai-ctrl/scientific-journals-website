# Analytics deep-dive — charts + journal filter (sub-project 1)

**Date:** 2026-08-11
**Status:** Approved design, pre-implementation
**Depends on:** the admin-data work in PR #142 (`fix/admin-data-ojs-wiring`) — this
extends `src/features/ojs/server/ojs-stats-service.ts` and
`app/admin/analytics/page.tsx`, which only exist in that branch. Implement on a
branch based on #142 (or after it merges).

## Context

The admin **Dashboard** and **Analytics** pages currently present numbers as stat
cards and one hand-rolled "Submissions by Field" bar list. The user wants the data
visualized — breakdown charts, month-over-month trends, denser KPIs, and an
actionable ops view — across both pages. That scope is too large for one spec, so it
was decomposed into two sub-projects plus a shared data layer:

- **Shared OJS analytics data layer** (built here) — live, cached read functions for
  breakdowns + monthly series.
- **Sub-project 1 — Analytics deep-dive** (this spec) — the rich reporting page: a
  journal filter + charts, and the shared data layer it proves out.
- **Sub-project 2 — Dashboard overview** (separate, later spec) — KPI deltas, 1–2
  headline charts, and a "Needs attention" ops panel, reusing this data layer.

**Intended outcome:** Analytics becomes a real reporting page — every figure backed
by real OJS/snapshot data (no fabrication; honest empty states where data genuinely
doesn't exist), scoped platform-wide or to a single journal.

## Data feasibility (what is real)

- **Certain:** monthly submissions (`submissions.date_submitted`) and monthly
  publications (`publications.date_published`); status counts (in-review / in-
  production / published / declined); per-journal submission counts; per-journal
  article/issue/view/download totals + latest publication (from `ojs_journal_snapshots`).
- **Excluded (unconfirmed):** monthly views/downloads — `metrics_submission` is only
  grouped by `context_id` in this codebase and no per-row date column is confirmed for
  this OJS instance. Views/downloads are therefore shown as **lifetime totals + per-
  journal bars only**, not as a monthly series. (Revisit if the OJS metrics date
  column is verified.)
- **Empty:** `review_assignments` is empty in the connected OJS → any review-derived
  figure renders an explicit empty state, never a fabricated value.

## Section 1 — Shared data layer

New `src/features/admin-analytics/server/analytics-charts.ts`, reusing `ojsQuery` and
`syncedJournalIdClause` from `ojs-stats-service.ts` (scope every query to synced
journal ids; short-circuit to empty when nothing is synced):

- `getMonthlySeries({ journalId?, months = 12 })` → `[{ month: "YYYY-MM",
  submissions, publications }]`. Two `GROUP BY DATE_FORMAT(...,'%Y-%m')` queries over
  `submissions`/`publications`, merged and **dense-filled** (zero for missing months)
  across the last `months`, mirroring the spine logic in `admin-analytics/server/timeseries.ts`.
- `getStatusDistribution({ journalId? })` → `{ inReview, inProduction, published,
  declined }` — the scoped status counts (reuse the predicates already in
  `getOjsPlatformStats`).
- `getByJournalBreakdown()` → `[{ ojsId, title, submissions, articles, views,
  downloads }]` — synced `journal` titles (local Prisma) joined to snapshot aggregates
  + per-journal submission counts. All-journals only.
- Funnel (`submitted → accepted → published`) and top-journals are derived in JS from
  the above — no extra queries.

New endpoint in `src/features/admin-analytics/server/route.ts`:
`GET /charts?journalId=&months=` (admin-only), validated with a Zod query schema
(`journalId?` positive int, `months` int 1..24 default 12, `.catch` to defaults).
Returns `{ journals: [{ ojsId, title }], monthly, statusDistribution, byJournal,
ojsAvailable, computedAt }`, wrapped in `getOrSetCache` (60 s) + `CACHE_HEADERS`,
BigInt-serialized via `serializeRecord`. On OJS failure → `ojsAvailable: false` with
zeroed/empty payload (same degrade pattern as `/summary`), never a 500 for data.

## Section 2 — Analytics page UX

`app/admin/analytics/page.tsx` gains a journal `<Select>` (top-right; options =
`charts.journals` + an "All journals" default) feeding a `useAdminCharts(journalId)`
query hook. Layout:

- **KPI row** — the existing six cards, rescoped to the selected journal.
- **Monthly trend** — `TrendAreaChart`: submissions vs publications, last 12 months.
- **Status donut** + **acceptance funnel**, side by side.
- **All-journals view only:** "Submissions by journal" bar, "Views vs downloads by
  journal" bar, **Top journals** table, and the existing "Submissions by field"
  (re-rendered through the shared bar component).
- **Single-journal view:** hide the cross-journal bars; show that journal's trend +
  status + funnel + latest-publication date.
- Keep **System Health** and **Recent Activity (7d)** at the bottom (unchanged).
- **States:** OJS down → the existing unavailable notice + charts render "no data yet"
  empty states; loading → skeletons. The fabrication guard
  (`tests/unit/admin-metrics-fabrication-guard.test.ts`) must stay green — no
  `Math.floor(*0.x)` multipliers, no hardcoded status text.

## Section 3 — Components, testing, non-goals

**Chart components** — new `components/admin/charts/`, all `"use client"`,
presentational only (typed data props, no fetching), theme-aware via the `--chart-1..5`
tokens and `ChartContainer`/`ChartConfig` from `components/ui/chart.tsx`:
- `TrendAreaChart` (recharts Area/Line), `StatusDonut` (Pie donut), `FunnelBars`,
  `CategoryBarChart` (reused for by-journal submissions, views-vs-downloads, and by-
  field). Existing `KpiCard` reused for the KPI row.
- Each sits in a `<Card>` with a title and an accessible summary
  (`aria-label`/visually-hidden caption with the headline number) so the SVG is not
  opaque to screen readers.

**Client**: `src/features/admin-analytics/api/use-admin-charts.ts` (TanStack Query,
mirrors `use-admin-analytics-summary.ts`); DTOs in `admin-analytics/types/`. All
number/date formatting pinned `en-US` + `timeZone:"UTC"` to avoid hydration (#418).

**Testing:**
- Unit (vitest, mock `ojsQuery`/`prisma`, per `ojs-stats-service.test.ts`):
  `getMonthlySeries` dense-fill + labels, funnel derivation, `getByJournalBreakdown`
  mapping/coercion, empty-when-nothing-synced short-circuit.
- Integration: `GET /admin-analytics/charts` (mock the service) — payload shape,
  `ojsAvailable:false` degrade, journal scoping.
- e2e: extend the analytics spec — journal `<Select>` present, ≥1 chart region renders
  (test id), body contains no `NaN`.
- No chart-component render tests (repo has no jsdom/RTL harness); the logic lives in
  the tested data layer and the components are thin.

**Non-goals (YAGNI):** monthly views/downloads (unconfirmed OJS date column); date-
range picker (journal filter only); chart-data export (deferred — the CSV/JSON/Excel
exporter already exists if wanted later); any new dependency (recharts already
installed); review-activity charts beyond an empty state.

## Verification

1. `bunx tsc --noEmit` clean; `bun run lint` 0 errors; `bun run test` green (new unit +
   integration tests, fabrication guard still passes).
2. `bunx next build` succeeds (skips the prod `migrate deploy`).
3. Manual (post-deploy — OJS unreachable from the sandbox): Analytics shows the monthly
   trend + status donut + funnel + by-journal bars with real numbers; the journal
   `<Select>` rescopes every chart; OJS-down shows the unavailable state, not zeros or
   `NaN`.

## Files
- New: `src/features/admin-analytics/server/analytics-charts.ts`,
  `src/features/admin-analytics/api/use-admin-charts.ts`,
  `components/admin/charts/*` (Trend/Donut/Funnel/CategoryBar),
  chart DTOs in `src/features/admin-analytics/types/`,
  a `chartsQuerySchema` in `src/features/admin-analytics/schemas/`.
- Edit: `src/features/admin-analytics/server/route.ts` (add `/charts`),
  `app/admin/analytics/page.tsx` (filter + charts), plus tests.
- Reuse: `ojsQuery` + `syncedJournalIdClause` + status predicates
  (`ojs-stats-service.ts`), `ChartContainer`/tokens (`components/ui/chart.tsx`),
  `KpiCard`, `getOrSetCache`/`CACHE_HEADERS`, `serializeRecord`, `zValidator`.
