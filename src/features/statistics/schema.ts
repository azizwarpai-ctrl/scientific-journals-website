import { z } from "zod"

export const platformStatisticsSchema = z.object({
  totalJournals: z.number(),
  totalArticles: z.number(),
  totalUsers: z.number(),
  countriesCount: z.number(),
})

export type PlatformStatistics = z.infer<typeof platformStatisticsSchema>

export const defaultPlatformStatistics: PlatformStatistics = {
  totalJournals: 0,
  totalArticles: 0,
  totalUsers: 0,
  countriesCount: 0,
}
