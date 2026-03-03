import { Hono } from "hono"
import { prisma } from "@/lib/db/config"

const app = new Hono()

app.get("/", async (c) => {
    try {
        const [activeJournals, publishedArticles, researchersCount] = await Promise.all([
            prisma.journal.count({
                where: { status: "active" },
            }),
            prisma.publishedArticle.count(),
            prisma.submission.findMany({
                select: { author_email: true },
                distinct: ["author_email"],
            }),
        ])

        // Get countries count from unique authors or settings
        // For now, let's use a base number + growth or a setting if available
        const countriesCount = 120 // Default fallback

        return c.json({
            success: true,
            data: {
                activeJournals,
                publishedArticles,
                researchers: researchersCount.length,
                countries: countriesCount,
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
