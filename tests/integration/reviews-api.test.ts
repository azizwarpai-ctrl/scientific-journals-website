import { beforeEach, describe, expect, it, vi } from "vitest"
import { Hono } from "hono"

// ── Mock admin session ──────────────────────────────────────────────────────
let mockSession: { id: bigint; email: string; role: string } | null = null

vi.mock("@/src/lib/db/auth", () => ({
    getSession: vi.fn(() => mockSession),
    createSession: vi.fn(),
    destroySession: vi.fn(),
}))

// ── Mock OJS client ─────────────────────────────────────────────────────────
const ojsQueryMock = vi.fn()
const isOjsConfiguredMock = vi.fn(() => true)

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    ojsQuery: ojsQueryMock,
    isOjsConfigured: isOjsConfiguredMock,
}))

// Router + service import only AFTER mocks
const { reviewsRouter } = await import("@/src/features/reviews/server")
const { resetReviewOverviewCache } = await import(
    "@/src/features/reviews/server/ojs-review-service"
)

function buildApp() {
    return new Hono().route("/reviews", reviewsRouter)
}

const adminSession = { id: 1n, email: "admin@example.com", role: "admin" }

const submissionRow = {
    submissionId: 42,
    title: "A study of things",
    journalId: 3,
    journalTitle: "Journal of Things",
    journalPath: "jthings",
    stageId: 3,
    status: 1,
    dateSubmitted: new Date("2026-01-01T00:00:00Z"),
    dateLastActivity: new Date("2026-02-01T00:00:00Z"),
    currentRound: 1,
    reviewsPending: 1,
    reviewsCompleted: 1,
}

beforeEach(() => {
    mockSession = null
    vi.clearAllMocks()
    isOjsConfiguredMock.mockReturnValue(true)
    resetReviewOverviewCache()
})

describe("auth guard", () => {
    it.each(["/reviews/overview", "/reviews/submissions", "/reviews/submissions/1", "/reviews/reviewers"])(
        "returns 401 for %s without a session",
        async (path) => {
            const res = await buildApp().request(path)
            expect(res.status).toBe(401)
        }
    )

    it("returns 403 for a non-admin session", async () => {
        mockSession = { id: 2n, email: "user@example.com", role: "reviewer" }
        const res = await buildApp().request("/reviews/overview")
        expect(res.status).toBe(403)
    })
})

describe("configured:false envelope", () => {
    beforeEach(() => {
        mockSession = adminSession
        isOjsConfiguredMock.mockReturnValue(false)
    })

    it("overview returns 200 with data:null and never queries OJS", async () => {
        const res = await buildApp().request("/reviews/overview")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json).toEqual({ success: true, configured: false, data: null })
        expect(ojsQueryMock).not.toHaveBeenCalled()
    })

    it("submissions returns 200 with data:[]", async () => {
        const res = await buildApp().request("/reviews/submissions")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.configured).toBe(false)
        expect(json.data).toEqual([])
    })

    it("reviewers returns 200 with data:[]", async () => {
        const res = await buildApp().request("/reviews/reviewers")
        const json = await res.json()
        expect(json.configured).toBe(false)
        expect(json.data).toEqual([])
    })
})

describe("GET /reviews/overview", () => {
    beforeEach(() => {
        mockSession = adminSession
    })

    it("returns aggregate stats DTO", async () => {
        ojsQueryMock.mockResolvedValueOnce([
            {
                submissionsInReview: 5,
                activeAssignments: 8,
                completedReviews: 20,
                overdueReviews: 2,
                avgDaysToComplete: 14.25,
            },
        ])
        const res = await buildApp().request("/reviews/overview")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.configured).toBe(true)
        expect(json.data).toEqual({
            submissionsInReview: 5,
            activeAssignments: 8,
            completedReviews: 20,
            overdueReviews: 2,
            avgDaysToComplete: 14.25,
        })
    })

    it("serves the second call from the 60s cache", async () => {
        ojsQueryMock.mockResolvedValue([
            {
                submissionsInReview: 1,
                activeAssignments: 1,
                completedReviews: 1,
                overdueReviews: 0,
                avgDaysToComplete: null,
            },
        ])
        const app = buildApp()
        await app.request("/reviews/overview")
        await app.request("/reviews/overview")
        expect(ojsQueryMock).toHaveBeenCalledTimes(1)
    })

    it("returns 503 OJS_UNAVAILABLE when the query fails", async () => {
        ojsQueryMock.mockRejectedValueOnce(new Error("connection refused"))
        const res = await buildApp().request("/reviews/overview")
        expect(res.status).toBe(503)
        const json = await res.json()
        expect(json).toEqual({ success: false, error: "OJS_UNAVAILABLE" })
    })
})

