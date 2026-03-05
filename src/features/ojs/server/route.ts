import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

const app = new Hono()

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
    if (process.env.OJS_API_URL) return "http"
    if (process.env.OJS_DATABASE_HOST && process.env.OJS_DATABASE_NAME && process.env.OJS_DATABASE_USER) return "direct"
    return "none"
}

// ─── HTTP Proxy Fetch ────────────────────────────────────────────────

async function fetchFromProxy(): Promise<OjsJournal[]> {
    const url = process.env.OJS_API_URL!
    const apiKey = process.env.OJS_API_KEY || ""

    const response = await fetch(url, {
        headers: { "X-API-KEY": apiKey },
        signal: AbortSignal.timeout(15000), // 15s timeout
    })

    if (!response.ok) {
        throw new Error(`OJS proxy returned ${response.status}: ${response.statusText}`)
    }

    const json = await response.json() as any

    if (!json.success) {
        throw new Error(`OJS proxy error: ${json.error || "Unknown error"}`)
    }

    return (json.data || []).map((row: any) => ({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: Boolean(row.enabled),
        name: row.name,
        description: row.description,
    }))
}

// ─── Direct MySQL Fetch ──────────────────────────────────────────────

async function fetchFromDatabase(): Promise<OjsJournal[]> {
    // Dynamic import to avoid loading mariadb when using HTTP mode
    const { ojsQuery } = await import("./ojs-client")

    const rows = await ojsQuery<{
        journal_id: number
        path: string
        primary_locale: string
        enabled: number
        name: string | null
        description: string | null
    }>(`
        SELECT
            j.journal_id,
            j.path,
            j.primary_locale,
            j.enabled,
            js_name.setting_value AS name,
            js_desc.setting_value AS description
        FROM journals j
        LEFT JOIN journal_settings js_name
            ON js_name.journal_id = j.journal_id
            AND js_name.setting_name = 'name'
            AND js_name.locale = j.primary_locale
        LEFT JOIN journal_settings js_desc
            ON js_desc.journal_id = j.journal_id
            AND js_desc.setting_name = 'description'
            AND js_desc.locale = j.primary_locale
        WHERE j.enabled = 1
        ORDER BY j.seq ASC
    `)

    return rows.map((row) => ({
        journal_id: row.journal_id,
        path: row.path,
        primary_locale: row.primary_locale,
        enabled: row.enabled === 1,
        name: row.name,
        description: row.description,
    }))
}

// ─── Routes ──────────────────────────────────────────────────────────

// GET /ojs/journals
app.get("/journals", async (c) => {
    try {
        const mode = getOjsMode()

        if (mode === "none") {
            return c.json({ success: true, data: [], configured: false }, 200)
        }

        const journals = mode === "http"
            ? await fetchFromProxy()
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

        return c.json(validated.data, 200)
    } catch (error) {
        console.error("Error fetching OJS journals:", error)
        return c.json(
            { success: false, configured: true, error: "Failed to fetch OJS journals" },
            500
        )
    }
})

// GET /ojs/health
app.get("/health", async (c) => {
    const mode = getOjsMode()

    if (mode === "none") {
        return c.json({ ok: false, configured: false, mode, error: null })
    }

    if (mode === "http") {
        const start = Date.now()
        try {
            const url = process.env.OJS_API_URL!
            const apiKey = process.env.OJS_API_KEY || ""
            const res = await fetch(url, {
                headers: { "X-API-KEY": apiKey },
                signal: AbortSignal.timeout(10000),
            })
            return c.json({
                ok: res.ok,
                configured: true,
                mode: "http",
                latencyMs: Date.now() - start,
                status: res.status,
                error: res.ok ? null : `HTTP ${res.status}`,
            }, res.ok ? 200 : 503)
        } catch (err: any) {
            return c.json({
                ok: false,
                configured: true,
                mode: "http",
                latencyMs: Date.now() - start,
                error: err.message,
            }, 503)
        }
    }

    // Direct mode health check
    const { ojsHealthCheck } = await import("./ojs-client")
    const status = await ojsHealthCheck()
    return c.json({ ...status, mode: "direct" }, status.ok ? 200 : 503)
})

export { app as ojsRouter }
