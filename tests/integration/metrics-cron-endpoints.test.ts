import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mocks must be declared BEFORE importing the router under test
// ════════════════════════════════════════

vi.mock('@/src/lib/db/config', () => ({
    prisma: {
        journal: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    },
}))
vi.mock('@/src/features/ojs/server/ojs-client', () => ({
    ojsQuery: vi.fn(),
    isOjsConfigured: vi.fn(() => false),
}))
vi.mock('@/src/server/routes/metrics-events', () => ({
    metricsEventsRouter: new Hono(),
}))

const acquireJobLockMock = vi.fn()
vi.mock('@/src/lib/cron-lock', () => ({
    acquireJobLock: (...args: unknown[]) => acquireJobLockMock(...args),
}))

const withSyncRunMock = vi.fn(
    async (_job: string, _trigger: string, body: () => Promise<{ result: unknown }>) => {
        const outcome = await body()
        return outcome.result
    }
)
vi.mock('@/src/features/ojs/server/sync-runs', () => ({
    withSyncRun: (...args: unknown[]) => withSyncRunMock(...(args as [string, string, () => Promise<{ result: unknown }>])),
}))

const aggregateDailyMock = vi.fn()
const aggregateMonthlyMock = vi.fn()
const updateUserMetricsMock = vi.fn()
const retentionCleanupMock = vi.fn()
vi.mock('@/src/features/metrics/server/jobs', () => ({
    aggregateDailyMetrics: (...args: unknown[]) => aggregateDailyMock(...args),
    aggregateMonthlyMetrics: (...args: unknown[]) => aggregateMonthlyMock(...args),
    updateUserMetrics: (...args: unknown[]) => updateUserMetricsMock(...args),
    retentionCleanup: (...args: unknown[]) => retentionCleanupMock(...args),
}))

// Import after mocks are wired. cron-auth stays REAL (timing-safe compare
// against process.env.CRON_SECRET).
import { metricsRouter } from '@/src/features/metrics/server/route'

const SECRET = 'integration-test-cron-secret'

function createApp() {
    const app = new Hono().basePath('/api')
    app.route('/metrics', metricsRouter)
    return app
}

function authHeaders(token: string = SECRET) {
    return { Authorization: `Bearer ${token}` }
}

describe('Metrics cron endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.CRON_SECRET = SECRET
        acquireJobLockMock.mockResolvedValue(true)
        aggregateDailyMock.mockResolvedValue({ day: '2026-08-07', upserted: 3 })
        aggregateMonthlyMock.mockResolvedValue({ year: 2026, month: 7, upserted: 12 })
        updateUserMetricsMock.mockResolvedValue({ upserted: 4 })
        retentionCleanupMock.mockResolvedValue({ cutoff: '2025-02-01T00:00:00.000Z', totalDeleted: 0, completed: true })
    })

    afterEach(() => {
        delete process.env.CRON_SECRET
    })

    it('rejects requests without a bearer token (401)', async () => {
        const app = createApp()
        const res = await app.request('/api/metrics/cron/daily', { method: 'POST' })
        expect(res.status).toBe(401)
        expect(aggregateDailyMock).not.toHaveBeenCalled()
    })

    it('rejects a wrong token (401)', async () => {
        const app = createApp()
        const res = await app.request('/api/metrics/cron/daily', {
            method: 'POST',
            headers: authHeaders('nope'),
        })
        expect(res.status).toBe(401)
    })

    it('returns 429 when the job lock is held', async () => {
        acquireJobLockMock.mockResolvedValue(false)
        const app = createApp()
        const res = await app.request('/api/metrics/cron/daily', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(429)
        expect(aggregateDailyMock).not.toHaveBeenCalled()
    })

    it('runs the daily aggregation and records a ledger run (200)', async () => {
        const app = createApp()
        const res = await app.request('/api/metrics/cron/daily', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toMatchObject({ success: true, day: '2026-08-07', upserted: 3 })
        expect(withSyncRunMock).toHaveBeenCalledWith(
            'metrics_daily_aggregation',
            'http',
            expect.any(Function)
        )
    })

    it('passes the ?day override through to the job', async () => {
        const app = createApp()
        await app.request('/api/metrics/cron/daily?day=2026-01-15', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(aggregateDailyMock).toHaveBeenCalledWith('2026-01-15')
    })

    it('parses the ?month override for the monthly rollup', async () => {
        const app = createApp()
        const res = await app.request('/api/metrics/cron/monthly?month=2026-06', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        expect(aggregateMonthlyMock).toHaveBeenCalledWith({ year: 2026, month: 6 })
    })

    it('runs the user metrics job (200)', async () => {
        const app = createApp()
        const res = await app.request('/api/metrics/cron/user', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        expect(updateUserMetricsMock).toHaveBeenCalledTimes(1)
    })

    it('returns 207 when retention cleanup hits its soft deadline', async () => {
        retentionCleanupMock.mockResolvedValue({
            cutoff: '2025-02-01T00:00:00.000Z',
            totalDeleted: 100_000,
            completed: false,
        })
        const app = createApp()
        const res = await app.request('/api/metrics/cron/retention', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(207)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.completed).toBe(false)
    })

    it('returns 500 when the job throws', async () => {
        aggregateDailyMock.mockRejectedValue(new Error('boom'))
        const app = createApp()
        const res = await app.request('/api/metrics/cron/daily', {
            method: 'POST',
            headers: authHeaders(),
        })
        expect(res.status).toBe(500)
    })
})
