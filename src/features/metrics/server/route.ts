import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { prisma } from "@/lib/db/config"

export const metricsRouter = new Hono()
    .get(
        "/",
        async (c) => {
            try {
                // If using direct MySQL DB
                if (isOjsConfigured()) {
                    const [journals] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1")

                    // Count published submissions in active journals only
                    const [articles] = await ojsQuery<{ count: number }>(
                        `SELECT COUNT(*) as count
                         FROM submissions s
                         INNER JOIN journals j ON j.journal_id = s.context_id AND j.enabled = 1
                         WHERE s.status = 3`
                    )

                    // Count unique researchers (distinct author emails from published articles in active journals)
                    const [researchers] = await ojsQuery<{ count: number }>(
                        `SELECT COUNT(DISTINCT a.email) as count
                         FROM authors a
                         INNER JOIN publications p ON p.publication_id = a.publication_id
                         INNER JOIN submissions s ON s.submission_id = p.submission_id AND s.status = 3
                         INNER JOIN journals j ON j.journal_id = s.context_id AND j.enabled = 1`
                    )

                    // Count countries from geographic metrics (real visitor/access data), fallback to user countries
                    let countriesCount = 0
                    const [geoCountries] = await ojsQuery<{ count: number }>(
                        "SELECT COUNT(DISTINCT country) as count FROM metrics_submission_geo_monthly WHERE country != '' AND country IS NOT NULL"
                    )
                    if (geoCountries?.count > 0) {
                        countriesCount = geoCountries.count
                    } else {
                        // Fallback: count countries from users with the Author role (role_id = 65536)
                        const [userCountries] = await ojsQuery<{ count: number }>(
                            `SELECT COUNT(DISTINCT u.country) as count
                             FROM users u
                             INNER JOIN user_user_groups uug ON uug.user_id = u.user_id
                             INNER JOIN user_groups ug ON ug.user_group_id = uug.user_group_id AND ug.role_id = 65536
                             WHERE u.country IS NOT NULL AND u.country != '' AND u.disabled = 0`
                        )
                        countriesCount = userCountries?.count || 0
                    }

                    return c.json({
                        activeJournals: journals?.count || 0,
                        publishedArticles: articles?.count || 0,
                        researchers: researchers?.count || 0,
                        countriesEstimated: countriesCount,
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
