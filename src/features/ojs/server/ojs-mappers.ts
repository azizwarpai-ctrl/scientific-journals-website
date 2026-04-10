import { z } from "zod"
import sanitizeHtml from "sanitize-html"
import path from "node:path"
import { ojsJournalSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"
import { parseOjsCoverFilename } from "@/src/features/journals/server/ojs-cover-utils"

/** Raw row shape from the OJS MySQL database */
export const ojsJournalRowSchema = z.object({
    journal_id: z.number(),
    path: z.string(),
    primary_locale: z.string(),
    enabled: z.number(),           // DB stores as 0/1
    name: z.string().nullable(),
    description: z.string().nullable(),
    thumbnail: z.string().nullable(),
    issn: z.string().nullable().optional(),
    e_issn: z.string().nullable().optional(),
    publisher: z.string().nullable().optional(),
    abbreviation: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    aims_and_scope: z.string().nullable().optional(),
    author_guidelines: z.string().nullable().optional(),
})

export type OjsJournalRow = z.infer<typeof ojsJournalRowSchema>

/** Maps a raw DB row to the application domain model */
export function mapOjsJournalRow(row: OjsJournalRow, baseUrl: string): OjsJournal {
    const cleanDescription = row.description
        ? sanitizeHtml(row.description, { allowedTags: [], allowedAttributes: {} }).trim()
        : null;

    const imageFileRaw = parseOjsCoverFilename(row.thumbnail)
    // Sanitize filename to prevent path traversal (consistent with buildCoverUrl)
    const imageFile = imageFileRaw
        ? encodeURIComponent(path.basename(imageFileRaw))
        : null

    return ojsJournalSchema.parse({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: row.enabled === 1,   // int → boolean
        name: row.name,
        description: cleanDescription || null,
        thumbnail_url: imageFile ? `${baseUrl}/public/journals/${row.journal_id}/${imageFile}` : null,
        issn: row.issn || null,
        e_issn: row.e_issn || null,
        publisher: row.publisher || null,
        abbreviation: row.abbreviation || null,
        contact_name: row.contact_name || null,
        country: row.country || null,
        // Sanitize OJS HTML content — keep basic block elements, strip scripts/styles
        aims_and_scope: row.aims_and_scope
            ? sanitizeHtml(row.aims_and_scope, {
                allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
                allowedAttributes: {},
              }).trim() || null
            : null,
        author_guidelines: row.author_guidelines
            ? sanitizeHtml(row.author_guidelines, {
                allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
                allowedAttributes: {},
              }).trim() || null
            : null,
    })
}
