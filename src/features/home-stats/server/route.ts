import { Hono } from "hono"
import { isOjsConfigured } from "../../ojs/server/ojs-client"

const app = new Hono()

// ─── Simple In-Memory Cache (5 minutes TTL) ─────────────────────────
const CACHE_TTL = 5 * 60 * 1000
let statsCache = { data: null as any, expiresAt: 0 }

app.get("/", async (c) => {
    try {
        if (statsCache.data && Date.now() < statsCache.expiresAt) {
            return c.json({ success: true, data: statsCache.data })
        }

        // Strategy 1: Direct MySQL connection to external OJS
        if (isOjsConfigured()) {
            const { ojsQuery } = await import("../../ojs/server/ojs-client")
            const [journals] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1")
            const [submissions] = await ojsQuery<{ published: number }>(
                "SELECT SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as published FROM submissions"
            )
            const [users] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE disabled = 0")

            const activeCount = journals.count

            const directData = {
                activeJournals: activeCount,
                publishedArticles: Number(submissions.published || 0),
                researchers: users.count,
                countriesEstimated: Math.max(12, activeCount * 2),
            }

            statsCache = { data: directData, expiresAt: Date.now() + CACHE_TTL }
            return c.json({ success: true, data: directData })
        }

        // Strategy 2: Prisma fallback (when OJS is not configured)
        const { prisma } = await import("@/lib/db/config")
        const [activeJournals, publishedArticles] = await Promise.all([
            prisma.journal.count({ where: { status: "active" } }),
            prisma.publishedArticle.count(),
        ])

        const fallbackData = {
            activeJournals,
            publishedArticles,
            researchers: 0,
            countriesEstimated: Math.max(12, activeJournals * 2),
        }

        statsCache = { data: fallbackData, expiresAt: Date.now() + CACHE_TTL }
        return c.json({ success: true, data: fallbackData })

    } catch (error) {
        console.error("Failed to fetch home statistics:", error)
        return c.json(
            { success: false, error: "Failed to fetch home statistics" },
            500
        )
    }
})

export { app as homeStatsRouter }
