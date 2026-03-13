import { z } from "zod"
import sanitizeHtml from "sanitize-html"
import path from "node:path"
import { ojsJournalSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

/** Extract filename from OJS serialized PHP array or JSON */
function extractImageFilename(raw: string | null): string | null {
    if (!raw) return null;

    // Attempt JSON parsing (some newer OJS versions store metadata as JSON)
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.uploadName) return parsed.uploadName;
    } catch {
        // Fallback to Regex for PHP Array serialization (e.g. a:3:{s:10:"uploadName";s:12:"filename.png"})
        // Improved pattern: capture everything inside the surrounding quotes
        const match = raw.match(/"uploadName";(?:s:\d+:)?(".*?")/)
        if (match && match[1]) {
            return match[1].replace(/^"|"$/g, '');
        }
    }

    // Final fallback: If it's literally just a raw filename string (no serialization)
    if (!raw.includes(':{') && !raw.startsWith('a:')) {
        return raw;
    }

    return null;
}

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
})

export type OjsJournalRow = z.infer<typeof ojsJournalRowSchema>

/** Maps a raw DB row to the application domain model */
export function mapOjsJournalRow(row: OjsJournalRow, baseUrl: string): OjsJournal {
    const cleanDescription = row.description
        ? sanitizeHtml(row.description, { allowedTags: [], allowedAttributes: {} }).trim()
        : null;

    const imageFileRaw = extractImageFilename(row.thumbnail);
    // Sanitize and encode the filename to prevent traversal and handle special characters
    // Normalize backslashes to forward slashes before basename extraction
    const imageFile = imageFileRaw
        ? encodeURIComponent(path.basename(imageFileRaw.replace(/\\/g, '/')))
        : null;

    return ojsJournalSchema.parse({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: row.enabled === 1,   // int → boolean
        name: row.name,
        description: cleanDescription || null,
        // Hostinger specifies OJS is stored in the /ojs/ subdirectory, not the web root.
        thumbnail_url: imageFile ? `${baseUrl}/ojs/public/journals/${row.journal_id}/${imageFile}` : null,
        issn: row.issn || null,
        e_issn: row.e_issn || null,
        publisher: row.publisher || null,
        abbreviation: row.abbreviation || null,
        contact_name: row.contact_name || null,
        country: row.country || null,
    })
}
