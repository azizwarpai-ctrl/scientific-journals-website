import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mock external dependencies BEFORE imports
// ════════════════════════════════════════

vi.mock('@/src/features/ojs/server/ojs-user-service', () => ({
    provisionOjsUser: vi.fn(),
}))

vi.mock('@/src/lib/email/event-dispatcher', () => ({
    dispatchEmailEvent: vi.fn(),
}))

import { provisionRouter } from '@/src/features/ojs/server/provision-route'
import { provisionOjsUser } from '@/src/features/ojs/server/ojs-user-service'

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════


function createApp() {
    const app = new Hono()
    app.route('/ojs', provisionRouter)
    return app
}

const validPayload = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@university.edu',
    password: 'securePass123',
    country: 'United States',
    affiliation: 'MIT',
    primaryRole: 'author' as const,
    termsOfService: true as const,
    privacyPolicy: true as const,
    publishingEthics: true as const,
}

// ════════════════════════════════════════
// Tests
// ════════════════════════════════════════

describe('Provision Route (POST /ojs/register)', () => {
    let app: ReturnType<typeof createApp>
    let originalEnv: NodeJS.ProcessEnv
    let originalRateLimitFlag: string | undefined

    beforeEach(() => {
        vi.clearAllMocks()
        originalEnv = { ...process.env }
        originalRateLimitFlag = process.env.TEST_DISABLE_RATE_LIMIT
        // Opt-in to bypass rate limiting for tests
        process.env.TEST_DISABLE_RATE_LIMIT = "true"
        process.env.OJS_BASE_URL = 'https://submitmanager.com'
        delete process.env.PUBLIC_OJS_BASE_URL
        app = createApp()
    })

    afterEach(() => {
        process.env = originalEnv
        if (originalRateLimitFlag === undefined) {
            delete process.env.TEST_DISABLE_RATE_LIMIT
        } else {
            process.env.TEST_DISABLE_RATE_LIMIT = originalRateLimitFlag
        }
    })

    // ═══════════════════════════════════════
    // SUCCESSFUL PROVISIONING
    // ═══════════════════════════════════════
    describe('Successful registration', () => {
        it('should return 201 with status "created" and ojsLoginUrl on successful provisioning', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(201)

            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.status).toBe('created')
            expect(body.ojsLoginUrl).toBe('https://submitmanager.com/index.php/testjournal/login')
            expect(body.email).toBe('jane.smith@university.edu')
        })

        it('should point ojsLoginUrl at the selected journal login page', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register?journalPath=myjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            const body = await res.json()

            const loginUrl = new URL(body.ojsLoginUrl)
            expect(loginUrl.pathname).toBe('/index.php/myjournal/login')
        })

        it('should pass the journalPath through to provisioning', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            await app.request('/ojs/register?journalPath=myjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })

            expect(provisionOjsUser).toHaveBeenCalledWith(
                expect.objectContaining({ journalPath: 'myjournal' })
            )
        })
    })

    // ═══════════════════════════════════════
    // MISSING JOURNAL
    // ═══════════════════════════════════════
    describe('Missing journalPath', () => {
        it('should return 400 with a friendly error before provisioning when journalPath is empty', async () => {
            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('Please choose a journal before registering.')
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })
    })

    // ═══════════════════════════════════════
    // VALIDATION ERRORS
    // ═══════════════════════════════════════
    describe('Input validation', () => {
        it('should reject missing required fields', async () => {
            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName: 'Test' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject invalid email format', async () => {
            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...validPayload, email: 'not-an-email' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject password shorter than 6 characters', async () => {
            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...validPayload, password: '12345' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject without terms acceptance', async () => {
            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...validPayload, termsOfService: false }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })
    })

    // ═══════════════════════════════════════
    // PROVISIONING FAILURES
    // ═══════════════════════════════════════
    describe('OJS provisioning failures', () => {
        it('should return 400 for duplicate email', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({
                success: false,
                error: 'Email already exists in OJS',
            })

            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('Email already exists')
        })

        it('should return 500 for generic OJS failure', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({
                success: false,
                error: 'Database connection timeout',
            })

            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(500)

            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toContain('OJS Provisioning Failed')
        })

        it('should return 400 for unique constraint violation', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({
                success: false,
                error: 'Unique constraint violation on email',
            })

            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.error).toBe('Email already exists')
        })
    })
})
