import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { prisma } from "@/lib/db/config"

const AUTHOR_ROLE_ID = 65536 // PKP\security\Role::ROLE_ID_AUTHOR

export const metricsRouter = new Hono()
    .get(
        "/",
        async (c) => {
            try {
                // If using direct MySQL DB
                if (isOjsConfigured()) {
                    // Run independent queries concurrently
                    const results = await Promise.allSettled([
                        ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1"),
                        // Count published submissions in active journals only
                        ojsQuery<{ count: number }>(
                            `SELECT COUNT(*) as count
                             FROM submissions s
                             INNER JOIN journals j ON j.journal_id = s.context_id AND j.enabled = 1
                             WHERE s.status = 3`
                        ),
                        // Count unique researchers (distinct author emails from published articles in active journals)
                        ojsQuery<{ count: number }>(
                            `SELECT COUNT(DISTINCT a.email) as count
                             FROM authors a
                             INNER JOIN publications p ON p.publication_id = a.publication_id
                             INNER JOIN submissions s ON s.submission_id = p.submission_id AND s.status = 3
                             INNER JOIN journals j ON j.journal_id = s.context_id AND j.enabled = 1`
                        ),
                        // Count countries from geographic metrics (real visitor/access data)
                        ojsQuery<{ count: number }>(
                            "SELECT COUNT(DISTINCT country) as count FROM metrics_submission_geo_monthly WHERE country != '' AND country IS NOT NULL"
                        ),
                        // Fallback: count countries from users with the Author role (role_id = AUTHOR_ROLE_ID)
                        ojsQuery<{ count: number }>(
                            `SELECT COUNT(DISTINCT u.country) as count
                             FROM users u
                             INNER JOIN user_user_groups uug ON uug.user_id = u.user_id
                             INNER JOIN user_groups ug ON ug.user_group_id = uug.user_group_id AND ug.role_id = ${AUTHOR_ROLE_ID}
                             WHERE u.country IS NOT NULL AND u.country != '' AND u.disabled = 0`
                        )
                    ])

                    // Safely extract results
                    const getCount = (res: PromiseSettledResult<any[]>): number => {
                        if (res.status === "fulfilled" && res.value && res.value.length > 0) {
                            return res.value[0].count || 0
                        }
                        return 0
                    }

                    const journalsCount = getCount(results[0])
                    const articlesCount = getCount(results[1])
                    const researchersCount = getCount(results[2])
                    const geoCountriesCount = getCount(results[3])
                    const userCountriesCount = getCount(results[4])

                    const queryErrors = results
                        .filter((r) => r.status === "rejected")
                        .map((r) => (r as PromiseRejectedResult).reason?.message || String((r as PromiseRejectedResult).reason))

                    let countriesCount = 0
                    if (geoCountriesCount > 0) {
                        countriesCount = geoCountriesCount
                    } else {
                        countriesCount = userCountriesCount
                    }

                    return c.json({
                        activeJournals: journalsCount,
                        publishedArticles: articlesCount,
                        researchers: researchersCount,
                        countriesEstimated: countriesCount,
                        debugErrors: queryErrors.length > 0 ? queryErrors : undefined,
                    })
                }

                // Fallback to internal Prisma DB
                const totalJournals = await prisma.journal.count({ where: { status: "active" } })
                const totalArticles = await prisma.submission.count({ where: { status: "published" } })
                const totalResearchers = await prisma.adminUser.count({ where: { role: { in: ["author", "reviewer", "editor"] } } })

                return c.json({
                    activeJournals: totalJournals,
                    publishedArticles: totalArticles,
                    researchers: totalResearchers,
                    countriesEstimated: 0,
                })
            } catch (error) {
                console.error("[METRICS_GET]", error)
                return c.json({ error: "Internal Error" }, 500)
            }
        }
    )
