import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { serializeRecord } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { ojsHealthCheck, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import {
  getOjsPlatformStats,
  getSnapshotAggregates,
  getOjsSubmissionCountsByJournal,
  getOjsLast7Stats,
} from "@/src/features/ojs/server/ojs-stats-service"
import { getOrSetCache, CACHE_HEADERS } from "@/src/lib/server-cache"
import { timeseriesQuerySchema, syncHealthQuerySchema } from "@/src/features/admin-analytics/schemas/timeseries-schema"
import { chartsQuerySchema } from "@/src/features/admin-analytics/schemas/charts-schema"
import { getTimeseries } from "./timeseries"
import { getSyncHealth } from "./sync-health"
import {
  getMonthlySeries,
  getStatusDistribution,
  getByJournalBreakdown,
} from "./analytics-charts"
import type { AdminAnalyticsSummary } from "@/src/features/admin-analytics/types/admin-analytics-types"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function probeDatabase(): Promise<{ ok: boolean; error: string | null }> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

const app = new Hono()

app.get("/summary", requireAdmin, async (c) => {
  const windowStart = new Date(Date.now() - SEVEN_DAYS_MS)

  // Local reads — always valid. Published Articles + lifetime views/downloads
  // come from the synced ojs_journal_snapshots aggregates (no OJS round-trip);
  // 7-day view/download events come from the local user_event stream.
  const [
    journalsCount,
    snapshot,
    journals,
    viewEventsAny,
    views7d,
    downloadEventsAny,
    downloads7d,
    database,
    ojs,
  ] = await Promise.all([
    prisma.journal.count(),
    getSnapshotAggregates(),
    prisma.journal.findMany({ select: { ojs_id: true, field: true } }),
    prisma.userEvent.count({ where: { event_type: "view" } }),
    prisma.userEvent.count({ where: { event_type: "view", created_at: { gte: windowStart } } }),
    prisma.userEvent.count({ where: { event_type: "download" } }),
    prisma.userEvent.count({ where: { event_type: "download", created_at: { gte: windowStart } } }),
    probeDatabase(),
    ojsHealthCheck(),
  ])

  // Live OJS reads — degrade to an unavailable state instead of fake zeros.
  let ojsAvailable = false
  let submissionsCount = 0
  let acceptedCount = 0
  let reviewsCount = 0
  // Published defaults to the snapshot aggregate; when OJS is up we use the
  // live count so it stays consistent with `accepted` (which uses the live
  // published figure).
  let publishedCount = snapshot.publishedArticles
  let last7 = { newSubmissions: 0, completedReviews: 0, publishedArticles: 0 }
  const fieldGroups = new Map<string, number>()

  if (isOjsConfigured()) {
    try {
      const [platform, countsByJournal, windowed] = await Promise.all([
        getOjsPlatformStats(),
        getOjsSubmissionCountsByJournal(),
        getOjsLast7Stats(windowStart),
      ])
      ojsAvailable = true
      submissionsCount = platform.totalSubmissions
      // "Accepted" = everything past review that wasn't declined
      // (in production + published).
      acceptedCount = platform.inProduction + platform.published
      publishedCount = platform.published
      reviewsCount = platform.totalReviews
      last7 = windowed

      for (const j of journals) {
        if (!j.field || !j.ojs_id) continue
        const count = countsByJournal.get(String(j.ojs_id)) ?? 0
        fieldGroups.set(j.field, (fieldGroups.get(j.field) ?? 0) + count)
      }
    } catch (e) {
      console.error("[admin-analytics] OJS summary reads failed:", e instanceof Error ? e.message : e)
    }
  }

  const acceptanceRate = submissionsCount > 0 ? (acceptedCount / submissionsCount) * 100 : 0

  const summary: AdminAnalyticsSummary = {
    totals: {
      journals: journalsCount,
      submissions: submissionsCount,
      accepted: acceptedCount,
      published: publishedCount,
      reviews: reviewsCount,
      acceptanceRate,
    },
    fieldGroups: Array.from(fieldGroups.entries())
      .map(([field, submissions]) => ({ field, submissions }))
      .sort((a, b) => b.submissions - a.submissions),
    last7: {
      newSubmissions: last7.newSubmissions,
      completedReviews: last7.completedReviews,
      publishedArticles: last7.publishedArticles,
      views: viewEventsAny === 0 ? null : views7d,
      downloads: downloadEventsAny === 0 ? null : downloads7d,
    },
    health: { database, ojs },
    ojsAvailable,
    computedAt: new Date().toISOString(),
  }

  return c.json({ success: true, data: serializeRecord(summary) })
})

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
    const journals = journalRows.reduce<{ ojsId: string; title: string }[]>((acc, j) => {
      if (j.ojs_id) acc.push({ ojsId: j.ojs_id, title: j.title ?? j.ojs_id })
      return acc
    }, [])

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

// GET /admin-analytics/timeseries?metrics=views,downloads&interval=day&from=…&to=…
app.get("/timeseries", requireAdmin, zValidator("query", timeseriesQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query")
    const cacheKey = `admin-analytics:timeseries:${JSON.stringify({ ...query, journalId: query.journalId?.toString() })}`
    const data = await getOrSetCache(cacheKey, 60_000, () => getTimeseries(query))
    return c.json({ success: true, data }, 200, CACHE_HEADERS)
  } catch (error) {
    console.error("[admin-analytics] timeseries failed:", error)
    return c.json({ success: false, error: "Failed to compute timeseries" }, 500)
  }
})

// GET /admin-analytics/sync-health?limit=10 — recurring-job ledger feed
app.get("/sync-health", requireAdmin, zValidator("query", syncHealthQuerySchema), async (c) => {
  try {
    const { limit } = c.req.valid("query")
    const data = await getOrSetCache(`admin-analytics:sync-health:${limit}`, 30_000, () =>
      getSyncHealth(limit)
    )
    return c.json({ success: true, data }, 200, CACHE_HEADERS)
  } catch (error) {
    console.error("[admin-analytics] sync-health failed:", error)
    return c.json({ success: false, error: "Failed to load sync health" }, 500)
  }
})

export { app as adminAnalyticsRouter }
