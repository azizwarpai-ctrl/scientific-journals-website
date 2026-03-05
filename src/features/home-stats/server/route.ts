import { Hono } from "hono"

const app = new Hono()

const OJS_BASE_URL = "https://submitmanager.com/api"

app.get("/", async (c) => {
    try {
        // Use PHP proxy for stats (OJS data on SiteGround)
        const url = process.env.OJS_API_URL || `${OJS_BASE_URL}/api.php`
        const apiKey = process.env.OJS_API_KEY || ""

        const separator = url.includes("?") ? "&" : "?"
        const fullUrl = `${url}${separator}action=stats`

        const response = await fetch(fullUrl, {
            headers: { "X-API-KEY": apiKey },
            signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
            throw new Error(`Stats proxy returned ${response.status}`)
        }

        const json = await response.json() as any
        if (!json.success) {
            throw new Error(json.error || "Failed to fetch stats")
        }

        const stats = json.data

        return c.json({
            success: true,
            data: {
                activeJournals: stats.active_journals ?? 0,
                publishedArticles: stats.published_submissions ?? 0,
                researchers: stats.distinct_authors ?? 0,
                countriesEstimated: stats.countries_represented ?? Math.max(12, (stats.active_journals ?? 0) * 2),
            },
        })
    } catch (error) {
        console.error("Error fetching home stats:", error)

        // Fallback: try Prisma if proxy fails
        try {
            const { prisma } = await import("@/lib/db/config")
            const [activeJournals, publishedArticles] = await Promise.all([
                prisma.journal.count({ where: { status: "active" } }),
                prisma.publishedArticle.count(),
            ])

            return c.json({
                success: true,
                data: {
                    activeJournals,
                    publishedArticles,
                    researchers: 0,
                    countriesEstimated: Math.max(12, activeJournals * 2),
                },
            })
        } catch {
            return c.json(
                { success: false, error: "Failed to fetch home statistics" },
                500
            )
        }
    }
})

export { app as homeStatsRouter }
