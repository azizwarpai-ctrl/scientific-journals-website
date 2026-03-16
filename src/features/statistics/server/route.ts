import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"

// Simple in-memory cache
let statsCache: any = null
let lastFetchTime = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export const statisticsRouter = new Hono()
  .get("/", async (c) => {
    try {
      if (!isOjsConfigured()) {
        return c.json({ error: "OJS database not configured" }, 503)
      }

      const now = Date.now()
      if (statsCache && (now - lastFetchTime) < CACHE_TTL_MS) {
        return c.json({ data: statsCache })
      }

      // Query total journals (enabled = 1)
      const journalsData = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1")
      
      // Query published articles (status = 3)
      const articlesData = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM submissions WHERE status = 3")
      
      // Query total users
      const usersData = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users")
      
      // Query countries represented
      const countriesData = await ojsQuery<{ count: number }>("SELECT COUNT(DISTINCT country) as count FROM users WHERE country IS NOT NULL AND country != ''")
      
      statsCache = {
        totalJournals: journalsData[0]?.count || 0,
        totalArticles: articlesData[0]?.count || 0,
        totalUsers: usersData[0]?.count || 0,
        countriesCount: countriesData[0]?.count || 0,
      }
      lastFetchTime = now

      return c.json({ data: statsCache })
    } catch (error) {
      console.error("[STATISTICS_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch statistics" }, 500)
    }
  })
