import { z } from "zod"

export const homeStatsSchema = z.object({
    success: z.boolean(),
    data: z.object({
        activeJournals: z.number().int().nonnegative(),
        publishedArticles: z.number().int().nonnegative(),
        researchers: z.number().int().nonnegative(),
        countriesEstimated: z.number().int().nonnegative(),
    }),
})

export type HomeStats = z.infer<typeof homeStatsSchema>["data"]
