import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import type { OjsJournal } from "../schemas/ojs-schema"
import { mapOjsJournalRow } from "./ojs-mappers"
import { ojsQuery, isOjsConfigured, ojsHealthCheck } from "./ojs-client"
import { syncOjsJournals } from "./sync-ojs-journals"
import { fetchFromDatabase } from "./ojs-service"
import { ssoRouter } from "./sso-route"

const app = new Hono()

// ─── Simple In-Memory Cache (5 minutes TTL) ─────────────────────────
const CACHE_TTL = 5 * 60 * 1000
const cache = {
    journals: { data: null as any, expiresAt: 0 },
    stats: { data: null as any, expiresAt: 0 }
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

// GET /ojs/sync — Cron-triggered synchronization endpoint
// Protected by Authorization: Bearer <CRON_SECRET> header
app.get("/sync", async (c) => {
    const authHeader = c.req.header("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || token !== cronSecret) {
        return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    if (!isOjsConfigured()) {
        return c.json({ success: false, error: "OJS not configured" }, 503)
    }

    try {
        const start = Date.now()
        // Sync everything, including disabled journals, so they get marked inactive
        const journals = await fetchFromDatabase(true)
        const result = await syncOjsJournals(journals)
        
        const success = result.errors === 0
        const status = success ? 200 : 207

        return c.json({
            success,
            ...result,
            latencyMs: Date.now() - start,
        }, status)
    } catch (error) {
        console.error("[OJS_SYNC] Cron sync failed:", error)
        return c.json({ success: false, error: "Sync failed" }, 500)
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

// Mount SSO router
app.route("/sso", ssoRouter)

export { app as ojsRouter }

