import { z } from "zod"

export const ojsJournalSchema = z.object({
    journal_id: z.number(),
    path: z.string(),
    primary_locale: z.string(),
    enabled: z.boolean(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    thumbnail_url: z.string().nullable().optional(),
    issn: z.string().nullable().optional(),
    e_issn: z.string().nullable().optional(),
    publisher: z.string().nullable().optional(),
})

export const ojsJournalsResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ojsJournalSchema).optional(),
    configured: z.boolean(),
    error: z.string().optional(),
})

export type OjsJournal = z.infer<typeof ojsJournalSchema>
export type OjsJournalsResponse = z.infer<typeof ojsJournalsResponseSchema>
