import { z } from "zod"

export const homeStatsSchema = z.object({
    success: z.boolean(),
    data: z.object({
        activeJournals: z.number(),
        publishedArticles: z.number(),
        researchers: z.number(),
        countries: z.number(),
    }),
})

export type HomeStats = z.infer<typeof homeStatsSchema>["data"]