describe("GET /reviews/submissions", () => {
    beforeEach(() => {
        mockSession = adminSession
    })

    it("returns paginated submission summaries with ojsUrl", async () => {
        ojsQueryMock
            .mockResolvedValueOnce([{ total: 25 }]) // COUNT
            .mockResolvedValueOnce([submissionRow]) // rows

        const res = await buildApp().request("/reviews/submissions?page=2&limit=10")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.configured).toBe(true)
        expect(json.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
        })
        expect(json.data).toHaveLength(1)
        expect(json.data[0].submissionId).toBe(42)
        expect(json.data[0].ojsUrl).toContain("/workflow/access/42")

        // OFFSET must reflect page 2 with limit 10
        const listCall = ojsQueryMock.mock.calls[1]
        expect(listCall[1]).toEqual([10, 10])
    })

    it("passes filters into the SQL params", async () => {
        ojsQueryMock
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([])

        await buildApp().request("/reviews/submissions?journalId=3&stageId=3&status=1&search=te")
        const countCall = ojsQueryMock.mock.calls[0]
        expect(countCall[0]).toMatch(/s\.context_id = \?/)
        expect(countCall[0]).toMatch(/s\.stage_id = \?/)
        expect(countCall[0]).toMatch(/s\.status = \?/)
        expect(countCall[0]).toMatch(/submission_progress/)
        expect(countCall[1]).toEqual([3, 3, 1, "%te%"])
    })

    it("returns 503 when OJS fails", async () => {
        ojsQueryMock.mockRejectedValueOnce(new Error("timeout"))
        const res = await buildApp().request("/reviews/submissions")
        expect(res.status).toBe(503)
    })

    it.each([
        "/reviews/submissions?journalId=abc",
        "/reviews/submissions?stageId=9",
        "/reviews/submissions?status=2",
        "/reviews/submissions?page=0",
        "/reviews/submissions?limit=101",
    ])("returns 400 for invalid query (%s) without touching OJS", async (path) => {
        const res = await buildApp().request(path)
        expect(res.status).toBe(400)
        expect(ojsQueryMock).not.toHaveBeenCalled()
    })
})

describe("GET /reviews/submissions/:id", () => {
    beforeEach(() => {
        mockSession = adminSession
    })

    it("returns the detail DTO with rounds, decisions and editors", async () => {
        ojsQueryMock
            .mockResolvedValueOnce([submissionRow]) // submission
            .mockResolvedValueOnce([{ reviewRoundId: 11, round: 1, stageId: 3, status: 4 }]) // rounds
            .mockResolvedValueOnce([
                {
                    reviewId: 7,
                    reviewRoundId: 11,
                    reviewerId: 21,
                    reviewerEmail: "rev@example.com",
                    reviewerUsername: "reviewer1",
                    givenName: "Grace",
                    familyName: "Hopper",
                    affiliation: null,
                    orcid: null,
                    recommendation: 1,
                    reviewMethod: 1,
                    dateAssigned: new Date("2026-01-05T00:00:00Z"),
                    dateNotified: null,
                    dateConfirmed: null,
                    dateDue: null,
                    dateResponseDue: null,
                    dateCompleted: new Date("2026-02-20T00:00:00Z"),
                    declined: 0,
                    cancelled: 0,
                    isOverdue: 0,
                },
            ]) // assignments
            .mockResolvedValueOnce([
                {
                    editDecisionId: 3,
                    editorId: 9,
                    decision: 1,
                    reviewRoundId: 11,
                    round: 1,
                    dateDecided: new Date("2026-02-25T00:00:00Z"),
                },
            ]) // decisions
            .mockResolvedValueOnce([
                {
                    userId: 9,
                    userGroupId: 4,
                    roleId: 17,
                    dateAssigned: new Date("2026-01-02T00:00:00Z"),
                    recommendOnly: 0,
                    email: "ed@example.com",
                    username: "editor",
                    givenName: "Edsger",
                    familyName: "Dijkstra",
                },
            ]) // editors

        const res = await buildApp().request("/reviews/submissions/42")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.submissionId).toBe(42)
        expect(json.data.rounds).toHaveLength(1)
        expect(json.data.rounds[0].assignments[0].reviewer.fullName).toBe("Grace Hopper")
        expect(json.data.decisions[0].decisionLabel).toBe("Accept")
        expect(json.data.editors[0].name).toBe("Edsger Dijkstra")
    })

    it("returns 404 for a missing submission", async () => {
        ojsQueryMock.mockResolvedValueOnce([]) // no submission row
        const res = await buildApp().request("/reviews/submissions/999")
        expect(res.status).toBe(404)
        const json = await res.json()
        expect(json).toEqual({ success: false, error: "Not found" })
    })

    it("returns 400 for a non-numeric id", async () => {
        const res = await buildApp().request("/reviews/submissions/abc")
        expect(res.status).toBe(400)
    })

    it("returns 503 when OJS fails", async () => {
        ojsQueryMock.mockRejectedValueOnce(new Error("gone"))
        const res = await buildApp().request("/reviews/submissions/42")
        expect(res.status).toBe(503)
    })
})

describe("GET /reviews/reviewers", () => {
    beforeEach(() => {
        mockSession = adminSession
    })

    it("returns paginated workload DTOs", async () => {
        ojsQueryMock
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([
                {
                    reviewerId: 21,
                    email: "rev@example.com",
                    username: "reviewer1",
                    givenName: "Grace",
                    familyName: "Hopper",
                    affiliation: null,
                    orcid: null,
                    total: 10,
                    active: 2,
                    completed: 7,
                    declined: 1,
                    overdue: 1,
                    avgDaysToComplete: 12.5,
                },
            ])

        const res = await buildApp().request("/reviews/reviewers")
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.pagination.total).toBe(1)
        expect(json.data[0].reviewer.fullName).toBe("Grace Hopper")
        expect(json.data[0].avgDaysToComplete).toBe(12.5)
    })

    it("returns 503 when OJS fails", async () => {
        ojsQueryMock.mockRejectedValueOnce(new Error("down"))
        const res = await buildApp().request("/reviews/reviewers")
        expect(res.status).toBe(503)
    })

    it("returns 400 for invalid pagination without touching OJS", async () => {
        const res = await buildApp().request("/reviews/reviewers?page=-1")
        expect(res.status).toBe(400)
        expect(ojsQueryMock).not.toHaveBeenCalled()
    })
})
