import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// ── Mock session ────────────────────────────────────────────────────────────
let mockSession: { id: bigint; email: string; role: string } | null = null

vi.mock("@/src/lib/db/auth", () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

// ── Mock Prisma ─────────────────────────────────────────────────────────────
// The /summary route now reads only journal count/fields + userEvent counts +
// a DB health probe locally; submission/review/published figures come from the
// OJS stats service (mocked below).
const prismaMock = {
  journal: { count: vi.fn(), findMany: vi.fn() },
  userEvent: { count: vi.fn() },
  $queryRaw: vi.fn(),
}

vi.mock("@/src/lib/db/config", () => ({ prisma: prismaMock }))

// ── Mock OJS client (health + configured probe) ─────────────────────────────
const ojsHealthCheckMock = vi.fn()
const isOjsConfiguredMock = vi.fn()
vi.mock("@/src/features/ojs/server/ojs-client", () => ({
  ojsHealthCheck: ojsHealthCheckMock,
  isOjsConfigured: isOjsConfiguredMock,
}))

// ── Mock OJS stats service (its internals are unit-tested separately) ────────
const getOjsPlatformStatsMock = vi.fn()
const getSnapshotAggregatesMock = vi.fn()
const getOjsSubmissionCountsByJournalMock = vi.fn()
const getOjsLast7StatsMock = vi.fn()
vi.mock("@/src/features/ojs/server/ojs-stats-service", () => ({
  getOjsPlatformStats: getOjsPlatformStatsMock,
  getSnapshotAggregates: getSnapshotAggregatesMock,
  getOjsSubmissionCountsByJournal: getOjsSubmissionCountsByJournalMock,
  getOjsLast7Stats: getOjsLast7StatsMock,
}))

// Routes import only AFTER mocks
const { adminAnalyticsRouter } = await import("@/src/features/admin-analytics/server")

function buildApp() {
  return new Hono().route("/admin-analytics", adminAnalyticsRouter)
}

/** Default local reads so each test only overrides what it cares about. */
function primeLocalDefaults() {
  prismaMock.journal.count.mockResolvedValue(0)
  prismaMock.journal.findMany.mockResolvedValue([])
  prismaMock.userEvent.count.mockResolvedValue(0)
  prismaMock.$queryRaw.mockResolvedValue([{ "1": 1 }])
  getSnapshotAggregatesMock.mockResolvedValue({
    publishedArticles: 0,
    viewsTotal: 0,
    downloadsTotal: 0,
    journalsWithSnapshots: 0,
  })
}

describe("GET /admin-analytics/summary", () => {
  beforeEach(() => {
    mockSession = null
    vi.clearAllMocks()
    primeLocalDefaults()
  })

  it("returns 401 when no admin session is present", async () => {
    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    expect(res.status).toBe(401)
  })

  it("returns 403 when the session role is not admin/superadmin", async () => {
    mockSession = { id: 1n, email: "user@example.com", role: "reviewer" }
    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    expect(res.status).toBe(403)
  })

  it("returns OJS-sourced totals, last-7 counts and a health probe for an admin", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }

    prismaMock.journal.count.mockResolvedValue(3)
    prismaMock.journal.findMany.mockResolvedValue([
      { ojs_id: "10", field: "Dentistry" },
      { ojs_id: "2", field: "Medicine" },
      { ojs_id: null, field: "Ignored" },
    ])
    // UserEvent.count is called four times; key on the `where` (event type +
    // whether it is windowed) so the assertions survive Promise.all reordering.
    prismaMock.userEvent.count.mockImplementation((args?: { where?: { event_type?: string; created_at?: unknown } }) => {
      const where = args?.where ?? {}
      const windowed = where.created_at !== undefined
      if (where.event_type === "view") return Promise.resolve(windowed ? 7 : 50) // views 7d / all-time
      if (where.event_type === "download") return Promise.resolve(0) // no downloads ever → null empty state
      return Promise.resolve(0)
    })
    prismaMock.$queryRaw.mockResolvedValue([{ "1": 1 }])

    isOjsConfiguredMock.mockReturnValue(true)
    getOjsPlatformStatsMock.mockResolvedValue({
      totalSubmissions: 10,
      inReview: 3,
      inProduction: 0,
      published: 4,
      declined: 2,
      totalReviews: 12,
      totalAuthors: 8,
    })
    getSnapshotAggregatesMock.mockResolvedValue({
      publishedArticles: 7,
      viewsTotal: 100,
      downloadsTotal: 20,
      journalsWithSnapshots: 3,
    })
    getOjsSubmissionCountsByJournalMock.mockResolvedValue(new Map([["10", 6], ["2", 4]]))
    getOjsLast7StatsMock.mockResolvedValue({ newSubmissions: 2, completedReviews: 5, publishedArticles: 1 })
    ojsHealthCheckMock.mockResolvedValue({ ok: true, configured: true, error: null })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      success: boolean
      data: {
        totals: { journals: number; submissions: number; accepted: number; published: number; reviews: number; acceptanceRate: number }
        fieldGroups: { field: string; submissions: number }[]
        last7: { newSubmissions: number; completedReviews: number; publishedArticles: number; views: number | null; downloads: number | null }
        health: { database: { ok: boolean }; ojs: { ok: boolean; configured: boolean } }
        ojsAvailable: boolean
      }
    }
    expect(json.success).toBe(true)
    expect(json.data.ojsAvailable).toBe(true)
    expect(json.data.totals).toMatchObject({
      journals: 3,
      submissions: 10,
      accepted: 4, // inProduction(0) + published(4)
      published: 4, // live platform.published when OJS is up (snapshot is the fallback)
      reviews: 12,
    })
    expect(json.data.totals.acceptanceRate).toBeCloseTo(40, 5)
    expect(json.data.fieldGroups).toEqual([
      { field: "Dentistry", submissions: 6 },
      { field: "Medicine", submissions: 4 },
    ])
    expect(json.data.last7).toEqual({
      newSubmissions: 2,
      completedReviews: 5,
      publishedArticles: 1,
      views: 7, // real (viewEventsAny > 0)
      downloads: null, // empty state (no downloads ever)
    })
    expect(json.data.health.database.ok).toBe(true)
    expect(json.data.health.ojs).toEqual({ ok: true, configured: true, error: null })
  })

  it("marks ojsAvailable=false and does not fabricate when OJS reads throw", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }
    prismaMock.journal.count.mockResolvedValue(3)
    prismaMock.journal.findMany.mockResolvedValue([{ ojs_id: "10", field: "Dentistry" }])
    // Snapshot aggregates are a local read and survive an OJS outage.
    getSnapshotAggregatesMock.mockResolvedValue({
      publishedArticles: 9,
      viewsTotal: 100,
      downloadsTotal: 20,
      journalsWithSnapshots: 3,
    })
    isOjsConfiguredMock.mockReturnValue(true)
    getOjsPlatformStatsMock.mockRejectedValue(new Error("OJS unreachable"))
    getOjsSubmissionCountsByJournalMock.mockRejectedValue(new Error("OJS unreachable"))
    getOjsLast7StatsMock.mockRejectedValue(new Error("OJS unreachable"))
    ojsHealthCheckMock.mockResolvedValue({ ok: false, configured: true, error: "timeout" })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { ojsAvailable: boolean; totals: { submissions: number; reviews: number; published: number; acceptanceRate: number }; fieldGroups: unknown[] } }
    expect(json.data.ojsAvailable).toBe(false)
    expect(json.data.totals.submissions).toBe(0)
    expect(json.data.totals.reviews).toBe(0)
    expect(json.data.totals.acceptanceRate).toBe(0)
    // Snapshot-backed published count is preserved even though OJS failed.
    expect(json.data.totals.published).toBe(9)
    expect(json.data.fieldGroups).toEqual([])
  })

  it("reports an unhealthy database when the probe throws", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(false)
    prismaMock.$queryRaw.mockRejectedValue(new Error("connection refused"))
    ojsHealthCheckMock.mockResolvedValue({ ok: false, configured: false, error: "Settings missing (OJS_DATABASE_*)" })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    const json = (await res.json()) as { data: { health: { database: { ok: boolean; error: string | null }; ojs: { configured: boolean } } } }
    expect(json.data.health.database.ok).toBe(false)
    expect(json.data.health.database.error).toContain("connection refused")
    expect(json.data.health.ojs.configured).toBe(false)
  })

  it("returns acceptanceRate=0 when OJS is unconfigured (no NaN, no fabrication)", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }
    isOjsConfiguredMock.mockReturnValue(false)
    prismaMock.$queryRaw.mockResolvedValue([{ "1": 1 }])
    ojsHealthCheckMock.mockResolvedValue({ ok: false, configured: false, error: "Settings missing" })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    const json = (await res.json()) as { data: { ojsAvailable: boolean; totals: { acceptanceRate: number }; last7: { views: number | null; downloads: number | null } } }
    expect(json.data.ojsAvailable).toBe(false)
    expect(json.data.totals.acceptanceRate).toBe(0)
    expect(json.data.last7.views).toBeNull()
    expect(json.data.last7.downloads).toBeNull()
  })
})
