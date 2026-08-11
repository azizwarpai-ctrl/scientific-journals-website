# Analytics Deep-Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin Analytics page into a real reporting view — a journal filter plus charts (monthly trend, status donut, acceptance funnel, by-journal bars, top-journals) — all backed by live OJS/snapshot data.

**Architecture:** A new server data module (`analytics-charts.ts`) exposes cached, journal-scoped read functions built on the existing `ojsQuery` + `syncedJournalIdClause`. A new `GET /admin-analytics/charts` endpoint serializes them. A TanStack Query hook feeds thin presentational recharts components (built on `components/ui/chart.tsx`) rendered by the rewritten Analytics page.

**Tech Stack:** Next.js 16 (App Router, React 19), Hono RPC, Prisma + mariadb adapter (OJS via `ojsQuery`), Zod v4 + `@hono/zod-validator`, TanStack Query v5, recharts 3 (`components/ui/chart.tsx`), Vitest.

## Global Constraints

- **Branch base:** implement on a branch based on `fix/admin-data-ojs-wiring` (PR #142) — this extends files that exist only there. Do NOT branch from `main`.
- **No fabricated data:** every figure is real OJS/snapshot data; render honest empty states where data is absent. `tests/unit/admin-metrics-fabrication-guard.test.ts` must stay green — no `Math.floor(<x> * 0.<n>)`, no hardcoded `>Operational<`.
- **No hydration mismatches (React #418):** every `toLocale*` / number format pins `"en-US"` and, for dates, `{ timeZone: "UTC" }`.
- **Scope to surfaced journals:** all OJS queries filter to synced `journal.ojs_id`s via `syncedJournalIdClause()`; short-circuit to empty when nothing is synced.
- **No new dependencies:** recharts + Radix Select already installed.
- **BigInt:** serialize Prisma/BigInt via `serializeRecord`/`serializeMany` before JSON.
- **API envelope:** `{ success: true, data }` on success; OJS-data failure degrades to `ojsAvailable:false` (never a 500 for missing OJS).
- **Commit trailer:** end commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- `src/features/admin-analytics/types/charts-types.ts` — **new.** DTOs: `MonthlyPoint`, `StatusDistribution`, `JournalBreakdownRow`, `AnalyticsCharts`.
- `src/features/admin-analytics/schemas/charts-schema.ts` — **new.** `chartsQuerySchema` (Zod).
- `src/features/admin-analytics/server/analytics-charts.ts` — **new.** Data layer: `getMonthlySeries`, `getStatusDistribution`, `getByJournalBreakdown`, pure helpers `monthSpine`, `deriveFunnel`.
- `src/features/admin-analytics/server/route.ts` — **modify.** Add `GET /charts`.
- `src/features/admin-analytics/api/use-admin-charts.ts` — **new.** TanStack Query hook.
- `components/admin/charts/trend-area-chart.tsx`, `status-donut.tsx`, `funnel-bars.tsx`, `category-bar-chart.tsx` — **new.** Presentational.
- `app/admin/analytics/page.tsx` — **modify.** Journal `<Select>` + chart layout.
- Tests: `tests/unit/analytics-charts.test.ts` (new), `tests/integration/admin-analytics-charts-route.test.ts` (new), `e2e/admin-analytics.spec.ts` (new or extend).

---

### Task 1: Data layer — pure helpers + OJS read functions

**Files:**
- Create: `src/features/admin-analytics/types/charts-types.ts`
- Create: `src/features/admin-analytics/server/analytics-charts.ts`
- Test: `tests/unit/analytics-charts.test.ts`

**Interfaces:**
- Consumes: `ojsQuery` (`@/src/features/ojs/server/ojs-client`), `prisma` (`@/src/lib/db/config`), `getOjsSubmissionCountsByJournal` (`@/src/features/ojs/server/ojs-stats-service`), `completeSubmissionPredicate` (`@/src/features/reviews/server/ojs-review-constants`).
- Produces:
  - `monthSpine(end: Date, months: number): string[]` — array of `"YYYY-MM"`, oldest→newest, length `months`, UTC.
  - `deriveFunnel(s: StatusDistribution): { submitted: number; accepted: number; published: number }`.
  - `getMonthlySeries(opts: { journalId?: number; months?: number; now?: Date }): Promise<MonthlyPoint[]>`.
  - `getStatusDistribution(opts: { journalId?: number }): Promise<StatusDistribution>`.
  - `getByJournalBreakdown(): Promise<JournalBreakdownRow[]>`.
  - Types (in `charts-types.ts`): `MonthlyPoint = { month: string; submissions: number; publications: number }`; `StatusDistribution = { inReview: number; inProduction: number; published: number; declined: number }`; `JournalBreakdownRow = { ojsId: string; title: string; submissions: number; articles: number; views: number; downloads: number }`; `AnalyticsCharts = { journals: { ojsId: string; title: string }[]; monthly: MonthlyPoint[]; statusDistribution: StatusDistribution; byJournal: JournalBreakdownRow[]; ojsAvailable: boolean; computedAt: string }`.

- [ ] **Step 1: Write the DTO types**

Create `src/features/admin-analytics/types/charts-types.ts`:

```ts
export interface MonthlyPoint {
  /** "YYYY-MM" (UTC). */
  month: string
  submissions: number
  publications: number
}

export interface StatusDistribution {
  inReview: number
  inProduction: number
  published: number
  declined: number
}

export interface JournalBreakdownRow {
  ojsId: string
  title: string
  submissions: number
  articles: number
  views: number
  downloads: number
}

export interface AnalyticsCharts {
  journals: { ojsId: string; title: string }[]
  monthly: MonthlyPoint[]
  statusDistribution: StatusDistribution
  byJournal: JournalBreakdownRow[]
  /** False when OJS reads failed; payload is zeroed/empty. */
  ojsAvailable: boolean
  computedAt: string
}
```

- [ ] **Step 2: Write the failing test for the pure helpers**

Create `tests/unit/analytics-charts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const hoisted = vi.hoisted(() => ({
  ojsQuery: vi.fn(),
  journalFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  submissionCounts: vi.fn(),
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({ ojsQuery: hoisted.ojsQuery }))
vi.mock("@/src/lib/db/config", () => ({
  prisma: {
    journal: { findMany: hoisted.journalFindMany },
    ojsJournalSnapshot: { findMany: hoisted.snapshotFindMany },
  },
}))
vi.mock("@/src/features/ojs/server/ojs-stats-service", () => ({
  getOjsSubmissionCountsByJournal: hoisted.submissionCounts,
}))

import {
  monthSpine,
  deriveFunnel,
  getMonthlySeries,
  getByJournalBreakdown,
} from "@/src/features/admin-analytics/server/analytics-charts"

const SYNCED = [{ ojs_id: "10" }, { ojs_id: "2" }, { ojs_id: null }]

beforeEach(() => {
  hoisted.ojsQuery.mockReset()
  hoisted.journalFindMany.mockReset().mockResolvedValue(SYNCED)
  hoisted.snapshotFindMany.mockReset()
  hoisted.submissionCounts.mockReset()
})

describe("monthSpine", () => {
  it("returns N UTC YYYY-MM labels oldest→newest ending at `end`", () => {
    expect(monthSpine(new Date("2026-03-15T00:00:00Z"), 3)).toEqual(["2026-01", "2026-02", "2026-03"])
  })
  it("crosses a year boundary", () => {
    expect(monthSpine(new Date("2026-01-10T00:00:00Z"), 3)).toEqual(["2025-11", "2025-12", "2026-01"])
  })
})

describe("deriveFunnel", () => {
  it("accepted = inProduction + published; submitted = all", () => {
    expect(deriveFunnel({ inReview: 5, inProduction: 3, published: 90, declined: 2 })).toEqual({
      submitted: 100,
      accepted: 93,
      published: 90,
    })
  })
})

describe("getMonthlySeries", () => {
  it("zero-fills missing months and coerces counts", async () => {
    // submissions query → rows; publications query → rows
    hoisted.ojsQuery
      .mockResolvedValueOnce([{ ym: "2026-02", c: "4" }, { ym: "2026-03", c: 2 }])
      .mockResolvedValueOnce([{ ym: "2026-03", c: "1" }])
    const out = await getMonthlySeries({ months: 3, now: new Date("2026-03-15T00:00:00Z") })
    expect(out).toEqual([
      { month: "2026-01", submissions: 0, publications: 0 },
      { month: "2026-02", submissions: 4, publications: 0 },
      { month: "2026-03", submissions: 2, publications: 1 },
    ])
  })
  it("short-circuits to a zeroed spine when nothing is synced", async () => {
    hoisted.journalFindMany.mockResolvedValue([])
    const out = await getMonthlySeries({ months: 2, now: new Date("2026-03-15T00:00:00Z") })
    expect(out).toEqual([
      { month: "2026-02", submissions: 0, publications: 0 },
      { month: "2026-03", submissions: 0, publications: 0 },
    ])
    expect(hoisted.ojsQuery).not.toHaveBeenCalled()
  })
})

describe("getByJournalBreakdown", () => {
  it("joins snapshot aggregates + submission counts by ojs_id", async () => {
    hoisted.snapshotFindMany.mockResolvedValue([
      { article_count: 40, views_total: 1000n, downloads_total: 200n, journal: { ojs_id: "10", title: "IJMP" } },
      { article_count: 5, views_total: 10n, downloads_total: 3n, journal: { ojs_id: "2", title: "OJBR" } },
    ])
    hoisted.submissionCounts.mockResolvedValue(new Map([["10", 60], ["2", 4]]))
    const rows = await getByJournalBreakdown()
    expect(rows).toEqual([
      { ojsId: "10", title: "IJMP", submissions: 60, articles: 40, views: 1000, downloads: 200 },
      { ojsId: "2", title: "OJBR", submissions: 4, articles: 5, views: 10, downloads: 3 },
    ])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test tests/unit/analytics-charts.test.ts`
Expected: FAIL — module `analytics-charts` not found / exports missing.

- [ ] **Step 4: Implement `analytics-charts.ts`**

Create `src/features/admin-analytics/server/analytics-charts.ts`:

```ts
import type { RowDataPacket } from "mysql2/promise"
import { prisma } from "@/src/lib/db/config"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { getOjsSubmissionCountsByJournal } from "@/src/features/ojs/server/ojs-stats-service"
import { completeSubmissionPredicate } from "@/src/features/reviews/server/ojs-review-constants"
import type {
  MonthlyPoint,
  StatusDistribution,
  JournalBreakdownRow,
} from "@/src/features/admin-analytics/types/charts-types"

/** Synced OJS journal ids as a validated IN() clause; null when none synced. */
async function syncedIdClause(): Promise<string | null> {
  const journals = await prisma.journal.findMany({ where: { ojs_id: { not: null } }, select: { ojs_id: true } })
  const ids = journals.map((j) => Number(j.ojs_id)).filter((n) => Number.isInteger(n) && n > 0)
  return ids.length ? ids.join(",") : null
}

/** `context_id` predicate: one journal when scoped, else the whole synced set. */
function contextPredicate(inClause: string, journalId?: number): string {
  return journalId && Number.isInteger(journalId) && journalId > 0
    ? `= ${journalId}`
    : `IN (${inClause})`
}

/** N "YYYY-MM" labels (UTC), oldest→newest, ending in `end`'s month. */
export function monthSpine(end: Date, months: number): string[] {
  const out: string[] = []
  const y = end.getUTCFullYear()
  const m = end.getUTCMonth() // 0-based
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return out
}

export function deriveFunnel(s: StatusDistribution): { submitted: number; accepted: number; published: number } {
  const submitted = s.inReview + s.inProduction + s.published + s.declined
  return { submitted, accepted: s.inProduction + s.published, published: s.published }
}

interface YmRow extends RowDataPacket { ym: string; c: number | string }

export async function getMonthlySeries(
  opts: { journalId?: number; months?: number; now?: Date } = {}
): Promise<MonthlyPoint[]> {
  const months = opts.months && opts.months > 0 && opts.months <= 24 ? opts.months : 12
  const spine = monthSpine(opts.now ?? new Date(), months)
  const inClause = await syncedIdClause()
  const base: MonthlyPoint[] = spine.map((month) => ({ month, submissions: 0, publications: 0 }))
  if (!inClause) return base

  const ctx = contextPredicate(inClause, opts.journalId)
  // Lower bound = first day of the oldest spine month (UTC), 'YYYY-MM-01 00:00:00'.
  const since = `${spine[0]}-01 00:00:00`

  const [subs, pubs] = await Promise.all([
    ojsQuery<YmRow>(
      `SELECT DATE_FORMAT(s.date_submitted, '%Y-%m') AS ym, COUNT(*) AS c
       FROM submissions s
       WHERE s.context_id ${ctx} AND s.date_submitted >= ?
       GROUP BY ym`,
      [since]
    ),
    ojsQuery<YmRow>(
      `SELECT DATE_FORMAT(p.date_published, '%Y-%m') AS ym, COUNT(*) AS c
       FROM publications p
       JOIN submissions s ON s.submission_id = p.submission_id
       WHERE s.context_id ${ctx} AND p.status = 3 AND p.date_published >= ?
       GROUP BY ym`,
      [since]
    ),
  ])

  const byMonth = new Map(base.map((p) => [p.month, p]))
  for (const r of subs) { const p = byMonth.get(r.ym); if (p) p.submissions = Number(r.c) }
  for (const r of pubs) { const p = byMonth.get(r.ym); if (p) p.publications = Number(r.c) }
  return base
}

interface StatusRow extends RowDataPacket {
  inReview: number; inProduction: number; published: number; declined: number
}

export async function getStatusDistribution(
  opts: { journalId?: number } = {}
): Promise<StatusDistribution> {
  const empty = { inReview: 0, inProduction: 0, published: 0, declined: 0 }
  const inClause = await syncedIdClause()
  if (!inClause) return empty
  const ctx = contextPredicate(inClause, opts.journalId)
  const rows = await ojsQuery<StatusRow>(
    `SELECT
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctx}
          AND s.stage_id IN (2,3) AND s.status = 1 AND ${completeSubmissionPredicate("s")}) AS inReview,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctx}
          AND s.stage_id IN (4,5) AND s.status = 1) AS inProduction,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctx} AND s.status = 3) AS published,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctx} AND s.status = 4) AS declined`
  )
  const r = rows[0]
  return {
    inReview: Number(r?.inReview ?? 0),
    inProduction: Number(r?.inProduction ?? 0),
    published: Number(r?.published ?? 0),
    declined: Number(r?.declined ?? 0),
  }
}

export async function getByJournalBreakdown(): Promise<JournalBreakdownRow[]> {
  const [snapshots, counts] = await Promise.all([
    prisma.ojsJournalSnapshot.findMany({
      select: {
        article_count: true,
        views_total: true,
        downloads_total: true,
        journal: { select: { ojs_id: true, title: true } },
      },
    }),
    getOjsSubmissionCountsByJournal(),
  ])
  return snapshots
    .filter((s) => s.journal?.ojs_id)
    .map((s) => {
      const ojsId = s.journal!.ojs_id as string
      return {
        ojsId,
        title: s.journal!.title ?? ojsId,
        submissions: counts.get(ojsId) ?? 0,
        articles: s.article_count ?? 0,
        views: Number(s.views_total ?? 0),
        downloads: Number(s.downloads_total ?? 0),
      }
    })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test tests/unit/analytics-charts.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/features/admin-analytics/types/charts-types.ts src/features/admin-analytics/server/analytics-charts.ts tests/unit/analytics-charts.test.ts
git commit -m "feat(admin-analytics): OJS chart data layer (monthly/status/by-journal)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Query schema + `/charts` endpoint (assembles `AnalyticsCharts`)

**Files:**
- Create: `src/features/admin-analytics/schemas/charts-schema.ts`
- Modify: `src/features/admin-analytics/server/route.ts`
- Test: `tests/integration/admin-analytics-charts-route.test.ts`

**Interfaces:**
- Consumes: `getMonthlySeries`, `getStatusDistribution`, `getByJournalBreakdown` (Task 1); `isOjsConfigured` (`ojs-client`); `prisma.journal.findMany`; `getOrSetCache`/`CACHE_HEADERS` (`@/src/lib/server-cache`); `serializeRecord`; `requireAdmin`; `zValidator`.
- Produces: `GET /admin-analytics/charts?journalId=&months=` → `{ success: true, data: AnalyticsCharts }`. `chartsQuerySchema` → `{ journalId?: number; months: number }`.

- [ ] **Step 1: Write the query schema**

Create `src/features/admin-analytics/schemas/charts-schema.ts`:

```ts
import { z } from "zod"

