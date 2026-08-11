import { z } from "zod"

/**
 * Query for GET /admin-analytics/charts. `journalId` optional positive int
 * (omit = all journals); `months` 1..24, default 12. `.catch` keeps a bad
 * value from 400ing — it falls back to the default (matches sync-health).
 */
export const chartsQuerySchema = z.object({
  journalId: z.coerce.number().int().positive().optional(),
  months: z.coerce.number().int().min(1).max(24).catch(12).default(12),
})

export type ChartsQuery = z.infer<typeof chartsQuerySchema>
