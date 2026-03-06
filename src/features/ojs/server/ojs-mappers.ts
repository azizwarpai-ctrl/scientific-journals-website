import { z } from "zod"
import { ojsJournalSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

/** Raw row shape from the OJS MySQL database */
export const ojsJournalRowSchema = z.object({
    journal_id: z.number(),
    path: z.string(),
    primary_locale: z.string(),
    enabled: z.number(),           // DB stores as 0/1
    name: z.string().nullable(),
    description: z.string().nullable(),
    thumbnail: z.string().nullable(),
})

export type OjsJournalRow = z.infer<typeof ojsJournalRowSchema>

/** Maps a raw DB row to the application domain model */
export function mapOjsJournalRow(row: OjsJournalRow, baseUrl: string): OjsJournal {
    return ojsJournalSchema.parse({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: row.enabled === 1,   // int → boolean
        name: row.name,
        description: row.description,
        thumbnail_url: row.thumbnail ? `${baseUrl}/public/journals/${row.journal_id}/${row.thumbnail}` : null,
    })
}
