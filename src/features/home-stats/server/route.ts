import { Hono } from "hono"

const app = new Hono()

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
        // Strategy 1: Try PHP proxy stats endpoint
        const statsResult = await fetchFromProxy("stats")
        const stats = statsResult.data

        return c.json({
            success: true,
            data: {
                activeJournals: stats.active_journals ?? 0,
                publishedArticles: stats.published_submissions ?? 0,
                researchers: stats.distinct_authors ?? 0,
                countriesEstimated: stats.countries_represented ?? Math.max(12, (stats.active_journals ?? 0) * 2),
            },
        })
    } catch (statsError) {
        console.error("Stats proxy failed, trying journals count fallback:", statsError)

        // Strategy 2: Count journals from the proxy's journals endpoint
        // (this endpoint works even when stats doesn't)
        try {
            const journalsResult = await fetchFromProxy("journals")
            const journals = journalsResult.data || []
            const activeCount = journals.filter((j: any) => j.enabled).length

            return c.json({
                success: true,
                data: {
                    activeJournals: activeCount,
                    publishedArticles: 0,
                    researchers: 0,
                    countriesEstimated: Math.max(12, activeCount * 2),
                },
            })
        } catch (journalsFallbackError) {
            console.error("Journals fallback also failed:", journalsFallbackError)

            // Strategy 3: Prisma fallback
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
