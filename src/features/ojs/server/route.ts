import { Hono } from "hono"
import { ojsJournalsResponseSchema } from "../schemas/ojs-schema"
import { isOjsConfigured, ojsHealthCheck } from "./ojs-client"
import { syncOjsJournals } from "./sync-ojs-journals"
import { fetchFromDatabase } from "./ojs-service"
import { ssoRouter } from "./sso-route"
import { ojsCache, CACHE_TTL } from "./ojs-cache"
import { provisionRouter } from "./provision-route"
import { prisma } from "@/src/lib/db/config"

// Window during which a fresh sync request will be rejected. Covers both
// "another sync is in flight" and "a sync just finished" — Google/cron
// retries shouldn't hammer OJS.
const SYNC_LOCK_KEY = "ojs_sync_lock"
const SYNC_LOCK_WINDOW_MS = 5 * 60 * 1000

function readLockTimestamp(value: unknown): number | null {
    if (typeof value === "string") {
        const t = Date.parse(value)
        return Number.isNaN(t) ? null : t
    }
    return null
}

const app = new Hono()

// GET /ojs/journals
app.get("/journals", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json({ success: true, data: [], configured: false }, 200)
        }

        const start = Date.now()

        if (ojsCache.journals.data && Date.now() < ojsCache.journals.expiresAt) {
            return c.json({ ...ojsCache.journals.data, latencyMs: Date.now() - start }, 200)
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
        ojsCache.journals = {
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
        // Acquire the lock atomically. Use raw SQL to ensure the check-and-set
        // is not subject to TOCTOU races.
        const now = new Date().toISOString()
        const lockWindowSec = Math.floor(SYNC_LOCK_WINDOW_MS / 1000)

        await prisma.$executeRaw`
          INSERT INTO system_settings (setting_key, setting_value, description)
          VALUES (${SYNC_LOCK_KEY}, ${now}, 'OJS sync lock — ISO timestamp of last attempt')
          ON DUPLICATE KEY UPDATE
            setting_value = CASE
              WHEN UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(setting_value) >= ${lockWindowSec}
              THEN ${now}
              ELSE setting_value
            END
        `

        // If the lock value wasn't updated to the current timestamp, another
        // sync holds the lock (value is recent).
        const lockCheck = await prisma.systemSetting.findUnique({
            where: { setting_key: SYNC_LOCK_KEY },
            select: { setting_value: true },
        })
        const currentLockValue = lockCheck ? (lockCheck.setting_value as string | null) : null
        if (currentLockValue !== now) {
            return c.json(
                { success: false, error: "Sync already in progress or recently completed" },
                429
            )
        }

        const start = Date.now()
        // Sync everything, including disabled journals, so they get marked inactive
        const journals = await fetchFromDatabase(true)
        const syncResult = await syncOjsJournals(journals)

        const success = syncResult.errors === 0
        const status = success ? 200 : 207

        return c.json({
            success,
            ...syncResult,
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

// Mount Provisioning router
app.route("/register", provisionRouter)

export { app as ojsRouter }

