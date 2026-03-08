import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
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
                    const [submissions] = await ojsQuery<{ published: number }>(
                        "SELECT SUM(status=3) as published FROM submissions"
                    )
                    const [users] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE disabled = 0")

                    return c.json({
                        activeJournals: journals?.count || 0,
                        publishedArticles: submissions?.published || 0,
                        researchers: users?.count || 0,
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
                })
            } catch (error) {
                console.error("[METRICS_GET]", error)
                return c.json({ error: "Internal Error" }, 500)
            }
        }
    )
