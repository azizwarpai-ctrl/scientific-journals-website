import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// ════════════════════════════════════════
// Mock external dependencies BEFORE imports
// ════════════════════════════════════════
const TEST_SSO_SECRET = 'test-sso-secret-for-provision'

vi.mock('@/src/features/ojs/server/sso-utils', () => ({
    getSsoSecret: vi.fn(() => TEST_SSO_SECRET),
}))

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

    beforeEach(() => {
        vi.clearAllMocks()
        originalEnv = { ...process.env }
        process.env.SSO_SECRET = TEST_SSO_SECRET
        process.env.OJS_BASE_URL = 'https://submitmanager.com'
        app = createApp()
    })

    afterEach(() => {
        process.env = originalEnv
    })

    // ═══════════════════════════════════════
    // SUCCESSFUL PROVISIONING
    // ═══════════════════════════════════════
    describe('Successful registration', () => {
        it('should return 201 with ssoUrl on successful provisioning', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register?journalPath=testjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(201)

            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.status).toBe('sso_redirect')
            expect(body.ssoUrl).toContain('sso_login.php')
            expect(body.ssoUrl).toContain('token=')
            expect(body.email).toBe('jane.smith@university.edu')
        })

        it('should include explicit redirect to submission when journalPath is provided', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register?journalPath=myjournal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            const body = await res.json()

            // Decode the redirect parameter from the ssoUrl
            const ssoUrl = new URL(body.ssoUrl)
            const redirect = ssoUrl.searchParams.get('redirect')
            expect(redirect).toBe('/index.php/myjournal/submission')
        })

        it('should fall back to /index.php/index/login when journalPath is empty', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            const body = await res.json()

            const ssoUrl = new URL(body.ssoUrl)
            const redirect = ssoUrl.searchParams.get('redirect')
            expect(redirect).toBe('/index.php/index/login')
        })
    })

    // ═══════════════════════════════════════
    // VALIDATION ERRORS
    // ═══════════════════════════════════════
    describe('Input validation', () => {
        it('should reject missing required fields', async () => {
            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName: 'Test' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject invalid email format', async () => {
            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...validPayload, email: 'not-an-email' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject password shorter than 6 characters', async () => {
            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...validPayload, password: '12345' }),
            })
            expect(res.status).toBe(400)
            expect(provisionOjsUser).not.toHaveBeenCalled()
        })

        it('should reject without terms acceptance', async () => {
            const res = await app.request('/ojs/register', {
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

            const res = await app.request('/ojs/register', {
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

            const res = await app.request('/ojs/register', {
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

            const res = await app.request('/ojs/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.error).toBe('Email already exists')
        })
    })

    // ═══════════════════════════════════════
    // SSO TOKEN IN RESPONSE
    // ═══════════════════════════════════════
    describe('SSO token structure', () => {
        it('should generate a properly structured HMAC token in the ssoUrl', async () => {
            vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

            const res = await app.request('/ojs/register?journalPath=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validPayload),
            })
            const body = await res.json()

            const ssoUrl = new URL(body.ssoUrl)
            const token = ssoUrl.searchParams.get('token')
            expect(token).toBeTruthy()

            // Token should be base64.hex format
            const parts = token!.split('.')
            expect(parts).toHaveLength(2)

            // Payload should decode to JSON with email and timestamp
            const payload = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'))
            expect(payload.email).toBe('jane.smith@university.edu')
            expect(payload.timestamp).toBeTypeOf('number')
        })
    })
})
