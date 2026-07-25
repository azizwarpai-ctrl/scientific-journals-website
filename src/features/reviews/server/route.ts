import { Hono, type Context } from "hono"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { paginatedResponse, parsePagination } from "@/src/lib/pagination"
import {
    getOjsReviewOverview,
    getOjsSubmissionDetail,
    listOjsReviewers,
    listOjsSubmissions,
} from "./ojs-review-service"
import { submissionIdParamSchema } from "../schemas/review-schema"

/**
 * Arbitration panel API (Stream A) — read-only, live from the OJS database.
 *
 * Envelope rules (spec FR-010):
 *   - OJS not configured  → 200 { success: true, configured: false, data: null|[] }
 *   - OJS query failure   → 503 { success: false, error: "OJS_UNAVAILABLE" }
 * All endpoints are admin-only (requireAdmin).
 */

const app = new Hono()

function parseOptionalInt(value: string | undefined): number | undefined {
    if (value === undefined || value === "") return undefined
    const n = Number(value)
    return Number.isInteger(n) ? n : undefined
}

function ojsUnavailable(c: Context, error: unknown, label: string) {
    console.error(`[reviews] ${label} failed:`, error)
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

app.get("/submissions", requireAdmin, async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: [] }, 200)
    }
    const params = parsePagination(c)
    try {
        const { rows, total } = await listOjsSubmissions({
            page: params.page,
            limit: params.limit,
            journalId: parseOptionalInt(c.req.query("journalId")),
            stageId: parseOptionalInt(c.req.query("stageId")),
            status: parseOptionalInt(c.req.query("status")),
            search: c.req.query("search"),
        })
        return c.json({ ...paginatedResponse(rows, total, params), configured: true }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "submissions list")
    }
})

app.get("/submissions/:id", requireAdmin, async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: null }, 200)
    }
    const parsed = submissionIdParamSchema.safeParse(c.req.param("id"))
    if (!parsed.success) {
        return c.json({ success: false, error: "Invalid submission id" }, 400)
    }
    try {
        const detail = await getOjsSubmissionDetail(parsed.data)
        if (!detail) {
            return c.json({ success: false, error: "Not found" }, 404)
        }
        return c.json({ success: true, configured: true, data: detail }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "submission detail")
    }
})

app.get("/reviewers", requireAdmin, async (c) => {
    if (!isOjsConfigured()) {
        return c.json({ success: true, configured: false, data: [] }, 200)
    }
    const params = parsePagination(c)
    try {
        const { rows, total } = await listOjsReviewers({
            page: params.page,
            limit: params.limit,
            search: c.req.query("search"),
        })
        return c.json({ ...paginatedResponse(rows, total, params), configured: true }, 200)
    } catch (error) {
        return ojsUnavailable(c, error, "reviewers list")
    }
})

export { app as reviewsRouter }
