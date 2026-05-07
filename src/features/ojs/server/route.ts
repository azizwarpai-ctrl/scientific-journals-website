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
        // Reject if a sync is in flight or completed within the last
        // SYNC_LOCK_WINDOW_MS. The lock row is stored in `system_settings`.
        const existingLock = await prisma.systemSetting.findUnique({
            where: { setting_key: SYNC_LOCK_KEY },
            select: { setting_value: true },
        })
        const lockedAt = existingLock ? readLockTimestamp(existingLock.setting_value) : null
        if (lockedAt !== null && Date.now() - lockedAt < SYNC_LOCK_WINDOW_MS) {
            return c.json(
                { success: false, error: "Sync already in progress or recently completed" },
                429
            )
        }

        // Take the lock by stamping the row with the current time. We leave
        // the timestamp in place after the sync (success or failure) so a
        // retry within the window still gets 429; the lock self-expires once
        // the window elapses.
        const now = new Date().toISOString()
        await prisma.systemSetting.upsert({
            where: { setting_key: SYNC_LOCK_KEY },
            create: {
                setting_key: SYNC_LOCK_KEY,
                setting_value: now,
                description: "OJS sync lock — ISO timestamp of last attempt",
            },
            update: { setting_value: now },
        })

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

// Mount Provisioning router
app.route("/register", provisionRouter)

export { app as ojsRouter }

