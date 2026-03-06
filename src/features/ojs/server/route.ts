import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

const app = new Hono()

// ─── Simple In-Memory Cache (5 minutes TTL) ─────────────────────────
const CACHE_TTL = 5 * 60 * 1000
const cache = {
    journals: { data: null as any, expiresAt: 0 },
    stats: { data: null as any, expiresAt: 0 }
}

/**
 * Determines which OJS data source to use:
 * 
 * 1. OJS_API_URL (HTTP proxy) — preferred for shared hosting where direct
 *    MySQL connections are blocked. A PHP script on SiteGround serves the data.
 * 
 * 2. OJS_DATABASE_HOST (direct MySQL) — used when direct connection is available.
 * 
 * 3. Neither configured — returns { configured: false }
 */
function getOjsMode(): "http" | "direct" | "none" {
    if (process.env.OJS_DATABASE_HOST && process.env.OJS_DATABASE_NAME && process.env.OJS_DATABASE_USER) return "direct"
    if (process.env.OJS_API_URL) return "http"
    return "none"
}

// ─── HTTP Proxy Fetch (Generic) ─────────────────────────────────────

/**
 * Fetches data from the OJS PHP proxy API.
 * 
 * API key is sent ONLY via the X-API-KEY header (never as a query param)
 * to prevent it from being logged in server access logs.
 */
async function fetchFromOjsProxy<T = any>(
    action: string,
    params: Record<string, string | number> = {},
    timeoutMs = 15000
): Promise<T> {
    const baseUrl = process.env.OJS_API_URL!
    const apiKey = process.env.OJS_API_KEY || ""

    // Build URL with action and optional params
    const url = new URL(baseUrl)
    url.searchParams.set("action", action)
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "X-API-KEY": apiKey,
            "Accept": "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
        const body = await response.text().catch(() => "")
        throw new Error(`OJS proxy returned ${response.status}: ${response.statusText} — ${body}`)
    }

    const json = await response.json() as any

    if (!json.success) {
        throw new Error(`OJS proxy error: ${json.error || "Unknown error"}`)
    }

    return json as T
}

async function fetchJournalsFromProxy(): Promise<OjsJournal[]> {
    const result = await fetchFromOjsProxy<{ data: any[] }>("journals")

    return (result.data || []).map((row: any) => ({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: Boolean(row.enabled),
        name: row.name,
        description: row.description,
        thumbnail_url: row.thumbnail_url || null,
    }))
}

// ─── Direct MySQL Fetch ──────────────────────────────────────────────

async function fetchFromDatabase(): Promise<OjsJournal[]> {
    // Dynamic import to avoid loading mysql2 when using HTTP mode
    const { ojsQuery } = await import("./ojs-client")
    const { mapOjsJournalRow } = await import("./ojs-mappers")

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

    const baseUrl = process.env.OJS_API_URL
        ? new URL(process.env.OJS_API_URL).origin
        : "https://submitmanager.com"

    return rows.map((row) => mapOjsJournalRow(row, baseUrl))
}

// ─── Routes ──────────────────────────────────────────────────────────

// GET /ojs/journals
app.get("/journals", async (c) => {
    try {
        const mode = getOjsMode()

        if (mode === "none") {
            return c.json({ success: true, data: [], configured: false }, 200)
        }

        const start = Date.now()

        if (cache.journals.data && Date.now() < cache.journals.expiresAt) {
            return c.json({ ...cache.journals.data, latencyMs: Date.now() - start }, 200)
        }

        const journals = mode === "http"
            ? await fetchJournalsFromProxy()
            : await fetchFromDatabase()

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
        const mode = getOjsMode()

        if (mode === "none") {
            return c.json({ success: true, data: null, configured: false }, 200)
        }

        const start = Date.now()

        if (cache.stats.data && Date.now() < cache.stats.expiresAt) {
            return c.json({ ...cache.stats.data, latencyMs: Date.now() - start }, 200)
        }

        if (mode === "http") {
            const result = await fetchFromOjsProxy<{ data: any }>("stats")

            const httpPayload = { success: true, data: result.data, configured: true }
            cache.stats = { data: httpPayload, expiresAt: Date.now() + CACHE_TTL }

            return c.json(httpPayload, 200)
        }

        // Direct mode — run queries
        const { ojsQuery } = await import("./ojs-client")
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
    const mode = getOjsMode()

    if (mode === "none") {
        return c.json({ ok: false, configured: false, mode, error: null })
    }

    if (mode === "http") {
        const start = Date.now()
        try {
            const result = await fetchFromOjsProxy<{ data: any }>("health", {}, 10000)
            return c.json({
                ok: true,
                configured: true,
                mode: "http",
                connectionTest: true,
                latencyMs: Date.now() - start,
                status: 200,
                error: null,
                remote: result.data,
            }, 200)
        } catch (err: any) {
            return c.json({
                ok: false,
                configured: true,
                mode: "http",
                connectionTest: false,
                latencyMs: Date.now() - start,
                error: err.message,
            }, 503)
        }
    }

    // Direct mode — full diagnostic
    const { ojsDiagnostic } = await import("./ojs-client")
    const diagnostic = await ojsDiagnostic()
    return c.json(
        { ...diagnostic, mode: "direct" },
        diagnostic.ok ? 200 : 503
    )
})

export { app as ojsRouter }
