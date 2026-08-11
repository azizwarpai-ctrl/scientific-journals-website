import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Unit coverage for the OJS platform-stats read service.
 *
 * `ojsQuery` and `prisma` are mocked so the tests exercise the row→DTO
 * mapping, number/bigint coercion, name assembly, and the "nothing synced"
 * short-circuit — without a live OJS or Prisma connection.
 */

const hoisted = vi.hoisted(() => ({
    ojsQuery: vi.fn(),
    journalFindMany: vi.fn(),
    snapshotAggregate: vi.fn(),
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    ojsQuery: hoisted.ojsQuery,
}))

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        journal: { findMany: hoisted.journalFindMany },
        ojsJournalSnapshot: { aggregate: hoisted.snapshotAggregate },
    },
}))

import {
    getOjsPlatformStats,
    getSnapshotAggregates,
    getOjsAuthorSummary,
    getOjsRecentSubmissions,
    getOjsSubmissionCountsByJournal,
    getOjsLast7Stats,
} from "@/src/features/ojs/server/ojs-stats-service"

const SYNCED = [{ ojs_id: "10" }, { ojs_id: "2" }, { ojs_id: null }]

beforeEach(() => {
    hoisted.ojsQuery.mockReset()
    hoisted.journalFindMany.mockReset()
    hoisted.snapshotAggregate.mockReset()
    hoisted.journalFindMany.mockResolvedValue(SYNCED)
})

describe("getOjsPlatformStats", () => {
    it("maps and coerces the single aggregate row", async () => {
        hoisted.ojsQuery.mockResolvedValue([
            {
                totalSubmissions: "100",
                inReview: 5,
                inProduction: "3",
                published: 88,
                declined: "4",
                totalReviews: "12",
                totalAuthors: 42,
            },
        ])

        const stats = await getOjsPlatformStats()
        expect(stats).toEqual({
            totalSubmissions: 100,
            inReview: 5,
            inProduction: 3,
            published: 88,
            declined: 4,
            totalReviews: 12,
            totalAuthors: 42,
        })
        // Only valid positive integer ids reach the IN() clause.
        const sql = hoisted.ojsQuery.mock.calls[0][0] as string
        expect(sql).toContain("IN (10,2)")
    })

    it("short-circuits to zeros when nothing is synced (no OJS query)", async () => {
        hoisted.journalFindMany.mockResolvedValue([])
        const stats = await getOjsPlatformStats()
        expect(stats.totalSubmissions).toBe(0)
        expect(stats.totalAuthors).toBe(0)
        expect(hoisted.ojsQuery).not.toHaveBeenCalled()
    })
})

describe("getSnapshotAggregates", () => {
    it("sums article counts and coerces bigint view/download totals", async () => {
        hoisted.snapshotAggregate.mockResolvedValue({
            _sum: { article_count: 88, views_total: 1234n, downloads_total: 567n },
            _count: 13,
        })
        const agg = await getSnapshotAggregates()
        expect(agg).toEqual({
            publishedArticles: 88,
            viewsTotal: 1234,
            downloadsTotal: 567,
            journalsWithSnapshots: 13,
        })
    })

    it("treats null sums as zero", async () => {
        hoisted.snapshotAggregate.mockResolvedValue({
            _sum: { article_count: null, views_total: null, downloads_total: null },
            _count: 0,
        })
        const agg = await getSnapshotAggregates()
        expect(agg).toEqual({
            publishedArticles: 0,
            viewsTotal: 0,
            downloadsTotal: 0,
            journalsWithSnapshots: 0,
        })
    })
})

describe("getOjsAuthorSummary", () => {
    it("assembles names, falls back to email, and ISO-formats the latest date", async () => {
        hoisted.ojsQuery.mockResolvedValue([
            { email: "a@x.org", givenName: "Ada", familyName: "Lovelace", submissions: "3", latestSubmission: "2026-01-02 10:00:00" },
            { email: "b@x.org", givenName: null, familyName: null, submissions: 1, latestSubmission: null },
        ])
        const rows = await getOjsAuthorSummary()
        // Naive DATETIME string is parsed as UTC → deterministic literal ISO.
        expect(rows[0]).toEqual({ name: "Ada Lovelace", email: "a@x.org", submissions: 3, latestSubmission: "2026-01-02T10:00:00.000Z" })
        expect(rows[1].name).toBe("b@x.org")
        expect(rows[1].latestSubmission).toBeNull()
    })

    it("returns [] when nothing is synced", async () => {
        hoisted.journalFindMany.mockResolvedValue([])
        expect(await getOjsAuthorSummary()).toEqual([])
        expect(hoisted.ojsQuery).not.toHaveBeenCalled()
    })
})

describe("getOjsRecentSubmissions", () => {
    it("builds author name and title fallbacks and clamps the limit", async () => {
        hoisted.ojsQuery.mockResolvedValue([
            { submissionId: 7, title: null, journalTitle: null, journalPath: "ijmp", authorGiven: "Grace", authorFamily: "Hopper", status: 3, dateSubmitted: "2026-02-01 00:00:00" },
        ])
        const rows = await getOjsRecentSubmissions(999)
        expect(rows[0].title).toBe("Untitled submission")
        expect(rows[0].journalTitle).toBe("ijmp")
        expect(rows[0].authorName).toBe("Grace Hopper")
        expect(rows[0].status).toBe(3)
        // 999 is out of range → clamped to default 5 in the LIMIT clause.
        const sql = hoisted.ojsQuery.mock.calls[0][0] as string
        expect(sql).toContain("LIMIT 5")
    })
})

describe("getOjsSubmissionCountsByJournal", () => {
    it("builds a jid→count map", async () => {
        hoisted.ojsQuery.mockResolvedValue([
            { jid: 10, c: "20" },
            { jid: 2, c: 5 },
        ])
        const map = await getOjsSubmissionCountsByJournal()
        expect(map.get("10")).toBe(20)
        expect(map.get("2")).toBe(5)
    })
})

describe("getOjsLast7Stats", () => {
    it("binds the UTC window boundary as YYYY-MM-DD HH:MM:SS (×3) and maps counts", async () => {
        hoisted.ojsQuery.mockResolvedValue([
            { newSubmissions: "2", completedReviews: 5, publishedArticles: "1" },
        ])
        const windowStart = new Date("2026-08-01T00:00:00.000Z")
        const stats = await getOjsLast7Stats(windowStart)

        expect(stats).toEqual({ newSubmissions: 2, completedReviews: 5, publishedArticles: 1 })
        const params = hoisted.ojsQuery.mock.calls[0][1] as string[]
        expect(params).toEqual(["2026-08-01 00:00:00", "2026-08-01 00:00:00", "2026-08-01 00:00:00"])
    })

    it("short-circuits to zeros without querying when nothing is synced", async () => {
        hoisted.journalFindMany.mockResolvedValue([])
        const stats = await getOjsLast7Stats(new Date("2026-08-01T00:00:00.000Z"))
        expect(stats).toEqual({ newSubmissions: 0, completedReviews: 0, publishedArticles: 0 })
        expect(hoisted.ojsQuery).not.toHaveBeenCalled()
    })
})