/**
 * Query for GET /admin-analytics/charts. `journalId` optional positive int
 * (omit = all journals); `months` 1..24, default 12. `.catch` keeps a bad
 * value from 400ing — it falls back to the default (matches sync-health).
 */
export const chartsQuerySchema = z.object({
  journalId: z.coerce.number().int().positive().optional(),
  months: z.coerce.number().int().min(1).max(24).catch(12).default(12),
})

export type ChartsQuery = z.infer<typeof chartsQuerySchema>
```

- [ ] **Step 2: Write the failing integration test**

Create `tests/integration/admin-analytics-charts-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

let mockSession: { id: bigint; email: string; role: string } | null = null
vi.mock("@/src/lib/db/auth", () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

const prismaMock = { journal: { findMany: vi.fn() } }
vi.mock("@/src/lib/db/config", () => ({ prisma: prismaMock }))

const isOjsConfiguredMock = vi.fn()
vi.mock("@/src/features/ojs/server/ojs-client", () => ({ isOjsConfigured: isOjsConfiguredMock }))

const getMonthlySeriesMock = vi.fn()
const getStatusDistributionMock = vi.fn()
const getByJournalBreakdownMock = vi.fn()
vi.mock("@/src/features/admin-analytics/server/analytics-charts", () => ({
  getMonthlySeries: getMonthlySeriesMock,
  getStatusDistribution: getStatusDistributionMock,
  getByJournalBreakdown: getByJournalBreakdownMock,
}))

const { adminAnalyticsRouter } = await import("@/src/features/admin-analytics/server")

function buildApp() {
  return new Hono().route("/admin-analytics", adminAnalyticsRouter)
}

beforeEach(() => {
  mockSession = null
  vi.clearAllMocks()
  prismaMock.journal.findMany.mockResolvedValue([{ ojs_id: "10", title: "IJMP" }, { ojs_id: null, title: "X" }])
})

describe("GET /admin-analytics/charts", () => {
  it("401 without an admin session", async () => {
    const res = await buildApp().request("/admin-analytics/charts")
    expect(res.status).toBe(401)
  })

  it("returns charts payload for an admin", async () => {
    mockSession = { id: 1n, email: "a@x.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(true)
    getMonthlySeriesMock.mockResolvedValue([{ month: "2026-03", submissions: 2, publications: 1 }])
    getStatusDistributionMock.mockResolvedValue({ inReview: 1, inProduction: 3, published: 90, declined: 2 })
    getByJournalBreakdownMock.mockResolvedValue([
      { ojsId: "10", title: "IJMP", submissions: 60, articles: 40, views: 1000, downloads: 200 },
    ])
    const res = await buildApp().request("/admin-analytics/charts?months=1")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { ojsAvailable: boolean; journals: unknown[]; monthly: unknown[]; byJournal: unknown[] } }
    expect(json.success).toBe(true)
    expect(json.data.ojsAvailable).toBe(true)
    expect(json.data.journals).toEqual([{ ojsId: "10", title: "IJMP" }]) // null ojs_id filtered out
    expect(json.data.monthly).toHaveLength(1)
    expect(json.data.byJournal).toHaveLength(1)
  })

  it("degrades to ojsAvailable:false when OJS reads throw", async () => {
    mockSession = { id: 1n, email: "a@x.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(true)
    getMonthlySeriesMock.mockRejectedValue(new Error("OJS down"))
    getStatusDistributionMock.mockRejectedValue(new Error("OJS down"))
    getByJournalBreakdownMock.mockRejectedValue(new Error("OJS down"))
    const res = await buildApp().request("/admin-analytics/charts")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { ojsAvailable: boolean; monthly: unknown[]; byJournal: unknown[] } }
    expect(json.data.ojsAvailable).toBe(false)
    expect(json.data.byJournal).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test tests/integration/admin-analytics-charts-route.test.ts`
Expected: FAIL — `/charts` route returns 404.

- [ ] **Step 4: Add the `/charts` handler**

In `src/features/admin-analytics/server/route.ts`: add imports at the top —

```ts
import { chartsQuerySchema } from "@/src/features/admin-analytics/schemas/charts-schema"
import {
  getMonthlySeries,
  getStatusDistribution,
  getByJournalBreakdown,
} from "./analytics-charts"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"
```

Then add the route (place after the `/summary` handler, before `export`):

```ts
app.get("/charts", requireAdmin, zValidator("query", chartsQuerySchema), async (c) => {
  const { journalId, months } = c.req.valid("query")
  const cacheKey = `admin-analytics:charts:${journalId ?? "all"}:${months}`
  const data = await getOrSetCache(cacheKey, 60_000, async (): Promise<AnalyticsCharts> => {
    // Journal picker options — synced journals only (local read, always available).
    const journalRows = await prisma.journal.findMany({
      where: { ojs_id: { not: null } },
      select: { ojs_id: true, title: true },
      orderBy: { title: "asc" },
    })
    const journals = journalRows
      .filter((j) => j.ojs_id)
      .map((j) => ({ ojsId: j.ojs_id as string, title: j.title ?? (j.ojs_id as string) }))

    let ojsAvailable = false
    let monthly: AnalyticsCharts["monthly"] = []
    let statusDistribution: AnalyticsCharts["statusDistribution"] = {
      inReview: 0, inProduction: 0, published: 0, declined: 0,
    }
    let byJournal: AnalyticsCharts["byJournal"] = []

    if (isOjsConfigured()) {
      try {
        const [m, s, b] = await Promise.all([
          getMonthlySeries({ journalId, months }),
          getStatusDistribution({ journalId }),
          // by-journal breakdown is only meaningful across all journals
          journalId ? Promise.resolve([]) : getByJournalBreakdown(),
        ])
        ojsAvailable = true
        monthly = m
        statusDistribution = s
        byJournal = b
      } catch (e) {
        console.error("[admin-analytics] charts reads failed:", e instanceof Error ? e.message : e)
      }
    }

    return { journals, monthly, statusDistribution, byJournal, ojsAvailable, computedAt: new Date().toISOString() }
  })
  return c.json({ success: true, data: serializeRecord(data) }, 200, CACHE_HEADERS)
})
```

(`requireAdmin`, `zValidator`, `getOrSetCache`, `CACHE_HEADERS`, `prisma`, `isOjsConfigured`, `serializeRecord` are already imported in this file from the `/summary` work; add only the ones missing.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test tests/integration/admin-analytics-charts-route.test.ts`
Expected: PASS (401, payload, degrade).

- [ ] **Step 6: Commit**

```bash
git add src/features/admin-analytics/schemas/charts-schema.ts src/features/admin-analytics/server/route.ts tests/integration/admin-analytics-charts-route.test.ts
git commit -m "feat(admin-analytics): GET /charts endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Client query hook

**Files:**
- Create: `src/features/admin-analytics/api/use-admin-charts.ts`

**Interfaces:**
- Consumes: `client` (`@/src/lib/rpc.ts`), `AnalyticsCharts` type. Reference `use-admin-analytics-summary.ts` for the exact pattern in this repo.
- Produces: `useAdminCharts(journalId?: string) => UseQueryResult<AnalyticsCharts>`.

- [ ] **Step 1: Read the existing hook to match the pattern**

Run: `sed -n '1,40p' src/features/admin-analytics/api/use-admin-analytics-summary.ts`
Note how it calls `client["admin-analytics"].summary.$get()`, unwraps `{ success, data }`, and sets `staleTime`.

- [ ] **Step 2: Write the hook**

Create `src/features/admin-analytics/api/use-admin-charts.ts` (mirror the summary hook exactly; only the endpoint, query key, and params differ):

```ts
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"

/** Charts for the analytics deep-dive; `journalId` omitted = all journals. */
export function useAdminCharts(journalId?: string) {
  return useQuery({
    queryKey: ["admin-analytics", "charts", journalId ?? "all"],
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsCharts> => {
      const query = journalId ? { journalId } : {}
      const res = await client["admin-analytics"].charts.$get({ query })
      if (!res.ok) throw new Error("Failed to load analytics charts")
      const json = (await res.json()) as { success: boolean; data: AnalyticsCharts }
      return json.data
    },
  })
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `bunx tsc --noEmit`
Expected: clean. (If the RPC client can't infer `.charts`, confirm the route in Task 2 built and `adminAnalyticsRouter` is exported from `src/features/admin-analytics/server.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/features/admin-analytics/api/use-admin-charts.ts
git commit -m "feat(admin-analytics): useAdminCharts query hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Presentational chart components

**Files:**
- Create: `components/admin/charts/trend-area-chart.tsx`, `status-donut.tsx`, `funnel-bars.tsx`, `category-bar-chart.tsx`

**Interfaces:**
- Consumes: `ChartContainer`, `ChartConfig`, `ChartTooltip`, `ChartTooltipContent` (`@/components/ui/chart`); recharts primitives; `MonthlyPoint`, `StatusDistribution`, `JournalBreakdownRow` types.
- Produces (all `"use client"`, presentational — no fetching):
  - `TrendAreaChart({ data }: { data: MonthlyPoint[] })`
  - `StatusDonut({ data }: { data: StatusDistribution })`
  - `FunnelBars({ submitted, accepted, published }: { submitted: number; accepted: number; published: number })`
  - `CategoryBarChart({ data, label }: { data: { label: string; value: number }[]; label: string })`

- [ ] **Step 1: Read the chart primitive to match usage**

Run: `sed -n '1,60p' components/ui/chart.tsx` and `sed -n '1,70p' components/admin/kpi-card.tsx`
Confirm `ChartContainer` takes a `config: ChartConfig` and CSS var colors `var(--color-<key>)`; components use `var(--chart-N)`.

- [ ] **Step 2: Write `trend-area-chart.tsx`**

```tsx
"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { MonthlyPoint } from "@/src/features/admin-analytics/types/charts-types"

const config: ChartConfig = {
  submissions: { label: "Submissions", color: "var(--chart-1)" },
  publications: { label: "Publications", color: "var(--chart-2)" },
}

export function TrendAreaChart({ data }: { data: MonthlyPoint[] }) {
  const total = data.reduce((s, p) => s + p.submissions + p.publications, 0)
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No monthly activity yet</p>
  }
  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label="Submissions and publications per month">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="submissions" type="monotone" stroke="var(--color-submissions)" fill="var(--color-submissions)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
        <Area dataKey="publications" type="monotone" stroke="var(--color-publications)" fill="var(--color-publications)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
```

- [ ] **Step 3: Write `status-donut.tsx`**

```tsx
"use client"

import { Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { StatusDistribution } from "@/src/features/admin-analytics/types/charts-types"

const config: ChartConfig = {
  inReview: { label: "In review", color: "var(--chart-1)" },
  inProduction: { label: "In production", color: "var(--chart-2)" },
  published: { label: "Published", color: "var(--chart-3)" },
  declined: { label: "Declined", color: "var(--chart-4)" },
}

export function StatusDonut({ data }: { data: StatusDistribution }) {
  const rows = [
    { key: "inReview", value: data.inReview },
    { key: "inProduction", value: data.inProduction },
    { key: "published", value: data.published },
    { key: "declined", value: data.declined },
  ].filter((r) => r.value > 0)
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet</p>
  }
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-56" aria-label={`Submission status distribution, ${total} total`}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
        <Pie data={rows} dataKey="value" nameKey="key" innerRadius={54} strokeWidth={2} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.key} fill={`var(--color-${r.key})`} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
```

- [ ] **Step 4: Write `funnel-bars.tsx`** (plain divs — a funnel is clearer as proportional bars than a recharts widget)

```tsx
"use client"

/** Submitted → Accepted → Published, as proportional horizontal bars. */
export function FunnelBars({ submitted, accepted, published }: { submitted: number; accepted: number; published: number }) {
  const stages = [
    { label: "Submitted", value: submitted, color: "var(--chart-1)" },
    { label: "Accepted", value: accepted, color: "var(--chart-2)" },
    { label: "Published", value: published, color: "var(--chart-3)" },
  ]
  const max = submitted || 1
  if (submitted === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet</p>
  }
  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.value.toLocaleString("en-US")} · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Write `category-bar-chart.tsx`** (horizontal bars; reused for by-journal + by-field)

```tsx
"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

/** Generic horizontal category bar chart. `data` is pre-sorted by the caller. */
export function CategoryBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const config: ChartConfig = { value: { label, color: "var(--chart-1)" } }
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
  }
  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label={label}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} tickMargin={6} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}
```

- [ ] **Step 6: Verify type-check + lint**

Run: `bunx tsc --noEmit && bunx eslint components/admin/charts/`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/admin/charts/
git commit -m "feat(admin-analytics): presentational chart components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Rewire the Analytics page (filter + charts)

**Files:**
- Modify: `app/admin/analytics/page.tsx`
- Test: `e2e/admin-analytics.spec.ts` (create)

**Interfaces:**
- Consumes: `useAdminCharts` (Task 3); `useAdminAnalyticsSummary` (existing); chart components (Task 4); `Select` (`@/components/ui/select`); `deriveFunnel` — re-import from `analytics-charts` is server-only, so compute the funnel inline in the client page from `statusDistribution`.
- Produces: the rendered deep-dive page. No new exported symbols.

- [ ] **Step 1: Read the current page + the Select primitive**

Run: `sed -n '1,120p' app/admin/analytics/page.tsx` and `sed -n '1,30p' components/ui/select.tsx`
Keep the existing `AnalyticsView` (summary KPIs, System Health, Recent Activity). You are ADDING a journal `<Select>` and a charts section, and replacing the hand-rolled "Submissions by Field" bars with `CategoryBarChart`.

- [ ] **Step 2: Add journal-filter state + charts hook to the page**

At the top of the client component add:

```tsx
const [journalId, setJournalId] = useState<string | undefined>(undefined)
const charts = useAdminCharts(journalId)
```

Render a `Select` in the page header (value `journalId ?? "all"`, `onValueChange` sets `undefined` for `"all"` else the value); options from `charts.data?.journals` (`{ ojsId, title }`). Import `useState` from React and the `Select*` parts from `@/components/ui/select`.

- [ ] **Step 3: Render the charts section**

Below the KPI grid, add a charts block driven by `charts.data`. Use a local funnel derivation (mirror of the server helper — types match `StatusDistribution`):

```tsx
function funnelFrom(s: { inReview: number; inProduction: number; published: number; declined: number }) {
  const submitted = s.inReview + s.inProduction + s.published + s.declined
  return { submitted, accepted: s.inProduction + s.published, published: s.published }
}
```

Then (inside the view, guarding on `charts.data`):

```tsx
{charts.data && (
  <>
    <Card>
      <CardHeader><CardTitle>Submissions &amp; Publications (12 mo)</CardTitle></CardHeader>
      <CardContent><TrendAreaChart data={charts.data.monthly} /></CardContent>
    </Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Status distribution</CardTitle></CardHeader>
        <CardContent><StatusDonut data={charts.data.statusDistribution} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Acceptance funnel</CardTitle></CardHeader>
        <CardContent><FunnelBars {...funnelFrom(charts.data.statusDistribution)} /></CardContent>
      </Card>
    </div>

    {/* All-journals only: cross-journal breakdowns */}
    {!journalId && charts.data.byJournal.length > 0 && (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Submissions by journal</CardTitle></CardHeader>
          <CardContent>
            <CategoryBarChart
              label="Submissions"
              data={[...charts.data.byJournal]
                .sort((a, b) => b.submissions - a.submissions)
                .slice(0, 10)
                .map((r) => ({ label: r.title, value: r.submissions }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Views by journal</CardTitle></CardHeader>
          <CardContent>
            <CategoryBarChart
              label="Views"
              data={[...charts.data.byJournal]
                .sort((a, b) => b.views - a.views)
                .slice(0, 10)
                .map((r) => ({ label: r.title, value: r.views }))}
            />
          </CardContent>
        </Card>
      </div>
    )}
  </>
)}
```

Replace the existing hand-rolled "Submissions by Field" bar list with a `CategoryBarChart` fed by `summary.fieldGroups` (`{ field, submissions }` → `{ label, value }`). Keep System Health + Recent Activity unchanged. When `charts.data?.ojsAvailable === false`, the charts render their own empty states (zeroed data) — no extra banner needed beyond the summary's existing one.

- [ ] **Step 4: Verify type-check + lint + fabrication guard**

Run: `bunx tsc --noEmit && bunx eslint app/admin/analytics/page.tsx && bun run test tests/unit/admin-metrics-fabrication-guard.test.ts`
Expected: tsc clean, 0 lint errors, guard PASS (no `Math.floor(*0.x)`, no `>Operational<`).

- [ ] **Step 5: Write the e2e spec**

Create `e2e/admin-analytics.spec.ts`:

```ts
import { test, expect } from "@playwright/test"

test.describe("admin analytics deep-dive", () => {
  test("renders KPIs, the journal filter, and chart regions without NaN", async ({ page }) => {
    await page.goto("/admin/analytics")
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible()
    // Journal filter present.
    await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 10_000 })
    // At least one chart card heading renders.
    await expect(page.getByText(/Submissions & Publications|Status distribution/i).first()).toBeVisible({ timeout: 10_000 })
    const body = await page.locator("body").innerText()
    expect(body).not.toContain("NaN")
  })
})
```

- [ ] **Step 6: Run the e2e spec** (needs the dev DB + built app per `playwright.config`)

Run: `bunx playwright test e2e/admin-analytics.spec.ts`
Expected: PASS. (OJS may be unreachable from the runner → charts show empty states, but headings + filter still render and there is no `NaN`.)

- [ ] **Step 7: Commit**

```bash
git add app/admin/analytics/page.tsx e2e/admin-analytics.spec.ts
git commit -m "feat(admin-analytics): analytics deep-dive page — journal filter + charts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Full verification + push

**Files:** none (verification only).

- [ ] **Step 1: Type-check**

Run: `bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: 0 errors.

- [ ] **Step 3: Full unit + integration suite**

Run: `bun run test`
Expected: all green — new `analytics-charts` unit tests, new `/charts` integration test, fabrication guard, and every prior suite still pass.

- [ ] **Step 4: Production build**

Run: `bunx next build`
Expected: compiles + type-checks; the `/admin/analytics` route builds (recharts client components bundle fine).

- [ ] **Step 5: Push the branch**

```bash
git push origin <analytics-deep-dive-branch>
```

Open a PR targeting the same base the branch was cut from (PR #142's branch, or `main` once #142 merges).

---

## Notes for the implementer

- **OJS is unreachable from the sandbox/CI runner.** Unit + integration tests mock `ojsQuery`/`prisma`, so they run everywhere. The real SQL (monthly `DATE_FORMAT` grouping, status subqueries) validates only against the production OJS on deploy — the queries reuse the exact table/column/predicate shapes already proven in `ojs-stats-service.ts` (`submissions`, `publications`, `context_id`, `status`, `stage_id`, `completeSubmissionPredicate`).
- **Views/downloads are lifetime + per-journal only** (no monthly engagement series) — the OJS `metrics_submission` date column is unconfirmed for this instance. Do not add a monthly views/downloads query.
- **Reviews activity** stays absent from charts (OJS `review_assignments` is empty) — the status/funnel/trend charts don't depend on it.
