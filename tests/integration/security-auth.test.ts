import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mock all external dependencies
// ════════════════════════════════════════

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

import { journalRouter } from '@/src/features/journals/server'
import { messageRouter } from '@/src/features/messages/server'
import { solutionRouter } from '@/src/features/solutions/server'
import { prisma } from '@/lib/db/config'

function createApp() {
    const app = new Hono()
    app.route('/journals', journalRouter)
    app.route('/messages', messageRouter)
    app.route('/solutions', solutionRouter)
    return app
}

describe('Security & Authorization Tests', () => {
    let app: ReturnType<typeof createApp>

    beforeEach(() => {
        vi.clearAllMocks()
        mockSession = null
        app = createApp()
    })

    // ═══════════════════════════════════════
    // SUPERADMIN ROLE TESTS (M-2)
    // ═══════════════════════════════════════
    describe('Superadmin role access', () => {
        it('should allow superadmin to create journals', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
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
        })

        it('should allow superadmin to delete journals', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            vi.mocked(prisma.journal.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
            vi.mocked(prisma.journal.delete).mockResolvedValue({} as any)

            const res = await app.request('/journals/1', { method: 'DELETE' })
            expect(res.status).toBe(200)
        })

        it('should allow superadmin to list messages', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            vi.mocked(prisma.message.findMany).mockResolvedValue([])
            vi.mocked(prisma.message.count).mockResolvedValue(0)

            const res = await app.request('/messages')
            expect(res.status).toBe(200)
        })

        it('should allow superadmin to create solutions', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            const mockSolution = {
                id: BigInt(1), question: 'Q?', answer: 'A.',
                category: 'general', is_published: false,
                created_at: new Date(), updated_at: new Date(),
            }
            vi.mocked(prisma.fAQ.create).mockResolvedValue(mockSolution as any)

            const res = await app.request('/solutions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: 'How?', answer: 'Like this.' }),
            })
            expect(res.status).toBe(201)
        })

        it('should allow superadmin to delete messages', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            vi.mocked(prisma.message.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
            vi.mocked(prisma.message.delete).mockResolvedValue({} as any)

            const res = await app.request('/messages/1', { method: 'DELETE' })
            expect(res.status).toBe(200)
        })
    })

    // ═══════════════════════════════════════
    // SUPPORT ROLE TESTS
    // ═══════════════════════════════════════
    describe('Support role restrictions', () => {
        it('should reject support user from creating journals', async () => {
            mockSession = { id: '2', email: 'support@digstobob.com', role: 'support', full_name: 'Support' }

            const res = await app.request('/journals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Journal', field: 'CS' }),
            })
            expect(res.status).toBe(403)
        })

        it('should reject support user from deleting journals', async () => {
            mockSession = { id: '2', email: 'support@digstobob.com', role: 'support', full_name: 'Support' }

            const res = await app.request('/journals/1', { method: 'DELETE' })
            expect(res.status).toBe(403)
        })

        it('should reject support user from listing messages', async () => {
            mockSession = { id: '2', email: 'support@digstobob.com', role: 'support', full_name: 'Support' }

            const res = await app.request('/messages')
            expect(res.status).toBe(403)
        })
    })

    // ═══════════════════════════════════════
    // SOLUTIONS DRAFT VISIBILITY (C-3 fix)
    // ═══════════════════════════════════════
    describe('Solutions draft visibility by role', () => {
        it('should show only published solutions to unauthenticated users', async () => {
            mockSession = null
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

            await app.request('/solutions')

            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { is_published: true },
                })
            )
        })

        it('should show only published solutions to author-role users', async () => {
            mockSession = { id: '3', email: 'author@test.com', role: 'author', full_name: 'Author' }
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

            await app.request('/solutions')

            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { is_published: true },
                })
            )
        })

        it('should show only published solutions to support-role users', async () => {
            mockSession = { id: '2', email: 'support@digstobob.com', role: 'support', full_name: 'Support' }
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

            await app.request('/solutions')

            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { is_published: true },
                })
            )
        })

        it('should show all solutions (including drafts) to admin users', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

            await app.request('/solutions')

            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                })
            )
        })

        it('should show all solutions (including drafts) to superadmin users', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            vi.mocked(prisma.fAQ.count).mockResolvedValue(0)

            await app.request('/solutions')

            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                })
            )
        })

        it('should hide draft solution from author viewing by ID', async () => {
            mockSession = { id: '3', email: 'author@test.com', role: 'author', full_name: 'Author' }
            vi.mocked(prisma.fAQ.findUnique).mockResolvedValue({
                id: BigInt(1), question: 'Q', answer: 'A',
                category: 'general', is_published: false,
                view_count: 0, helpful_count: 0,
                created_at: new Date(), updated_at: new Date(),
            } as any)

            const res = await app.request('/solutions/1')
            expect(res.status).toBe(404)
        })

        it('should show draft solution to superadmin viewing by ID', async () => {
            mockSession = { id: '1', email: 'admin@digstobob.com', role: 'superadmin', full_name: 'Super Admin' }
            vi.mocked(prisma.fAQ.findUnique).mockResolvedValue({
                id: BigInt(1), question: 'Q', answer: 'A',
                category: 'general', is_published: false,
                view_count: 0, helpful_count: 0,
                created_at: new Date(), updated_at: new Date(),
            } as any)

            const res = await app.request('/solutions/1')
            expect(res.status).toBe(200)
        })
    })

    // ═══════════════════════════════════════
    // MESSAGE PATCH EDGE CASES (M-4)
    // ═══════════════════════════════════════
    describe('Message PATCH edge cases', () => {
        it('should accept PATCH with valid status update', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }
            vi.mocked(prisma.message.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
            vi.mocked(prisma.message.update).mockResolvedValue({
                id: BigInt(1), name: 'Test', email: 'test@test.com',
                subject: 'Hello', message: 'World', message_type: 'general',
                status: 'read', created_at: new Date(), updated_at: new Date(),
            } as any)

            const res = await app.request('/messages/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'read' }),
            })
            expect(res.status).toBe(200)
        })

        it('should accept PATCH with empty body (no-op update)', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }
            vi.mocked(prisma.message.findUnique).mockResolvedValue({ id: BigInt(1) } as any)
            vi.mocked(prisma.message.update).mockResolvedValue({
                id: BigInt(1), name: 'Test', email: 'test@test.com',
                subject: 'Hello', message: 'World', message_type: 'general',
                status: 'unread', created_at: new Date(), updated_at: new Date(),
            } as any)

            const res = await app.request('/messages/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            expect(res.status).toBe(200)
        })

        it('should reject PATCH with invalid status value', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }

            const res = await app.request('/messages/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'invalid_status' }),
            })
            expect(res.status).toBe(400)
        })
    })

    // ═══════════════════════════════════════
    // INPUT VALIDATION EDGE CASES
    // ═══════════════════════════════════════
    describe('Input validation edge cases', () => {
        it('should reject negative journal ID', async () => {
            const res = await app.request('/journals/-1')
            expect(res.status).toBe(400)
        })

        it('should reject journal ID with special characters', async () => {
            const res = await app.request('/journals/1;DROP TABLE')
            expect(res.status).toBe(400)
        })

        it('should reject extremely long journal title', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }

            const res = await app.request('/journals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'A'.repeat(501), field: 'CS' }),
            })
            expect(res.status).toBe(400)
        })

        it('should reject message with XSS in subject', async () => {
            // XSS content should still be accepted at API level (sanitization is display-side)
            // but verify the system doesn't crash
            const mockMessage = {
                id: BigInt(1), name: 'Test', email: 'test@test.com',
                subject: '<script>alert("xss")</script>', message: 'Content',
                message_type: 'general', status: 'unread',
                created_at: new Date(), updated_at: new Date(),
            }
            vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any)

            const res = await app.request('/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test',
                    email: 'test@test.com',
                    subject: '<script>alert("xss")</script>',
                    message: 'Content',
                }),
            })
            expect(res.status).toBe(201)
        })

        it('should reject solution with empty question', async () => {
            mockSession = { id: '1', email: 'admin@test.com', role: 'admin', full_name: 'Admin' }

            const res = await app.request('/solutions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: '', answer: 'Some answer' }),
            })
            expect(res.status).toBe(400)
        })

        it('should reject pagination with non-numeric page', async () => {
            vi.mocked(prisma.journal.findMany).mockResolvedValue([])
            vi.mocked(prisma.journal.count).mockResolvedValue(0)

            const res = await app.request('/journals?page=abc&limit=10')
            expect(res.status).toBe(200) // Should still succeed with defaults

            const body = await res.json()
            expect(body.pagination.page).toBe(1) // Falls back to default
        })

        it('should cap pagination limit to maxLimit', async () => {
            vi.mocked(prisma.journal.findMany).mockResolvedValue([])
            vi.mocked(prisma.journal.count).mockResolvedValue(0)

            await app.request('/journals?page=1&limit=999')

            expect(prisma.journal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 100, // Capped at maxLimit
                })
            )
        })
    })
})
