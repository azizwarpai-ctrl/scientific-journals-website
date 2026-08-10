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

// NOTE: sso-utils is deliberately NOT mocked — the route must no longer
// depend on it (or on SSO_SECRET) at all.

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

function postRegister(app: ReturnType<typeof createApp>, query = '') {
    return app.request(`/ojs/register${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
    })
}

// ════════════════════════════════════════
// Tests
// ════════════════════════════════════════

describe('Provision Route response contract (post-SSO removal)', () => {
    let app: ReturnType<typeof createApp>
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        vi.clearAllMocks()
        originalEnv = { ...process.env }
        // Opt-in to bypass rate limiting for tests
        process.env.TEST_DISABLE_RATE_LIMIT = 'true'
        process.env.OJS_BASE_URL = 'https://submitmanager.com'
        delete process.env.PUBLIC_OJS_BASE_URL
        // The route must work WITHOUT any SSO secret configured
        delete process.env.SSO_SECRET
        app = createApp()
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('returns 201 with { status: "created", ojsLoginUrl, email } on success', async () => {
        vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })

        const res = await postRegister(app, '?journalPath=testjournal')
        expect(res.status).toBe(201)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.status).toBe('created')
        expect(body.ojsLoginUrl).toBe('https://submitmanager.com/index.php/testjournal/login')
        expect(body.email).toBe('jane.smith@university.edu')
        // The dead OJS 3.5 SSO endpoint must never be referenced
        expect(body.ssoUrl).toBeUndefined()
        expect(JSON.stringify(body)).not.toContain('sso_login.php')
    })

    it('prefers PUBLIC_OJS_BASE_URL and strips trailing slashes', async () => {
        vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })
        process.env.PUBLIC_OJS_BASE_URL = 'https://journals.digitopub.com///'

        const res = await postRegister(app, '?journalPath=myjournal')
        const body = await res.json()
        expect(body.ojsLoginUrl).toBe('https://journals.digitopub.com/index.php/myjournal/login')
    })

    it('returns 400 with a friendly error when journalPath is missing, BEFORE provisioning', async () => {
        const res = await postRegister(app)
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toBe('Please choose a journal before registering.')
        expect(provisionOjsUser).not.toHaveBeenCalled()
    })

    it('returns 400 when journalPath is whitespace-only', async () => {
        const res = await postRegister(app, '?journalPath=%20%20')
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.error).toBe('Please choose a journal before registering.')
        expect(provisionOjsUser).not.toHaveBeenCalled()
    })

    it('does NOT throw when SSO_SECRET is unset', async () => {
        vi.mocked(provisionOjsUser).mockResolvedValue({ success: true })
        expect(process.env.SSO_SECRET).toBeUndefined()

        const res = await postRegister(app, '?journalPath=testjournal')
        // Previously getSsoSecret() threw AFTER user creation and this 500'd
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.status).toBe('created')
    })
})
