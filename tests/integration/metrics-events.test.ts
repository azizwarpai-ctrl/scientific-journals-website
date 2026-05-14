import { describe, it, expect, beforeEach, vi } from "vitest"

const hoisted = vi.hoisted(() => ({
    recordEvent: vi.fn(),
}))

vi.mock("@/src/lib/event-recorder", async () => {
    const real = await vi.importActual<typeof import("@/src/lib/event-recorder")>(
        "@/src/lib/event-recorder"
    )
    return {
        ...real,
        recordEvent: hoisted.recordEvent,
    }
})

process.env.IDENTITY_COOKIE_SECRET ||= "test-secret"
process.env.ORCID_STATE_SECRET ||= "test-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-secret"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-secret"

import { Hono } from "hono"
import { metricsEventsRouter } from "@/src/server/routes/metrics-events"

const app = new Hono().route("/", metricsEventsRouter)

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
    return app.request(`http://test${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    })
}

describe("/api/metrics/events", () => {
    beforeEach(() => {
        hoisted.recordEvent.mockReset()
        hoisted.recordEvent.mockResolvedValue({ recorded: true, deduped: false })
    })

    describe("POST /view", () => {
        it("validates body and writes through recordEvent", async () => {
            const res = await post("/view", {
                article_id: "100",
                journal_id: "7",
                source: "article_page",
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body).toEqual({ recorded: true, deduped: false })
            expect(hoisted.recordEvent).toHaveBeenCalledOnce()
            const call = hoisted.recordEvent.mock.calls[0][0]
            expect(call.eventType).toBe("view")
            expect(call.source).toBe("article_page")
        })

        it("rejects bad source", async () => {
            const res = await post("/view", {
                article_id: "100",
                journal_id: "7",
                source: "not-a-valid-source",
            })
            expect(res.status).toBe(400)
        })

        it("returns 200 with deduped:true when recorder dedupes", async () => {
            hoisted.recordEvent.mockResolvedValueOnce({ recorded: true, deduped: true })
            const res = await post("/view", {
                article_id: "100",
                journal_id: "7",
                source: "article_page",
            })
            const body = await res.json()
            expect(body.deduped).toBe(true)
        })
    })

    describe("POST /download", () => {
        it("requires galley_id", async () => {
            const res = await post("/download", { article_id: "100", journal_id: "7" })
            expect(res.status).toBe(400)
        })

        it("writes via recorder when valid", async () => {
            const res = await post("/download", {
                article_id: "100",
                journal_id: "7",
                galley_id: "42",
            })
            expect(res.status).toBe(200)
            const call = hoisted.recordEvent.mock.calls[0][0]
            expect(call.eventType).toBe("download")
            expect(call.galleyId).toBe(42n)
        })
    })

    describe("POST /citation", () => {
        it("accepts both copy and export actions", async () => {
            const res1 = await post("/citation", {
                article_id: "100",
                journal_id: "7",
                format: "vancouver",
                action: "copy",
            })
            const res2 = await post("/citation", {
                article_id: "100",
                journal_id: "7",
                format: "ris",
                action: "export",
            })
            expect(res1.status).toBe(200)
            expect(res2.status).toBe(200)
            expect(hoisted.recordEvent).toHaveBeenCalledTimes(2)
            const call1 = hoisted.recordEvent.mock.calls[0][0]
            expect(call1.eventType).toBe("citation_export")
            expect(call1.citationFormat).toBe("vancouver")
            expect(call1.source).toBe("copy")
        })

        it("rejects unknown format", async () => {
            const res = await post("/citation", {
                article_id: "100",
                journal_id: "7",
                format: "made-up-format",
                action: "copy",
            })
            expect(res.status).toBe(400)
        })
    })

    describe("rate limiting", () => {
        it("returns 429 once the burst window is exceeded", async () => {
            // The default limiter is 60/min/IP — fire 65 from the same fake IP.
            const headers = { "x-forwarded-for": "10.10.10.10" }
            let last: Response | null = null
            for (let i = 0; i < 65; i++) {
                last = await post(
                    "/view",
                    { article_id: "100", journal_id: "7", source: "article_page" },
                    headers
                )
            }
            expect(last!.status).toBe(429)
            expect(last!.headers.get("Retry-After")).toBeTruthy()
        })
    })
})
