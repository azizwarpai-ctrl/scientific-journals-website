import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { serializeRecord } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { ojsHealthCheck } from "@/src/features/ojs/server/ojs-client"
import { getOrSetCache, CACHE_HEADERS } from "@/src/lib/server-cache"
import { timeseriesQuerySchema } from "@/src/features/admin-analytics/schemas/timeseries-schema"
import { getTimeseries } from "./timeseries"
import { getSyncHealth } from "./sync-health"
import type { AdminAnalyticsSummary } from "@/src/features/admin-analytics/types/admin-analytics-types"

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

  const [
    journalsCount,
    submissionsCount,
    acceptedCount,
    publishedCount,
    reviewsCount,
    journalFields,
    newSubmissions7d,
    completedReviews7d,
    publishedArticles7d,
    viewEventsAny,
    views7d,
    downloadEventsAny,
    downloads7d,
    database,
    ojs,
  ] = await Promise.all([
    prisma.journal.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: "accepted" } }),
    prisma.publishedArticle.count(),
    prisma.review.count(),
    prisma.journal.findMany({
      select: { field: true, _count: { select: { submissions: true } } },
    }),
    prisma.submission.count({ where: { submission_date: { gte: windowStart } } }),
    prisma.review.count({ where: { review_date: { gte: windowStart } } }),
    prisma.publishedArticle.count({ where: { publication_date: { gte: windowStart } } }),
    prisma.userEvent.count({ where: { event_type: "view" } }),
    prisma.userEvent.count({ where: { event_type: "view", created_at: { gte: windowStart } } }),
    prisma.userEvent.count({ where: { event_type: "download" } }),
    prisma.userEvent.count({ where: { event_type: "download", created_at: { gte: windowStart } } }),
    probeDatabase(),
    ojsHealthCheck(),
  ])

  const fieldGroups = new Map<string, number>()
  for (const j of journalFields) {
    if (!j.field) continue
    fieldGroups.set(j.field, (fieldGroups.get(j.field) ?? 0) + j._count.submissions)
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
      newSubmissions: newSubmissions7d,
      completedReviews: completedReviews7d,
      publishedArticles: publishedArticles7d,
      views: viewEventsAny === 0 ? null : views7d,
      downloads: downloadEventsAny === 0 ? null : downloads7d,
    },
    health: { database, ojs },
    computedAt: new Date().toISOString(),
  }

  return c.json({ success: true, data: serializeRecord(summary) })
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
app.get("/sync-health", requireAdmin, async (c) => {
  try {
    const limitRaw = Number(c.req.query("limit") ?? 10)
    const limit = Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= 50 ? limitRaw : 10
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
