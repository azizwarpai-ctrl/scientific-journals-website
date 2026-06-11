import { Hono } from "hono"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { serializeRecord } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { ojsHealthCheck } from "@/src/features/ojs/server/ojs-client"
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

export { app as adminAnalyticsRouter }
