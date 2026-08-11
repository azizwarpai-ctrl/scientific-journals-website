import { describe, it, expect, vi, beforeEach } from "vitest"

const hoisted = vi.hoisted(() => ({
  ojsQuery: vi.fn(),
  journalFindMany: vi.fn(),
  snapshotFindMany: vi.fn(),
  submissionCounts: vi.fn(),
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({ ojsQuery: hoisted.ojsQuery }))
vi.mock("@/src/lib/db/config", () => ({
  prisma: {
    journal: { findMany: hoisted.journalFindMany },
    ojsJournalSnapshot: { findMany: hoisted.snapshotFindMany },
  },
}))
vi.mock("@/src/features/ojs/server/ojs-stats-service", () => ({
  getOjsSubmissionCountsByJournal: hoisted.submissionCounts,
}))

import {
  monthSpine,
  deriveFunnel,
  getMonthlySeries,
  getByJournalBreakdown,
} from "@/src/features/admin-analytics/server/analytics-charts"

const SYNCED = [{ ojs_id: "10" }, { ojs_id: "2" }, { ojs_id: null }]

beforeEach(() => {
  hoisted.ojsQuery.mockReset()
  hoisted.journalFindMany.mockReset().mockResolvedValue(SYNCED)
  hoisted.snapshotFindMany.mockReset()
  hoisted.submissionCounts.mockReset()
})

describe("monthSpine", () => {
  it("returns N UTC YYYY-MM labels oldest→newest ending at `end`", () => {
    expect(monthSpine(new Date("2026-03-15T00:00:00Z"), 3)).toEqual(["2026-01", "2026-02", "2026-03"])
  })
  it("crosses a year boundary", () => {
    expect(monthSpine(new Date("2026-01-10T00:00:00Z"), 3)).toEqual(["2025-11", "2025-12", "2026-01"])
  })
})

describe("deriveFunnel", () => {
  it("accepted = inProduction + published; submitted = all", () => {
    expect(deriveFunnel({ inReview: 5, inProduction: 3, published: 90, declined: 2 })).toEqual({
      submitted: 100,
      accepted: 93,
      published: 90,
    })
  })
})

describe("getMonthlySeries", () => {
  it("zero-fills missing months and coerces counts", async () => {
    // submissions query → rows; publications query → rows
    hoisted.ojsQuery
      .mockResolvedValueOnce([{ ym: "2026-02", c: "4" }, { ym: "2026-03", c: 2 }])
      .mockResolvedValueOnce([{ ym: "2026-03", c: "1" }])
    const out = await getMonthlySeries({ months: 3, now: new Date("2026-03-15T00:00:00Z") })
    expect(out).toEqual([
      { month: "2026-01", submissions: 0, publications: 0 },
      { month: "2026-02", submissions: 4, publications: 0 },
      { month: "2026-03", submissions: 2, publications: 1 },
    ])
  })
  it("short-circuits to a zeroed spine when nothing is synced", async () => {
    hoisted.journalFindMany.mockResolvedValue([])
    const out = await getMonthlySeries({ months: 2, now: new Date("2026-03-15T00:00:00Z") })
    expect(out).toEqual([
      { month: "2026-02", submissions: 0, publications: 0 },
      { month: "2026-03", submissions: 0, publications: 0 },
    ])
    expect(hoisted.ojsQuery).not.toHaveBeenCalled()
  })
})

describe("getByJournalBreakdown", () => {
  it("joins snapshot aggregates + submission counts by ojs_id", async () => {
    hoisted.snapshotFindMany.mockResolvedValue([
      { article_count: 40, views_total: 1000n, downloads_total: 200n, journal: { ojs_id: "10", title: "IJMP" } },
      { article_count: 5, views_total: 10n, downloads_total: 3n, journal: { ojs_id: "2", title: "OJBR" } },
    ])
    hoisted.submissionCounts.mockResolvedValue(new Map([["10", 60], ["2", 4]]))
    const rows = await getByJournalBreakdown()
    expect(rows).toEqual([
      { ojsId: "10", title: "IJMP", submissions: 60, articles: 40, views: 1000, downloads: 200 },
      { ojsId: "2", title: "OJBR", submissions: 4, articles: 5, views: 10, downloads: 3 },
    ])
  })
})
