import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { ojsQuery, isOjsConfigured, ojsHealthCheck } from "./ojs-client"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"

const app = new Hono()

// GET /ojs/journals — Fetch journals from OJS database
app.get("/journals", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json(
                { success: true, data: [], configured: false },
                200
            )
        }

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

        const journals: OjsJournal[] = rows.map((row) => ({
            journal_id: row.journal_id,
            path: row.path,
            primary_locale: row.primary_locale,
            enabled: row.enabled === 1,
            name: row.name,
            description: row.description,
        }))

        const responsePayload = { success: true as const, data: journals, configured: true as const }

        // Validate output against schema before sending
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

// GET /ojs/health — Connection health check for monitoring
app.get("/health", async (c) => {
    const status = await ojsHealthCheck()
    return c.json(status, status.ok ? 200 : 503)
})

export { app as ojsRouter }
