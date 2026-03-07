import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"
import { mapOjsJournalRow } from "./ojs-mappers"
import { ojsQuery, isOjsConfigured, ojsDiagnostic } from "./ojs-client"

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
            js_thumb.setting_value AS thumbnail
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
        WHERE j.enabled = 1
        ORDER BY j.seq ASC
    `)

    const baseUrl = "https://submitmanager.com"

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

// GET /ojs/stats — Aggregate statistics from OJS
app.get("/stats", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json({ success: true, data: null, configured: false }, 200)
        }

        const start = Date.now()

        if (cache.stats.data && Date.now() < cache.stats.expiresAt) {
            return c.json({ ...cache.stats.data, latencyMs: Date.now() - start }, 200)
        }

        const [journals] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM journals WHERE enabled = 1")
        const [submissions] = await ojsQuery<{ total: number; published: number }>(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as published FROM submissions"
        )
        const [users] = await ojsQuery<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE disabled = 0")

        const directPayload = {
            success: true,
            configured: true,
            data: {
                active_journals: journals.count,
                total_submissions: submissions.total,
                published_submissions: submissions.published,
                registered_users: users.count,
            },
        }

        cache.stats = { data: directPayload, expiresAt: Date.now() + CACHE_TTL }

        return c.json({ ...directPayload, latencyMs: Date.now() - start }, 200)
    } catch (error) {
        console.error("Error fetching OJS stats:", error)
        return c.json({ success: false, configured: true, error: "Failed to fetch OJS stats" }, 500)
    }
})

// GET /ojs/health — Full diagnostic endpoint for the debug page
app.get("/health", async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ ok: false, configured: false, mode: "none", error: null })
    }

    const diagnostic = await ojsDiagnostic()
    return c.json(
        { ...diagnostic, mode: "direct" },
        diagnostic.ok ? 200 : 503
    )
})

export { app as ojsRouter }
