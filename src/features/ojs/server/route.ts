import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"
import { mapOjsJournalRow } from "./ojs-mappers"
import { ojsQuery, isOjsConfigured, ojsHealthCheck } from "./ojs-client"

const app = new Hono()

// ─── Simple In-Memory Cache (5 minutes TTL) ─────────────────────────
const CACHE_TTL = 5 * 60 * 1000
const cache = {
    journals: { data: null as any, expiresAt: 0 },
    stats: { data: null as any, expiresAt: 0 }
}

// ─── Direct MySQL Fetch ──────────────────────────────────────────────

async function fetchFromDatabase(): Promise<OjsJournal[]> {
    const rows = await ojsQuery<any>(`
        SELECT
            j.journal_id,
            j.path,
            j.primary_locale,
            j.enabled,
            js_name.setting_value AS name,
            js_desc.setting_value AS description,
            js_thumb.setting_value AS thumbnail,
            js_issn.setting_value AS issn,
            js_eissn.setting_value AS e_issn,
            js_pub.setting_value AS publisher
        FROM journals j
        LEFT JOIN journal_settings js_name
            ON js_name.journal_id = j.journal_id
            AND js_name.setting_name = 'name'
            AND js_name.locale = j.primary_locale
        LEFT JOIN journal_settings js_desc
            ON js_desc.journal_id = j.journal_id
            AND js_desc.setting_name = 'description'
            AND js_desc.locale = j.primary_locale
        LEFT JOIN journal_settings js_thumb
            ON js_thumb.journal_id = j.journal_id
            AND js_thumb.setting_name = 'journalThumbnail'
        LEFT JOIN journal_settings js_issn
            ON js_issn.journal_id = j.journal_id
            AND js_issn.setting_name = 'printIssn'
            AND js_issn.locale = ''
        LEFT JOIN journal_settings js_eissn
            ON js_eissn.journal_id = j.journal_id
            AND js_eissn.setting_name = 'onlineIssn'
            AND js_eissn.locale = ''
        LEFT JOIN journal_settings js_pub
            ON js_pub.journal_id = j.journal_id
            AND js_pub.setting_name = 'publisherInstitution'
            AND js_pub.locale = j.primary_locale
        WHERE j.enabled = 1
        ORDER BY j.seq ASC
    `)

    const baseUrl = process.env.OJS_BASE_URL

    if (!baseUrl) {
        throw new Error("OJS_BASE_URL environment variable is missing but required for OJS integration.")
    }

    return rows.map((row) => mapOjsJournalRow(row, baseUrl))
}

// ─── Routes ──────────────────────────────────────────────────────────

// GET /ojs/journals
app.get("/journals", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json({ success: true, data: [], configured: false }, 200)
        }

        const start = Date.now()

        if (cache.journals.data && Date.now() < cache.journals.expiresAt) {
            return c.json({ ...cache.journals.data, latencyMs: Date.now() - start }, 200)
        }

        const journals = await fetchFromDatabase()
        const responsePayload = { success: true as const, data: journals, configured: true as const }

        const validated = ojsJournalsResponseSchema.safeParse(responsePayload)
        if (!validated.success) {
            console.error("OJS response validation failed:", validated.error.flatten())
            return c.json(
                { success: false, configured: true, error: "Internal data validation error" },
                500
            )
        }

        const validatedData = validated.data
        cache.journals = {
            data: validatedData,
            expiresAt: Date.now() + CACHE_TTL
        }

        return c.json({ ...validatedData, latencyMs: Date.now() - start }, 200)
    } catch (error) {
        console.error("Error fetching OJS journals:", error)
        return c.json(
            { success: false, configured: true, error: "Failed to fetch OJS journals" },
            500
        )
    }
})



// GET /ojs/health — Full diagnostic endpoint for the debug page
app.get("/health", async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ ok: false, configured: false, mode: "none", error: null })
    }

    const diagnostic = await ojsHealthCheck()
    return c.json(
        { ...diagnostic, mode: "direct" },
        diagnostic.ok ? 200 : 503
    )
})

export { app as ojsRouter }
