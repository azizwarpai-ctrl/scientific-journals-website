import { Hono, type Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { paginatedResponse, parsePagination } from "@/src/lib/pagination"
import {
    getOjsReviewOverview,
    getOjsSubmissionDetail,
    listOjsReviewers,
    listOjsSubmissions,
} from "./ojs-review-service"
import {
    reviewersListQuerySchema,
    submissionIdParamObjectSchema,
    submissionsListQuerySchema,
} from "@/src/features/reviews/schemas/review-schema"

/**
 * Arbitration panel API (Stream A) — read-only, live from the OJS database.
 *
 * Envelope rules (spec FR-010):
 *   - OJS not configured  → 200 { success: true, configured: false, data: null|[] }
 *   - OJS query failure   → 503 { success: false, error: "OJS_UNAVAILABLE" }
 * All endpoints are admin-only (requireAdmin).
 */

const app = new Hono()

function ojsUnavailable(c: Context, error: unknown, label: string) {
    // Redacted: driver errors can carry the raw SQL (error.sql) — log message only.
    const message = error instanceof Error ? error.message : "unknown error"
    console.error(`[reviews] ${label} failed: ${message}`)
    return c.json({ success: false, error: "OJS_UNAVAILABLE" }, 503)
}

app.get("/overview", requireAdmin, async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: null }, 200)
    }
    try {
        const data = await getOjsReviewOverview()
        return c.json({ success: true, configured: true, data }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "overview")
    }
})

app.get("/submissions", requireAdmin, zValidator("query", submissionsListQuerySchema), async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: [] }, 200)
    }
    const params = parsePagination(c)
    const query = c.req.valid("query")
    try {
        const { rows, total } = await listOjsSubmissions({
            page: params.page,
            limit: params.limit,
            journalId: query.journalId,
            stageId: query.stageId,
            status: query.status,
            search: query.search,
        })
        return c.json({ ...paginatedResponse(rows, total, params), configured: true }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "submissions list")
    }
})

app.get("/submissions/:id", requireAdmin, zValidator("param", submissionIdParamObjectSchema), async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: null }, 200)
    }
    const { id } = c.req.valid("param")
    try {
        const detail = await getOjsSubmissionDetail(id)
        if (!detail) {
            return c.json({ success: false, error: "Not found" }, 404)
        }
        return c.json({ success: true, configured: true, data: detail }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "submission detail")
    }
})

app.get("/reviewers", requireAdmin, zValidator("query", reviewersListQuerySchema), async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: [] }, 200)
    }
    const params = parsePagination(c)
    const query = c.req.valid("query")
    try {
        const { rows, total } = await listOjsReviewers({
            page: params.page,
            limit: params.limit,
            search: query.search,
        })
        return c.json({ ...paginatedResponse(rows, total, params), configured: true }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "reviewers list")
    }
})

export { app as reviewsRouter }
