import { Hono } from "hono"
import { isOjsConfigured } from "../../ojs/server/ojs-client"

const app = new Hono()

// ─── Simple In-Memory Cache (5 minutes TTL) ─────────────────────────
const CACHE_TTL = 5 * 60 * 1000
let statsCache = { data: null as any, expiresAt: 0 }

const OJS_BASE_URL = "https://submitmanager.com/api"

/**
 * Fetch from the PHP proxy using the same pattern as the working journals route.
 */
async function fetchFromProxy(action: string, params: Record<string, string> = {}): Promise<any> {
    const url = process.env.OJS_API_URL || `${OJS_BASE_URL}/api.php`
    const apiKey = process.env.OJS_API_KEY || ""

    const searchParams = new URLSearchParams({ action, ...params })
    const separator = url.includes("?") ? "&" : "?"
    const fullUrl = `${url}${separator}${searchParams.toString()}`

    const response = await fetch(fullUrl, {
        headers: { "X-API-KEY": apiKey },
        signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
        throw new Error(`OJS proxy returned ${response.status}`)
    }

    const json = await response.json() as any
    if (!json.success) {
        throw new Error(json.error || "OJS proxy error")
    }

    return json
}

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

        // Strategy 2: Try PHP proxy stats endpoint
        const statsResult = await fetchFromProxy("stats")
        const stats = statsResult.data

        const proxyData = {
            activeJournals: stats.active_journals ?? 0,
            publishedArticles: stats.published_submissions ?? 0,
            researchers: stats.distinct_authors ?? 0,
            countriesEstimated: stats.countries_represented ?? Math.max(12, (stats.active_journals ?? 0) * 2),
        }

        statsCache = { data: proxyData, expiresAt: Date.now() + CACHE_TTL }
        return c.json({ success: true, data: proxyData })
    } catch (statsError) {
        console.error("Stats fetch failed, trying proxy journals count fallback:", statsError)

        // Strategy 3: Count journals from the proxy's journals endpoint
        try {
            const journalsResult = await fetchFromProxy("journals")
            const journals = journalsResult.data || []
            const activeCount = journals.filter((j: any) => j.enabled).length

            const fallbackData = {
                activeJournals: activeCount,
                publishedArticles: 0,
                researchers: 0,
                countriesEstimated: Math.max(12, activeCount * 2),
            }

            return c.json({ success: true, data: fallbackData })
        } catch (journalsFallbackError) {
            console.error("Journals fallback also failed:", journalsFallbackError)

            // Strategy 4: Prisma fallback
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
    }
})

export { app as homeStatsRouter }
