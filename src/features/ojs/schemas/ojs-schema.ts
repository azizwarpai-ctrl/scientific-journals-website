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
    abbreviation: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    aims_and_scope: z.string().nullable().optional(),
    author_guidelines: z.string().nullable().optional(),
    publication_fee: z.number().nullable().optional(),
    submission_fee: z.number().nullable().optional(),
    publication_fee_description: z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
})

export const ojsJournalsResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ojsJournalSchema).optional(),
    configured: z.boolean(),
    error: z.string().optional(),
})

export type OjsJournal = z.infer<typeof ojsJournalSchema>
export type OjsJournalsResponse = z.infer<typeof ojsJournalsResponseSchema>

export const ojsStatsResponseSchema = z.record(z.string(), z.unknown())
export type OjsStatsResponse = z.infer<typeof ojsStatsResponseSchema>
