import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

let mockSession: { id: bigint; email: string; role: string } | null = null
vi.mock("@/src/lib/db/auth", () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

const prismaMock = { journal: { findMany: vi.fn() } }
vi.mock("@/src/lib/db/config", () => ({ prisma: prismaMock }))

const isOjsConfiguredMock = vi.fn()
vi.mock("@/src/features/ojs/server/ojs-client", () => ({ isOjsConfigured: isOjsConfiguredMock }))

// Bypass the process-local response cache so each request runs its callback
// fresh — otherwise entries could leak across tests/files and return stale
// payloads keyed by (journalId, months).
vi.mock("@/src/lib/server-cache", () => ({
  getOrSetCache: (_key: string, _ttlMs: number, fn: () => unknown) => fn(),
  CACHE_HEADERS: { "Cache-Control": "no-store" },
}))

const getMonthlySeriesMock = vi.fn()
const getStatusDistributionMock = vi.fn()
const getByJournalBreakdownMock = vi.fn()
vi.mock("@/src/features/admin-analytics/server/analytics-charts", () => ({
  getMonthlySeries: getMonthlySeriesMock,
  getStatusDistribution: getStatusDistributionMock,
  getByJournalBreakdown: getByJournalBreakdownMock,
}))

const { adminAnalyticsRouter } = await import("@/src/features/admin-analytics/server")

function buildApp() {
  return new Hono().route("/admin-analytics", adminAnalyticsRouter)
}

beforeEach(() => {
  mockSession = null
  vi.clearAllMocks()
  prismaMock.journal.findMany.mockResolvedValue([{ ojs_id: "10", title: "IJMP" }, { ojs_id: null, title: "X" }])
})

describe("GET /admin-analytics/charts", () => {
  it("401 without an admin session", async () => {
    const res = await buildApp().request("/admin-analytics/charts")
    expect(res.status).toBe(401)
  })

  it("returns charts payload for an admin", async () => {
    mockSession = { id: 1n, email: "a@x.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(true)
    getMonthlySeriesMock.mockResolvedValue([{ month: "2026-03", submissions: 2, publications: 1 }])
    getStatusDistributionMock.mockResolvedValue({ inReview: 1, inProduction: 3, published: 90, declined: 2 })
    getByJournalBreakdownMock.mockResolvedValue([
      { ojsId: "10", title: "IJMP", submissions: 60, articles: 40, views: 1000, downloads: 200 },
    ])
    const res = await buildApp().request("/admin-analytics/charts?months=1")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { ojsAvailable: boolean; journals: unknown[]; monthly: unknown[]; byJournal: unknown[] } }
    expect(json.success).toBe(true)
    expect(json.data.ojsAvailable).toBe(true)
    expect(json.data.journals).toEqual([{ ojsId: "10", title: "IJMP" }]) // null ojs_id filtered out
    expect(json.data.monthly).toHaveLength(1)
    expect(json.data.byJournal).toHaveLength(1)
  })

  it("degrades to ojsAvailable:false when OJS reads throw", async () => {
    mockSession = { id: 1n, email: "a@x.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(true)
    getMonthlySeriesMock.mockRejectedValue(new Error("OJS down"))
    getStatusDistributionMock.mockRejectedValue(new Error("OJS down"))
    getByJournalBreakdownMock.mockRejectedValue(new Error("OJS down"))
    const res = await buildApp().request("/admin-analytics/charts")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { ojsAvailable: boolean; monthly: unknown[]; byJournal: unknown[] } }
    expect(json.data.ojsAvailable).toBe(false)
    expect(json.data.byJournal).toEqual([])
  })
})
