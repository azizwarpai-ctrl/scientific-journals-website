import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock session state
let mockSession: any = null

vi.mock('@/src/lib/db/auth', () => ({
    getSession: vi.fn(() => mockSession),
}))

vi.mock('@/src/lib/db/config', () => ({
    prisma: {
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

import { faqRouter } from '@/src/features/faq/server'
import { prisma } from '@/src/lib/db/config'

function createApp() {
    const app = new Hono()
    app.route('/faqs', faqRouter)
    return app
}

describe('FAQ API Integration Tests', () => {
    let app: ReturnType<typeof createApp>

    beforeEach(() => {
        vi.clearAllMocks()
        mockSession = null
        app = createApp()
    })

    describe('GET /faqs', () => {
        it('should return published FAQs for public', async () => {
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            const res = await app.request('/faqs')
            expect(res.status).toBe(200)
            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { is_published: true },
                })
            )
        })

        it('should return all FAQs for admin', async () => {
            mockSession = { id: '1', role: 'admin' }
            vi.mocked(prisma.fAQ.findMany).mockResolvedValue([])
            await app.request('/faqs')
            expect(prisma.fAQ.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                })
            )
        })
    })

    describe('POST /faqs', () => {
        it('should allow admin to create FAQ', async () => {
            mockSession = { id: '1', role: 'admin' }
            const mockFAQ = { id: BigInt(1), question: 'Q', answer: 'A' }
            vi.mocked(prisma.fAQ.create).mockResolvedValue(mockFAQ as any)

            const res = await app.request('/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: 'How?', answer: 'This.' }),
            })
            expect(res.status).toBe(201)
        })

        it('should reject non-admin creation', async () => {
            mockSession = { id: '2', role: 'author' }
            const res = await app.request('/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: 'How?', answer: 'This.' }),
            })
            expect(res.status).toBe(403)
        })
    })
})
