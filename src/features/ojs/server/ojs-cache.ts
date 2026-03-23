import type { z } from "zod"
import type { ojsJournalsResponseSchema, ojsStatsResponseSchema } from "@/src/features/ojs/schemas/ojs-schema"

export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export type CachedJournals = z.infer<typeof ojsJournalsResponseSchema> | null
export type OjsStats = z.infer<typeof ojsStatsResponseSchema>

export const ojsCache = {
    journals: { data: null as CachedJournals, expiresAt: 0 },
    stats: { data: null as OjsStats | null, expiresAt: 0 }
}
