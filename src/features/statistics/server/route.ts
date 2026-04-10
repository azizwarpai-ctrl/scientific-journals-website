import { Hono } from "hono"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"

interface StatsData {
  totalJournals: number
  totalArticles: number
  totalUsers: number
  countriesCount: number
}

// Simple in-memory cache
let statsCache: StatsData | null = null
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

      // Execute database queries in parallel
      const queries = [
        ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1"),
        ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM submissions WHERE status = 3"),
        ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users"),
        ojsQuery<{ count: number }>("SELECT COUNT(DISTINCT country) as count FROM users WHERE country IS NOT NULL AND country != ''")
      ];

      const results = await Promise.allSettled(queries);

      interface CountRow { count: number }
      const extractCount = (result: PromiseSettledResult<CountRow[]>) => 
        result.status === "fulfilled" ? (result.value[0]?.count || 0) : 0;

      const journalsData = extractCount(results[0]);
      const articlesData = extractCount(results[1]);
      const usersData = extractCount(results[2]);
      const countriesData = extractCount(results[3]);

      statsCache = {
        totalJournals: journalsData,
        totalArticles: articlesData,
        totalUsers: usersData,
        countriesCount: countriesData,
      }
      lastFetchTime = now

      return c.json({ data: statsCache })
    } catch (error) {
      console.error("[STATISTICS_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch statistics" }, 500)
    }
  })
