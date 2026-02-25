import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mock all external dependencies BEFORE importing routes
// ════════════════════════════════════════

// Mock session state
let mockSession: any = null

vi.mock('@/lib/db/auth', () => ({
    getSession: vi.fn(() => mockSession),
    createSession: vi.fn(),
    destroySession: vi.fn(),
}))

vi.mock('@/lib/db/config', () => ({
    prisma: {
        journal: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
        },
        message: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
        },
        fAQ: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
        },
    },
}))

// Now import route modules
import { journalRouter } from '@/src/features/journals/server'
import { messageRouter } from '@/src/features/messages/server'
import { solutionRouter } from '@/src/features/solutions/server'
import { prisma } from '@/lib/db/config'

// Helper to create Hono test app
function createApp() {
    const app = new Hono()
    app.route('/journals', journalRouter)
    app.route('/messages', messageRouter)
    app.route('/solutions', solutionRouter)
    return app
}

describe('API Integration Tests', () => {
    let app: ReturnType<typeof createApp>

    beforeEach(() => {
        vi.clearAllMocks()
        mockSession = null
        app = createApp()
    })

    // ═══════════════════════════════════════
    // JOURNALS
    // ═══════════════════════════════════════
    describe('Journals API', () => {
        describe('GET /journals', () => {
            it('should return paginated journals (public)', async () => {
                const mockJournals = [
                    { id: BigInt(1), title: 'Test Journal', field: 'CS', status: 'active', created_at: new Date() },
                ]
                vi.mocked(prisma.journal.findMany).mockResolvedValue(mockJournals as any)
                vi.mocked(prisma.journal.count).mockResolvedValue(1)

                const res = await app.request('/journals')
                expect(res.status).toBe(200)

                const body = await res.json()
                expect(body.success).toBe(true)
                expect(body.data).toBeDefined()
                expect(body.pagination).toBeDefined()
                expect(body.pagination.total).toBe(1)
            })

            it('should respect pagination parameters', async () => {
                vi.mocked(prisma.journal.findMany).mockResolvedValue([])
                vi.mocked(prisma.journal.count).mockResolvedValue(0)

                await app.request('/journals?page=2&limit=5')

                expect(prisma.journal.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        take: 5,
                        skip: 5,
                    })
                )
            })
        })

        describe('GET /journals/:id', () => {
            it('should return 404 for non-existent journal', async () => {
                vi.mocked(prisma.journal.findUnique).mockResolvedValue(null)

                const res = await app.request('/journals/999')
                expect(res.status).toBe(404)
            })

            it('should return journal by ID', async () => {
                const mockJournal = {
                    id: BigInt(1), title: 'Test', field: 'CS', status: 'active',
                    created_at: new Date(), updated_at: new Date(), created_by: BigInt(1),
                }
                vi.mocked(prisma.journal.findUnique).mockResolvedValue(mockJournal as any)

                const res = await app.request('/journals/1')
                expect(res.status).toBe(200)

                const body = await res.json()
                expect(body.success).toBe(true)
                expect(body.data.id).toBe('1')
            })

            it('should reject non-numeric ID', async () => {
                const res = await app.request('/journals/abc')
                expect(res.status).toBe(400)
            })
        })

        describe('POST /journals', () => {
            it('should reject unauthenticated requests', async () => {
                mockSession = null

                const res = await app.request('/journals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Journal', field: 'CS' }),
                })
                expect(res.status).toBe(401)
            })

            it('should reject non-admin users', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }

                const res = await app.request('/journals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Journal', field: 'CS' }),
                })
                expect(res.status).toBe(403)
            })

            it('should create journal for admin users', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }
                const mockJournal = {
                    id: BigInt(1), title: 'New Journal', field: 'CS',
                    status: 'active', created_at: new Date(), created_by: BigInt(1),
                }
                vi.mocked(prisma.journal.create).mockResolvedValue(mockJournal as any)

                const res = await app.request('/journals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Journal', field: 'CS' }),
                })
                expect(res.status).toBe(201)

                const body = await res.json()
                expect(body.success).toBe(true)
            })

            it('should reject invalid data', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }

                const res = await app.request('/journals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: '' }),
                })
                expect(res.status).toBe(400)
            })
        })

        describe('DELETE /journals/:id', () => {
            it('should reject unauthenticated delete', async () => {
                mockSession = null

                const res = await app.request('/journals/1', { method: 'DELETE' })
                expect(res.status).toBe(401)
            })

            it('should reject non-admin delete', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }

                const res = await app.request('/journals/1', { method: 'DELETE' })
                expect(res.status).toBe(403)
            })

            it('should return 404 for non-existent journal', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                vi.mocked(prisma.journal.findUnique).mockResolvedValue(null)

                const res = await app.request('/journals/999', { method: 'DELETE' })
                expect(res.status).toBe(404)
            })

            it('should delete existing journal as admin', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                vi.mocked(prisma.journal.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
                vi.mocked(prisma.journal.delete).mockResolvedValue({} as any)

                const res = await app.request('/journals/1', { method: 'DELETE' })
                expect(res.status).toBe(200)
            })
        })
    })

    // ═══════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════
    describe('Messages API', () => {
        describe('GET /messages', () => {
            it('should reject unauthenticated requests', async () => {
                mockSession = null
                const res = await app.request('/messages')
                expect(res.status).toBe(401)
            })

            it('should reject non-admin users', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }
                const res = await app.request('/messages')
                expect(res.status).toBe(403)
            })

            it('should return messages for admin', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                vi.mocked(prisma.message.findMany).mockResolvedValue([])
                vi.mocked(prisma.message.count).mockResolvedValue(0)

                const res = await app.request('/messages')
                expect(res.status).toBe(200)

                const body = await res.json()
                expect(body.success).toBe(true)
                expect(body.pagination).toBeDefined()
            })
        })

        describe('POST /messages', () => {
            it('should allow public message submission', async () => {
                const mockMessage = {
                    id: BigInt(1), name: 'Test', email: 'test@test.com',
                    subject: 'Hello', message: 'World', message_type: 'general',
                    status: 'unread', created_at: new Date(),
                }
                vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any)

                const res = await app.request('/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test User',
                        email: 'test@example.com',
                        subject: 'Test Subject',
                        message: 'Test message content',
                    }),
                })
                expect(res.status).toBe(201)
            })

            it('should reject invalid email in message', async () => {
                const res = await app.request('/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test',
                        email: 'invalid',
                        subject: 'Test',
                        message: 'Content',
                    }),
                })
                expect(res.status).toBe(400)
            })

            it('should reject missing required fields', async () => {
                const res = await app.request('/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Test' }),
                })
                expect(res.status).toBe(400)
            })
        })

        describe('DELETE /messages/:id', () => {
            it('should reject non-admin delete', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }
                const res = await app.request('/messages/1', { method: 'DELETE' })
                expect(res.status).toBe(403)
            })
        })
    })

    // ═══════════════════════════════════════
    // SOLUTIONS
    // ═══════════════════════════════════════
    describe('Solutions API', () => {
        describe('GET /solutions', () => {
            it('should return only published solutions for unauthenticated users', async () => {
                mockSession = null
                vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
                vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

                const res = await app.request('/solutions')
                expect(res.status).toBe(200)

                // Check that findMany was called with is_published filter
                expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: { is_published: true },
                    })
                )
            })

            it('should return all solutions for admin', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
                vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

                await app.request('/solutions')

                expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: {},
                    })
                )
            })
        })

        describe('POST /solutions', () => {
            it('should reject unauthenticated creation', async () => {
                mockSession = null

                const res = await app.request('/solutions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: 'How do I submit?',
                        answer: 'Follow the steps on the portal.',
                    }),
                })
                expect(res.status).toBe(401)
            })

            it('should reject non-admin creation', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }

                const res = await app.request('/solutions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: 'How do I submit?',
                        answer: 'Follow the steps.',
                    }),
                })
                expect(res.status).toBe(403)
            })

            it('should create solution as admin', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                const mockSolution = {
                    id: BigInt(1), question: 'Q?', answer: 'A.',
                    category: 'general', is_published: false,
                    created_at: new Date(), updated_at: new Date(),
                }
                vi.mocked(prisma.fAQ.create).mockResolvedValue(mockSolution as any)

                const res = await app.request('/solutions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: 'How do I submit?',
                        answer: 'Follow the steps.',
                    }),
                })
                expect(res.status).toBe(201)
            })
        })

        describe('DELETE /solutions/:id', () => {
            it('should reject non-admin delete', async () => {
                mockSession = { id: '1', email: 'author@test.com', role: 'author' }
                const res = await app.request('/solutions/1', { method: 'DELETE' })
                expect(res.status).toBe(403)
            })

            it('should delete as admin', async () => {
                mockSession = { id: '1', email: 'admin@test.com', role: 'admin' }
                vi.mocked(prisma.fAQ.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
                vi.mocked(prisma.fAQ.delete).mockResolvedValue({} as any)

                const res = await app.request('/solutions/1', { method: 'DELETE' })
                expect(res.status).toBe(200)
            })
        })
    })
})
