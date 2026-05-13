import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mocks must be declared BEFORE importing the route under test
// ════════════════════════════════════════

vi.mock('@/src/lib/db/auth', () => ({
    getSession: vi.fn(() => null),
    createSession: vi.fn(),
    destroySession: vi.fn(),
}))

vi.mock('@/src/lib/db/config', () => ({
    prisma: {
        journal: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
        },
    },
}))

// Dynamic-import targets used by the self-heal path inside route.ts.
const ojsQueryMock = vi.fn()
const isOjsConfiguredMock = vi.fn(() => true)
const fetchFromDatabaseMock = vi.fn()
const syncOjsJournalsMock = vi.fn()

vi.mock('@/src/features/ojs/server/ojs-client', () => ({
    ojsQuery: ojsQueryMock,
    isOjsConfigured: isOjsConfiguredMock,
}))
vi.mock('@/src/features/ojs/server/ojs-service', () => ({
    fetchFromDatabase: fetchFromDatabaseMock,
}))
vi.mock('@/src/features/ojs/server/sync-ojs-journals', () => ({
    syncOjsJournals: syncOjsJournalsMock,
}))

// Import after mocks are wired.
import { journalRouter, __resetOjsDriftCheckStateForTests } from '@/src/features/journals/server/route'
import { prisma } from '@/src/lib/db/config'

function createApp() {
    const app = new Hono().basePath('/api')
    app.route('/journals', journalRouter)
    return app
}

/** Flush microtasks + a macrotask so fire-and-forget work inside `void (async () => ...)()`
 *  — including dynamic `import()` resolution — has time to settle.
 */
async function flushAsync(): Promise<void> {
    // A short real timer reliably drains all pending dynamic-import microtasks
    // in Vitest, even on cold first-call where the module loader is warming up.
    await new Promise((resolve) => setTimeout(resolve, 30))
    for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setImmediate(resolve))
    }
}

describe('Journals listing — OJS drift self-heal', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        __resetOjsDriftCheckStateForTests()
        // Disable throttling by default so each test starts in a clean state.
        process.env.OJS_DRIFT_CHECK_INTERVAL_MS = '0'
        isOjsConfiguredMock.mockReturnValue(true)
        fetchFromDatabaseMock.mockResolvedValue([])
        syncOjsJournalsMock.mockResolvedValue({ synced: 0, errors: 0 })
    })

    afterEach(() => {
        delete process.env.OJS_DRIFT_CHECK_INTERVAL_MS
    })

    it('schedules a background sync when OJS has more journals than Prisma', async () => {
        vi.mocked(prisma.journal.findMany).mockResolvedValue([
            { id: BigInt(1), title: 'jod', field: 'X', status: 'active', created_at: new Date() } as any,
        ])
        vi.mocked(prisma.journal.count).mockResolvedValue(11)
        ojsQueryMock.mockResolvedValue([{ c: 12 }])

        const app = createApp()
        const res = await app.request('/api/journals')

        expect(res.status).toBe(200)
        await flushAsync()

        expect(ojsQueryMock).toHaveBeenCalledTimes(1)
        expect(ojsQueryMock.mock.calls[0][0]).toMatch(/COUNT\(\*\)/i)
        expect(fetchFromDatabaseMock).toHaveBeenCalledTimes(1)
        expect(syncOjsJournalsMock).toHaveBeenCalledTimes(1)
    })

    it('does not trigger a sync when OJS count equals Prisma count', async () => {
        vi.mocked(prisma.journal.findMany).mockResolvedValue([
            { id: BigInt(1), title: 'jod', field: 'X', status: 'active', created_at: new Date() } as any,
        ])
        vi.mocked(prisma.journal.count).mockResolvedValue(11)
        ojsQueryMock.mockResolvedValue([{ c: 11 }])

        const app = createApp()
        const res = await app.request('/api/journals')

        expect(res.status).toBe(200)
        await flushAsync()

        expect(ojsQueryMock).toHaveBeenCalledTimes(1)
        expect(fetchFromDatabaseMock).not.toHaveBeenCalled()
        expect(syncOjsJournalsMock).not.toHaveBeenCalled()
    })

    it('does not trigger a sync when OJS is not configured', async () => {
        vi.mocked(prisma.journal.findMany).mockResolvedValue([])
        vi.mocked(prisma.journal.count).mockResolvedValue(5)
        isOjsConfiguredMock.mockReturnValue(false)

        const app = createApp()
        const res = await app.request('/api/journals')

        expect(res.status).toBe(200)
        await flushAsync()

        expect(ojsQueryMock).not.toHaveBeenCalled()
        expect(syncOjsJournalsMock).not.toHaveBeenCalled()
    })

    it('respects the throttle window: two requests within TTL trigger only one drift check', async () => {
        vi.mocked(prisma.journal.findMany).mockResolvedValue([])
        vi.mocked(prisma.journal.count).mockResolvedValue(11)
        ojsQueryMock.mockResolvedValue([{ c: 11 }])

        // Re-enable throttling for this test only.
        process.env.OJS_DRIFT_CHECK_INTERVAL_MS = '60000'
        __resetOjsDriftCheckStateForTests()

        const app = createApp()
        await app.request('/api/journals')
        await flushAsync()
        await app.request('/api/journals')
        await flushAsync()

        // Second request is inside the throttle window → drift check skipped.
        expect(ojsQueryMock).toHaveBeenCalledTimes(1)
    })

    it('listing response is returned before the background sync resolves', async () => {
        vi.mocked(prisma.journal.findMany).mockResolvedValue([])
        vi.mocked(prisma.journal.count).mockResolvedValue(11)
        ojsQueryMock.mockResolvedValue([{ c: 12 }])

        // Make sync hang so we can prove it doesn't gate the response.
        let resolveSync: (v: { synced: number; errors: number }) => void = () => {}
        const pendingSync = new Promise<{ synced: number; errors: number }>((resolve) => {
            resolveSync = resolve
        })
        syncOjsJournalsMock.mockReturnValue(pendingSync)

        const app = createApp()
        const res = await app.request('/api/journals')

        // Response is already 200 — the long-running sync has not been awaited.
        expect(res.status).toBe(200)

        // Now let the background sync finish so the test doesn't leak.
        resolveSync({ synced: 1, errors: 0 })
        await flushAsync()
    })
})
