import { Hono } from "hono"
import { prisma } from "@/lib/db/config"

const app = new Hono()

app.get("/", async (c) => {
    try {
        const [activeJournals, publishedArticles, researchersResult] = await Promise.all([
            prisma.journal.count({
                where: { status: "active" },
            }),
            prisma.publishedArticle.count(),
            prisma.$queryRaw<{ count: string }[]>`
                SELECT CAST(COUNT(DISTINCT author_email) AS CHAR) as count 
                FROM Submission 
                WHERE author_email != ''
            `,
        ])

        const researchers = parseInt(researchersResult[0]?.count || "0")
        // For countries, we'll try to find a setting or use a base estimate + active journals
        // In a real scenario, we'd query a 'country' field in profiles
        // Synthetic KPI: Rename to reflect estimation
        const countriesEstimated = Math.max(12, Math.floor(activeJournals * 1.5))

        return c.json({
            success: true,
            data: {
                activeJournals,
                publishedArticles,
                researchers,
                countriesEstimated,
            },
        })
    } catch (error) {
        console.error("Error fetching home stats:", error)
        return c.json(
            {
                success: false,
                error: "Failed to fetch home statistics",
            },
            500
        )
    }
})

export { app as homeStatsRouter }
