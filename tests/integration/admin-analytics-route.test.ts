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
const prismaMock = {
  journal: { count: vi.fn(), findMany: vi.fn() },
  submission: { count: vi.fn() },
  publishedArticle: { count: vi.fn() },
  review: { count: vi.fn() },
  userEvent: { count: vi.fn() },
  $queryRaw: vi.fn(),
}

vi.mock("@/src/lib/db/config", () => ({ prisma: prismaMock }))

// ── Mock OJS health check ───────────────────────────────────────────────────
const ojsHealthCheckMock = vi.fn()
vi.mock("@/src/features/ojs/server/ojs-client", () => ({
  ojsHealthCheck: ojsHealthCheckMock,
}))

// Routes import only AFTER mocks
const { adminAnalyticsRouter } = await import("@/src/features/admin-analytics/server")

function buildApp() {
  return new Hono().route("/admin-analytics", adminAnalyticsRouter)
}

describe("GET /admin-analytics/summary", () => {
  beforeEach(() => {
    mockSession = null
    vi.clearAllMocks()
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

  it("returns real totals, last-7 counts and a health probe for an admin", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }

    prismaMock.journal.count.mockResolvedValue(3)
    prismaMock.submission.count
      .mockResolvedValueOnce(10) // total submissions
      .mockResolvedValueOnce(4) // accepted
      .mockResolvedValueOnce(2) // new submissions 7d
    prismaMock.publishedArticle.count
      .mockResolvedValueOnce(7) // total published
      .mockResolvedValueOnce(1) // published 7d
    prismaMock.review.count
      .mockResolvedValueOnce(12) // total reviews
      .mockResolvedValueOnce(5) // completed reviews 7d
    prismaMock.journal.findMany.mockResolvedValue([
      { field: "Dentistry", _count: { submissions: 6 } },
      { field: "Medicine", _count: { submissions: 4 } },
      { field: null, _count: { submissions: 1 } },
    ])
    // UserEvent.count is called four times: views any, views 7d, downloads any, downloads 7d.
    prismaMock.userEvent.count
      .mockResolvedValueOnce(50)  // viewEventsAny
      .mockResolvedValueOnce(7)   // views 7d
      .mockResolvedValueOnce(0)   // downloadEventsAny → null empty state
      .mockResolvedValueOnce(0)   // downloads 7d
    prismaMock.$queryRaw.mockResolvedValue([{ "1": 1 }])
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
      }
    }
    expect(json.success).toBe(true)
    expect(json.data.totals).toMatchObject({
      journals: 3,
      submissions: 10,
      accepted: 4,
      published: 7,
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
      views: 7,        // real (viewEventsAny > 0)
      downloads: null, // empty state (no downloads ever)
    })
    expect(json.data.health.database.ok).toBe(true)
    expect(json.data.health.ojs).toEqual({ ok: true, configured: true, error: null })
  })

  it("reports an unhealthy database when the probe throws", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }

    prismaMock.journal.count.mockResolvedValue(0)
    prismaMock.submission.count.mockResolvedValue(0)
    prismaMock.publishedArticle.count.mockResolvedValue(0)
    prismaMock.review.count.mockResolvedValue(0)
    prismaMock.journal.findMany.mockResolvedValue([])
    prismaMock.userEvent.count.mockResolvedValue(0)
    prismaMock.$queryRaw.mockRejectedValue(new Error("connection refused"))
    ojsHealthCheckMock.mockResolvedValue({ ok: false, configured: false, error: "Settings missing (OJS_DATABASE_*)" })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    const json = (await res.json()) as { data: { health: { database: { ok: boolean; error: string | null }, ojs: { configured: boolean } } } }
    expect(json.data.health.database.ok).toBe(false)
    expect(json.data.health.database.error).toContain("connection refused")
    expect(json.data.health.ojs.configured).toBe(false)
  })

  it("returns acceptanceRate=0 when there are no submissions (no NaN, no fabrication)", async () => {
    mockSession = { id: 1n, email: "admin@example.com", role: "admin" }
    prismaMock.journal.count.mockResolvedValue(0)
    prismaMock.submission.count.mockResolvedValue(0)
    prismaMock.publishedArticle.count.mockResolvedValue(0)
    prismaMock.review.count.mockResolvedValue(0)
    prismaMock.journal.findMany.mockResolvedValue([])
    prismaMock.userEvent.count.mockResolvedValue(0)
    prismaMock.$queryRaw.mockResolvedValue([{ "1": 1 }])
    ojsHealthCheckMock.mockResolvedValue({ ok: false, configured: false, error: "Settings missing" })

    const app = buildApp()
    const res = await app.request("/admin-analytics/summary")
    const json = (await res.json()) as { data: { totals: { acceptanceRate: number }; last7: { views: number | null; downloads: number | null } } }
    expect(json.data.totals.acceptanceRate).toBe(0)
    expect(json.data.last7.views).toBeNull()
    expect(json.data.last7.downloads).toBeNull()
  })
})
