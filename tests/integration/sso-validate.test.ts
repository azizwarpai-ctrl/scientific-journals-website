import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import crypto from 'crypto'

// ════════════════════════════════════════
// Mock SSO secret
// ════════════════════════════════════════
const TEST_SSO_SECRET = 'test-sso-secret-key-for-integration-tests'

vi.mock('@/src/features/ojs/server/sso-utils', () => ({
    getSsoSecret: vi.fn(() => TEST_SSO_SECRET),
}))

import { ssoRouter } from '@/src/features/ojs/server/sso-route'

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════

function createApp() {
    const app = new Hono()
    app.route('/sso', ssoRouter)
    return app
}

function createValidToken(email: string, timestamp?: number): string {
    const ts = timestamp ?? Date.now()
    const payloadStr = JSON.stringify({ email, timestamp: ts })
    const payloadBase64 = Buffer.from(payloadStr).toString('base64')
    const signature = crypto.createHmac('sha256', TEST_SSO_SECRET).update(payloadBase64).digest('hex')
    return `${payloadBase64}.${signature}`
}

// ════════════════════════════════════════
// Tests
// ════════════════════════════════════════

describe('SSO Validate Endpoint', () => {
    let app: ReturnType<typeof createApp>

    beforeEach(() => {
        vi.clearAllMocks()
        app = createApp()
    })

    // ═══════════════════════════════════════
    // VALID TOKEN
    // ═══════════════════════════════════════
    describe('Valid token validation', () => {
        it('should validate a fresh, correctly-signed token', async () => {
            const token = createValidToken('researcher@university.edu')

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(200)

            const body = await res.json()
            expect(body.valid).toBe(true)
            expect(body.email).toBe('researcher@university.edu')
        })

        it('should accept a token created exactly 5 minutes ago', async () => {
            vi.useFakeTimers()
            const now = Date.now()
            vi.setSystemTime(now)
            
            const exactlyFiveMinutesAgo = now - (5 * 60 * 1000)
            const token = createValidToken('boundary@test.com', exactlyFiveMinutesAgo)

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(200)

            const body = await res.json()
            expect(body.valid).toBe(true)
            expect(body.email).toBe('boundary@test.com')
            
            vi.useRealTimers()
        })
    })

    // ═══════════════════════════════════════
    // EXPIRED TOKEN
    // ═══════════════════════════════════════
    describe('Expired token rejection', () => {
        it('should reject a token older than 5 minutes', async () => {
            const sixMinutesAgo = Date.now() - (6 * 60 * 1000)
            const token = createValidToken('expired@test.com', sixMinutesAgo)

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(410)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Token expired')
        })

        it('should reject a token just over 5 minutes old', async () => {
            vi.useFakeTimers()
            const now = Date.now()
            vi.setSystemTime(now)
            
            const justOverFiveMinutesAgo = now - (5 * 60 * 1000) - 1
            const token = createValidToken('boundary_expired@test.com', justOverFiveMinutesAgo)

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(410)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Token expired')
            
            vi.useRealTimers()
        })

        it('should reject a token from 1 hour ago', async () => {
            const oneHourAgo = Date.now() - (60 * 60 * 1000)
            const token = createValidToken('old@test.com', oneHourAgo)

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(410)

            const body = await res.json()
            expect(body.valid).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // INVALID SIGNATURE
    // ═══════════════════════════════════════
    describe('Invalid signature rejection', () => {
        it('should reject a token signed with the wrong secret', async () => {
            const payloadStr = JSON.stringify({ email: 'tampered@test.com', timestamp: Date.now() })
            const payloadBase64 = Buffer.from(payloadStr).toString('base64')
            const wrongSignature = crypto.createHmac('sha256', 'wrong-secret').update(payloadBase64).digest('hex')
            const token = `${payloadBase64}.${wrongSignature}`

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(401)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Invalid signature')
        })

        it('should reject a token with a truncated signature', async () => {
            const token = createValidToken('test@test.com')
            const truncated = token.slice(0, -10)

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(truncated)}`)
            expect(res.status).toBe(401)

            const body = await res.json()
            expect(body.valid).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // MALFORMED TOKEN
    // ═══════════════════════════════════════
    describe('Malformed token handling', () => {
        it('should reject missing token parameter', async () => {
            const res = await app.request('/sso/validate')
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Missing token')
        })

        it('should reject token without a dot separator', async () => {
            const res = await app.request('/sso/validate?token=nodot')
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Invalid token format')
        })

        it('should reject token with multiple dots', async () => {
            const res = await app.request('/sso/validate?token=a.b.c')
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Invalid token format')
        })

        it('should reject token with valid format but non-JSON payload', async () => {
            const badPayload = Buffer.from('not-json').toString('base64')
            const signature = crypto.createHmac('sha256', TEST_SSO_SECRET).update(badPayload).digest('hex')
            const token = `${badPayload}.${signature}`

            const res = await app.request(`/sso/validate?token=${encodeURIComponent(token)}`)
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.valid).toBe(false)
            expect(body.error).toBe('Malformed payload')
        })

        it('should reject empty token string', async () => {
            const res = await app.request('/sso/validate?token=')
            expect(res.status).toBe(400)

            const body = await res.json()
            expect(body.valid).toBe(false)
        })
    })
})
